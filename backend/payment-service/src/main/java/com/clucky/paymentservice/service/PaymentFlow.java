package com.clucky.paymentservice.service;

import com.clucky.paymentservice.config.CurrentActor;
import com.clucky.paymentservice.dto.DomainEvent;
import com.clucky.paymentservice.dto.Role;
import com.clucky.paymentservice.exception.ApiException;
import com.clucky.paymentservice.exception.ErrorCode;
import com.clucky.paymentservice.mapper.EventMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Service
public class PaymentFlow {
    public record Bank(String bankName, String bankCode, String accountNo, String accountName) {}
    public record Summary(String id, long orderId, String orderCode, String status, Instant expiresAt, String reference,
            Bank bankInfo, String amount, String receivedAmount, String missingAmount, String excessAmount,
            boolean confirmationPending, boolean canTransfer, String closedReason) {}
    public record Session(Long orderId, String orderCode, Long customerId, Long storeId,
            BigDecimal amount, String status, String paymentMethod, Instant expiresAt) {}
    public record Context(long orderId, String orderCode, Long customerId, Long storeId, BigDecimal amount,
            String status, String paymentMethod, String paymentStatus, Instant expiresAt, Instant version,
            String orderSource, String orderType) {
        public Context(long orderId, String orderCode, Long customerId, Long storeId, BigDecimal amount,
                String status, String paymentMethod, String paymentStatus, Instant expiresAt, Instant version,
                String orderSource) {
            this(orderId, orderCode, customerId, storeId, amount, status, paymentMethod, paymentStatus,
                    expiresAt, version, orderSource, null);
        }
        public Context(long orderId, String orderCode, Long customerId, Long storeId, BigDecimal amount,
                String status, String paymentMethod, String paymentStatus, Instant expiresAt, Instant version) {
            this(orderId, orderCode, customerId, storeId, amount, status, paymentMethod, paymentStatus, expiresAt, version, null, null);
        }
    }
    private record Payment(long id, long orderId, String orderCode, long customerId, long storeId, BigDecimal amount,
            BigDecimal received, String status, Instant expiresAt, String reference, Bank bank, boolean proposed, String closedReason) {}
    private static final RowMapper<Payment> PAYMENT = (row, index) -> new Payment(row.getLong("id"), row.getLong("order_id"),
            row.getString("order_code"), row.getLong("customer_id"), row.getLong("store_id"), row.getBigDecimal("amount"),
            row.getBigDecimal("received_amount"), row.getString("status"), row.getTimestamp("expires_at").toInstant(),
            row.getString("transfer_content"), new Bank(row.getString("bank_name"), row.getString("bank_code"),
            row.getString("account_no"), row.getString("account_name")), row.getBoolean("receipt_proposed"), row.getString("closed_reason"));
    private final JdbcTemplate jdbc;
    private final DiscoveryClient discovery;
    private final RestClient client;
    private final ObjectMapper mapper;
    private final EventMapper events;
    private final boolean configured;

    public PaymentFlow(JdbcTemplate jdbc, DiscoveryClient discovery, RestClient.Builder builder, ObjectMapper mapper,
            EventMapper events, @Value("${payment.sepay.api-key:}") String key) {
        this.jdbc = jdbc; this.discovery = discovery; this.mapper = mapper; this.events = events; this.configured = !key.isBlank();
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build());
        factory.setReadTimeout(Duration.ofSeconds(5));
        this.client = builder.requestFactory(factory).build();
    }

    @Transactional
    public Summary initialize(long orderId) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.CUSTOMER) throw new AccessDeniedException("Customer required");
        lockOrder(orderId);
        List<Payment> current = jdbc.query("SELECT * FROM payment_service.payments WHERE order_id=? AND live_payment", PAYMENT, orderId);
        if (!current.isEmpty()) { authorize(current.getFirst()); return summarize(current.getFirst()); }
        if (!configured) throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        Session session = orderSession(orderId, false);
        if (session == null || session.orderId() == null || session.orderId() != orderId
                || !actor.userId().equals(session.customerId()) || session.storeId() == null || session.storeId() <= 0
                || session.orderCode() == null || session.orderCode().isBlank() || session.orderCode().length() > 40
                || session.amount() == null || session.amount().signum() <= 0 || session.amount().stripTrailingZeros().scale() > 0
                || session.amount().compareTo(new BigDecimal("999999999999")) > 0
                || !"BANK_TRANSFER".equals(session.paymentMethod()) || !"PENDING_PAYMENT".equals(session.status())) {
            throw new ApiException(ErrorCode.UPSTREAM_ERROR);
        }
        if (session.expiresAt() != null && !session.expiresAt().isAfter(Instant.now()) || !jdbc.queryForList(
                "SELECT order_id FROM payment_service.order_snapshots WHERE order_id=? AND status='CANCELLED'", Long.class, orderId).isEmpty()
                || !jdbc.queryForList("SELECT id FROM payment_service.payments WHERE order_id=?", Long.class, orderId).isEmpty()) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
        jdbc.execute("SELECT pg_advisory_xact_lock(192616)");
        var banks = jdbc.query("SELECT account.* FROM payment_service.store_bank_accounts assignment JOIN payment_service.bank_accounts_config account "
                + "ON account.id=assignment.bank_account_id WHERE assignment.store_id=? AND account.is_active AND account.bank_code IS NOT NULL",
                (row, index) -> new Bank(row.getString("bank_name"), row.getString("bank_code"), row.getString("account_no"), row.getString("account_name")), session.storeId());
        if (banks.isEmpty()) throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        Bank bank = banks.getFirst();
        Session opened = orderSession(orderId, true);
        if (opened == null || !session.orderId().equals(opened.orderId()) || !session.customerId().equals(opened.customerId())
                || !session.storeId().equals(opened.storeId()) || !session.orderCode().equals(opened.orderCode())
                || !session.amount().equals(opened.amount()) || !session.status().equals(opened.status())
                || !session.paymentMethod().equals(opened.paymentMethod()) || opened.expiresAt() == null) {
            throw new ApiException(ErrorCode.UPSTREAM_ERROR);
        }
        if (!opened.expiresAt().isAfter(Instant.now())) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        for (int attempt = 0; attempt < 5; attempt++) {
            List<Payment> inserted = jdbc.query("INSERT INTO payment_service.payments(order_id,order_code,method,amount,status,expires_at,"
                    + "customer_id,store_id,transfer_content,bank_name,bank_code,account_no,account_name,live_payment) "
                    + "VALUES (?,?,'BANK_TRANSFER',?,'PENDING',?,?,?,?,?,?,?,?,true) "
                    + "ON CONFLICT (transfer_content) WHERE transfer_content IS NOT NULL DO NOTHING RETURNING *", PAYMENT,
                    orderId, session.orderCode(), session.amount(), Timestamp.from(opened.expiresAt()), actor.userId(), session.storeId(),
                    TransferReference.create(session.storeId()), bank.bankName(), bank.bankCode(), bank.accountNo(), bank.accountName());
            if (!inserted.isEmpty()) return summarize(inserted.getFirst());
        }
        throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
    }

    @Transactional(readOnly = true)
    public Summary get(long orderId) {
        var live = jdbc.query("SELECT * FROM payment_service.payments WHERE order_id=? AND live_payment", PAYMENT, orderId);
        if (live.isEmpty()) {
            Context order = context(orderId);
            var rows = jdbc.queryForList("SELECT * FROM payment_service.payments WHERE order_id=? ORDER BY id DESC", orderId);
            if (rows.isEmpty()) throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND);
            if (rows.size() != 1) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            var legacy = rows.getFirst();
            if (!order.orderCode().equals(legacy.get("order_code")) || order.amount().compareTo((BigDecimal) legacy.get("amount")) != 0) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            Timestamp expires = (Timestamp) legacy.get("expires_at");
            BigDecimal received = (BigDecimal) legacy.get("received_amount");
            return new Summary(legacy.get("id").toString(), orderId, order.orderCode(), legacy.get("status").toString(),
                    expires == null ? null : expires.toInstant(), null, null, order.amount().toPlainString(), received.toPlainString(),
                    order.amount().subtract(received).max(BigDecimal.ZERO).toPlainString(), received.subtract(order.amount()).max(BigDecimal.ZERO).toPlainString(), false, false,
                    "COLLECTED".equals(legacy.get("status")) ? null : "LEGACY_REVIEW");
        }
        Payment payment = live.getFirst();
        authorize(payment);
        return summarize(payment);
    }

    private void authorize(Payment payment) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() == Role.ADMIN || actor.role() == Role.CUSTOMER && actor.userId() == payment.customerId()
                || (actor.role() == Role.STAFF || actor.role() == Role.STORE_MANAGER) && actor.storeId() != null && actor.storeId() == payment.storeId()) return;
        throw new AccessDeniedException("Access denied");
    }

    private Session orderSession(long orderId, boolean open) {
        var instances = discovery.getInstances("cart-order-service");
        if (instances.isEmpty()) throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        var token = (JwtAuthenticationToken) SecurityContextHolder.getContext().getAuthentication();
        try {
            return client.method(open ? org.springframework.http.HttpMethod.POST : org.springframework.http.HttpMethod.GET)
                    .uri(instances.getFirst().getUri().resolve("/api/orders/" + orderId + "/payment-session"))
                    .headers(headers -> headers.setBearerAuth(token.getToken().getTokenValue())).retrieve().body(Session.class);
        } catch (RestClientResponseException failure) {
            throw new ApiException(failure.getStatusCode().is4xxClientError() ? ErrorCode.fromStatus(failure.getStatusCode().value()) : ErrorCode.DEPENDENCY_UNAVAILABLE);
        } catch (RestClientException failure) { throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE); }
    }

    public Context context(long orderId) {
        var instances = discovery.getInstances("cart-order-service");
        if (instances.isEmpty()) throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE);
        var token = (JwtAuthenticationToken) SecurityContextHolder.getContext().getAuthentication();
        try {
            var request = client.get()
                    .uri(instances.getFirst().getUri().resolve("/api/orders/" + orderId + "/payment-context"))
                    .headers(headers -> headers.setBearerAuth(token.getToken().getTokenValue()));
            Context result = request.retrieve().body(Context.class);
            if (result == null || result.orderId() != orderId || result.storeId() == null
                    || result.customerId() == null && !"COUNTER".equals(result.orderSource())
                    || result.version() == null || result.amount() == null) throw new ApiException(ErrorCode.UPSTREAM_ERROR);
            return result;
        } catch (RestClientResponseException failure) {
            throw new ApiException(failure.getStatusCode().is4xxClientError() ? ErrorCode.fromStatus(failure.getStatusCode().value()) : ErrorCode.DEPENDENCY_UNAVAILABLE);
        } catch (RestClientException failure) { throw new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE); }
    }

    @Transactional
    public void reconcile(long paymentId) {
        Long orderId = jdbc.queryForObject("SELECT order_id FROM payment_service.payments WHERE id=?", Long.class, paymentId);
        lockOrder(orderId);
        Payment payment = jdbc.query("SELECT * FROM payment_service.payments WHERE id=? AND live_payment FOR UPDATE", PAYMENT, paymentId)
                .stream().findFirst().orElse(null);
        if (payment == null) return;
        boolean closed = payment.closedReason() != null || !Set.of("PAID","COLLECTED").contains(payment.status()) && !payment.expiresAt().isAfter(Instant.now());
        int allocated = jdbc.update("UPDATE payment_service.bank_transactions SET payment_id=?,store_id=?,matched_order_code=?,status=?,reason=? "
                + "WHERE candidate_payment_id=? AND payment_id IS NULL AND collection_id IS NULL AND transfer_direction='in' AND status='PENDING_RECONCILIATION' AND webhook_fingerprint IS NOT NULL AND conflict_count=0",
                payment.id(), payment.storeId(), payment.orderCode(), closed ? "LATE_RECEIPT" : "MATCHED", closed ? "ORDER_CLOSED" : "ALLOCATED",
                payment.id());
        BigDecimal received = jdbc.queryForObject("SELECT coalesce(sum(amount),0) FROM payment_service.bank_transactions WHERE payment_id=? AND transfer_direction='in' AND (conflict_count=0 OR conflict_reviewed)", BigDecimal.class, paymentId);
        if (allocated != 0 || received.compareTo(payment.received()) != 0) jdbc.update("UPDATE payment_service.payments SET received_amount=? WHERE id=?", received, paymentId);
        linkCollection(payment.orderId());
        boolean collectionPending = !jdbc.queryForList("SELECT id FROM payment_service.collections WHERE order_id=? AND status IN ('PENDING','ACCEPTED')",
                UUID.class, payment.orderId()).isEmpty();
        if (!closed && !collectionPending && !payment.proposed() && received.compareTo(payment.amount()) >= 0 && "PENDING".equals(payment.status())) {
            jdbc.update("UPDATE payment_service.payments SET receipt_proposed=true WHERE id=?", paymentId);
            var payload = mapper.createObjectNode().put("paymentId", paymentId).put("orderId", payment.orderId())
                    .put("orderCode", payment.orderCode()).put("customerId", payment.customerId()).put("storeId", payment.storeId())
                    .put("amount", payment.amount()).put("receivedAmount", received).put("expiresAt", payment.expiresAt().toString());
            enqueue("payment.received", payment.orderId(), payload);
        }
    }

    @Transactional
    public void orderEvent(DomainEvent event) {
        if (!"cart-order-service".equals(event.sourceService())) throw new IllegalArgumentException("Unexpected order event source");
        var payload = event.payload();
        long orderId = payload.path("orderId").asLong();
        if (orderId <= 0) throw new IllegalArgumentException("Invalid order event");
        lockOrder(orderId);
        if (jdbc.update("INSERT INTO payment_service.processed_events(event_id) VALUES (?) ON CONFLICT DO NOTHING", event.eventId()) == 0) return;
        List<Payment> matches = jdbc.query("SELECT * FROM payment_service.payments WHERE order_id=? AND live_payment FOR UPDATE", PAYMENT, orderId);
        if ("order.cancelled".equals(event.eventType())) {
            jdbc.update("INSERT INTO payment_service.order_snapshots(order_id,status,updated_at) VALUES (?,'CANCELLED',?) "
                    + "ON CONFLICT(order_id) DO UPDATE SET status='CANCELLED',updated_at=EXCLUDED.updated_at", orderId, Timestamp.from(event.occurredAt()));
            if (!matches.isEmpty()) {
                String reason = payload.path("paymentExpired").asBoolean(false) ? "EXPIRED" : "CANCELLED";
                jdbc.update("UPDATE payment_service.payments SET closed_reason=?,status=CASE WHEN status IN ('PAID','COLLECTED','REFUNDED') THEN status ELSE ? END WHERE id=?",
                        reason, reason, matches.getFirst().id());
                if ("PENDING".equals(matches.getFirst().status()) && !Set.of("PAID","COLLECTED","REFUNDED").contains(payload.path("paymentStatus").asText())) failed(matches.getFirst(), reason);
            }
            return;
        }
        if (!"order.payment-resolved".equals(event.eventType()) || matches.size() != 1) throw new IllegalArgumentException("Payment decision target missing");
        Payment payment = matches.getFirst();
        String decision = payload.path("decision").asText();
        if (!Set.of("ACCEPTED", "EXPIRED", "CANCELLED", "SUPERSEDED").contains(decision) || payload.path("paymentId").asLong() != payment.id()
                || payload.path("customerId").asLong() != payment.customerId() || payload.path("storeId").asLong() != payment.storeId()
                || !payment.orderCode().equals(payload.path("orderCode").asText()) || !payment.proposed()) {
            throw new IllegalArgumentException("Payment decision mismatch");
        }
        if ("ACCEPTED".equals(decision)) {
            if (jdbc.update("UPDATE payment_service.payments SET status='PAID',paid_at=now() WHERE id=? AND paid_at IS NULL AND status<>'REFUNDED'", payment.id()) > 0) {
                var notification = mapper.createObjectNode().put("paymentId", payment.id()).put("orderId", orderId)
                        .put("orderCode", payment.orderCode()).put("customerId", payment.customerId()).put("storeId", payment.storeId())
                        .put("amount", payment.amount()).put("totalAmount", payment.amount()).put("status", "PAID");
                notification.put("paymentMethod", "BANK_TRANSFER").put("outcome", "CONFIRMED");
                enqueue("payment.confirmed", orderId, notification);
            }
        } else {
            if ("SUPERSEDED".equals(decision)) jdbc.update("UPDATE payment_service.payments SET status='COLLECTED' WHERE id=? AND paid_at IS NULL AND status<>'REFUNDED'",payment.id());
            else if (!"COLLECTED".equals(payment.status()) && jdbc.update("UPDATE payment_service.payments SET status=?,closed_reason=? WHERE id=? AND paid_at IS NULL AND status<>'REFUNDED'",decision,decision,payment.id())>0) failed(payment,decision);
        }
    }

    private void failed(Payment payment, String reason) {
        if (jdbc.update("UPDATE payment_service.payments SET failed_event_sent=true WHERE id=? AND NOT failed_event_sent AND paid_at IS NULL", payment.id()) == 0) return;
        enqueue("payment.failed", payment.orderId(), mapper.createObjectNode().put("paymentId", payment.id()).put("orderId", payment.orderId())
                .put("orderCode", payment.orderCode()).put("customerId", payment.customerId()).put("storeId", payment.storeId())
                .put("amount", payment.amount()).put("reason", reason).put("outcome", "FAILED").put("orderDecisionFinal", true));
    }

    void linkCollection(long orderId) {
        var collections=jdbc.queryForList("SELECT * FROM payment_service.collections WHERE order_id=? AND status='ACCEPTED' AND transfer_amount>0 FOR UPDATE",orderId);
        if(collections.size()!=1)return;
        var collection=collections.getFirst();
        if(jdbc.queryForObject("SELECT count(*) FROM payment_service.bank_transactions WHERE collection_id=?",Long.class,collection.get("id"))!=0L)return;
        var receipts=jdbc.queryForList("SELECT receipt.* FROM payment_service.bank_transactions receipt JOIN payment_service.payments payment ON payment.id=receipt.payment_id "
                + "WHERE payment.order_id=? AND receipt.collection_id IS NULL AND receipt.conflict_count=0 AND receipt.transfer_direction='in' "
                + "AND receipt.candidate_payment_id=receipt.payment_id AND receipt.reason='ALLOCATED' FOR UPDATE OF receipt",orderId);
        if(receipts.size()!=1)return;
        var receipt=receipts.getFirst();
        String gateway=TransferReference.normalize((String)receipt.get("bank_gateway"));
        if (gateway.isEmpty() || !(gateway.equals(TransferReference.normalize((String)collection.get("bank_name")))
                || gateway.equals(TransferReference.normalize((String)collection.get("bank_code"))))) return;
        if(!java.util.Objects.equals(collection.get("account_no"),receipt.get("bank_account")) || collection.get("account_no")==null
                || ((BigDecimal)collection.get("transfer_amount")).compareTo((BigDecimal)receipt.get("amount"))!=0)return;
        jdbc.update("UPDATE payment_service.bank_transactions SET collection_id=?,reason='COLLECTION_EVIDENCE' WHERE id=?",collection.get("id"),receipt.get("id"));
        jdbc.update("UPDATE payment_service.counter_payment_receipts SET bank_tx_id=?,bank_amount_reconciled=?,status='RECONCILED',"
                + "discrepancy_amount=0,version=version+1,updated_at=now() WHERE collection_id=? AND status='PENDING_RECONCILIATION' AND bank_tx_id IS NULL",
                receipt.get("bank_tx_id"), receipt.get("amount"), collection.get("id"));
        jdbc.update("UPDATE payment_service.collections SET version=version+1 WHERE id=?",collection.get("id"));
    }

    private void lockOrder(long orderId) { jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?,0))", Object.class, "payment-order:" + orderId); }

    public void enqueue(String topic, long orderId, com.fasterxml.jackson.databind.node.ObjectNode payload) {
        String eventId = UUID.randomUUID().toString();
        String correlation = MDC.get("correlationId");
        if (correlation == null || !correlation.matches("[A-Za-z0-9._-]{1,128}")) correlation = eventId;
        String json = events.toJson(new DomainEvent(eventId, correlation, topic, "payment-service", Instant.now(), payload));
        jdbc.update("INSERT INTO payment_service.payment_outbox(event_id,order_id,topic,payload,live_dispatch) VALUES (?,?,?,?::jsonb,true)", eventId, orderId, topic, json);
    }

    private Summary summarize(Payment payment) {
        boolean collection = !jdbc.queryForList("SELECT id FROM payment_service.collections WHERE order_id=? AND status IN ('PENDING','ACCEPTED')", UUID.class, payment.orderId()).isEmpty();
        BigDecimal missing = payment.amount().subtract(payment.received()).max(BigDecimal.ZERO);
        BigDecimal excess = payment.received().subtract(payment.amount()).max(BigDecimal.ZERO);
        String status = "PENDING".equals(payment.status()) && !payment.expiresAt().isAfter(Instant.now()) ? "EXPIRED" : payment.status();
        return new Summary(Long.toString(payment.id()), payment.orderId(), payment.orderCode(), status, payment.expiresAt(), payment.reference(),
                payment.bank(), payment.amount().toPlainString(), payment.received().toPlainString(), missing.toPlainString(), excess.toPlainString(),
                payment.proposed() && "PENDING".equals(status) && payment.closedReason() == null,
                configured && !collection && "PENDING".equals(status) && payment.closedReason() == null && missing.signum() > 0, payment.closedReason());
    }
}
