package com.clucky.shippingservice.service;

import com.clucky.shippingservice.config.AccessGuard;
import com.clucky.shippingservice.config.CurrentActor;
import com.clucky.shippingservice.dto.DomainEvent;
import com.clucky.shippingservice.dto.Role;
import com.clucky.shippingservice.exception.ApiException;
import com.clucky.shippingservice.exception.ErrorCode;
import com.clucky.shippingservice.mapper.EventMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/** Durable demo delivery; never updates the real Payment service. */
@Service
public class MockDeliveryEngine {
    public record Proof(String kind, Instant capturedAt, String imageDataUrl) {}
    public record TrackingResponse(long orderId, long shipmentId, long storeId, String status,
            String phase, String simulationMode, long version, Instant serverNow, int attemptNumber,
            Instant assignedAt, Instant deliveryStartedAt, Instant deliveryDueAt, Instant completedAt,
            Instant failedAt, Instant returnedAt, String failureCode, String failureNote,
            String resolution, JsonNode routeGeometry, Proof proof, String customerName,
            String phone, String address, BigDecimal codAmount,
            String paymentMethod, boolean simulatedCollectionConfirmed, String routeError,
            String originalPaymentStatus, String merchantPaymentStatus,
            String customerCollectionStatus,
            BigDecimal customerCollectionExpectedAmount) {}
    public record FailRequest(String reasonCode, String note, Integer attemptNumber, Long version,
            String idempotencyKey) {}
    public record NoteRequest(String note, Integer attemptNumber, Long version,
            String idempotencyKey) {}

    private static final Logger LOG = LoggerFactory.getLogger(MockDeliveryEngine.class);
    private static final Set<String> FAILURE_CODES = Set.of("CUSTOMER_UNREACHABLE",
            "CUSTOMER_ABSENT", "WRONG_ADDRESS", "ACCESS_BLOCKED", "CUSTOMER_REFUSED",
            "ITEM_DAMAGED", "DAMAGED_ITEMS", "RIDER_INCIDENT", "OTHER");
    private static final String SHIPMENT = "shipping_service.shipments";
    private static final String ATTEMPTS = "shipping_service.mock_delivery_attempts";
    private static final String READY = "shipping_service.mock_ready_orders";
    private static final String LEDGER = "shipping_service.mock_wallet_ledger";
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final EventMapper events;
    private final MockRouteProvider routes;
    private final AccessGuard access;
    private final KafkaTemplate<String, String> kafka;
    private final TransactionTemplate transactions;
    private final boolean enabled;
    private final BigDecimal initialWallet;
    private final int maxAttempts;

    public MockDeliveryEngine(JdbcTemplate jdbc, ObjectMapper json, EventMapper events,
            MockRouteProvider routes, AccessGuard access, KafkaTemplate<String, String> kafka,
            PlatformTransactionManager transactionManager,
            @Value("${clucky.shipping.mock.enabled:false}") boolean enabled,
            @Value("${clucky.shipping.mock.wallet-initial:100000000000}") BigDecimal initialWallet,
            @Value("${clucky.shipping.mock.max-attempts:2}") int maxAttempts) {
        this.jdbc = jdbc;
        this.json = json;
        this.events = events;
        this.routes = routes;
        this.access = access;
        this.kafka = kafka;
        this.transactions = new TransactionTemplate(transactionManager);
        this.enabled = enabled;
        this.initialWallet = initialWallet;
        this.maxAttempts = maxAttempts;
        if (initialWallet.signum() < 0 || maxAttempts < 1 || maxAttempts > 3) {
            throw new IllegalArgumentException("Invalid mock shipping configuration");
        }
    }

    @Transactional
    public void acceptOrderStatus(DomainEvent event) {
        if (!enabled) return;
        if (!"cart-order-service".equals(event.sourceService())
                || !"order.status-changed".equals(event.eventType())) {
            throw new IllegalArgumentException("Invalid order status source");
        }
        JsonNode payload = event.payload();
        if (!"DELIVERY".equals(payload.path("type").asText())) return;
        String status = payload.path("status").asText();
        if (!"READY".equals(status)) {
            if (Set.of("CANCELLED", "DELIVERY_FAILED", "COMPLETED").contains(status)) {
                jdbc.update("DELETE FROM " + READY + " r WHERE r.order_id=? AND NOT EXISTS "
                        + "(SELECT 1 FROM " + ATTEMPTS + " a WHERE a.order_id=r.order_id)",
                        requiredId(payload, "orderId"));
            }
            return;
        }
        long orderId = requiredId(payload, "orderId");
        long storeId = requiredId(payload, "storeId");
        String method = payload.path("paymentMethod").asText();
        String paymentStatus = payload.path("paymentStatus").asText();
        if (!("COD".equals(method) && "PENDING".equals(paymentStatus))
                && !("BANK_TRANSFER".equals(method) && "PAID".equals(paymentStatus))) {
            throw new IllegalArgumentException("READY delivery has invalid payment snapshot");
        }
        BigDecimal total = requiredMoney(payload, "totalAmount");
        BigDecimal shippingFee = requiredMoney(payload, "shippingFee");
        jdbc.update("INSERT INTO " + READY + " (order_id,store_id,payment_method,payment_status,"
                + "event_id,merchant_goods_amount,total_amount) "
                + "VALUES (?,?,?,?,?,?,?) ON CONFLICT(order_id) DO NOTHING",
                orderId, storeId, method, paymentStatus, event.eventId(),
                total.subtract(shippingFee).max(BigDecimal.ZERO), total);
    }

    private static BigDecimal requiredMoney(JsonNode payload, String field) {
        JsonNode value = payload.path(field);
        if (!value.isNumber() || value.decimalValue().signum() < 0
                || value.decimalValue().stripTrailingZeros().scale() > 0
                || value.decimalValue().compareTo(new BigDecimal("999999999999")) > 0) {
            throw new IllegalArgumentException("Invalid shipping amount");
        }
        return value.decimalValue().setScale(0, RoundingMode.UNNECESSARY);
    }

    private static long requiredId(JsonNode payload, String field) {
        JsonNode value = payload.path(field);
        if (!value.canConvertToLong() || value.longValue() <= 0) {
            throw new IllegalArgumentException("Invalid shipping " + field);
        }
        return value.longValue();
    }

    @Transactional(readOnly = true)
    public TrackingResponse tracking(long orderId) {
        ensureEnabled();
        Map<String, Object> shipment = shipment(orderId, false);
        authorize(shipment, false);
        Map<String, Object> attempt = latest(orderId, false);
        Map<String, Object> ready = nullableRow("SELECT payment_method,payment_status,"
                + "merchant_goods_amount,total_amount,last_error_code FROM " + READY
                + " WHERE order_id=?", orderId);
        String phase = attempt == null
                ? ready != null ? "ROUTE_PENDING" : "NOT_STARTED" : str(attempt, "phase");
        if ("WALLET_BLOCKED".equals(phase)) phase = "WAITING_RIDER";
        String resolution = "CLOSED".equals(phase) ? "CLOSED_UNDELIVERABLE"
                : "RETURNED".equals(phase) ? "RETURNED" : null;
        int number = attempt == null ? 0 : ((Number) attempt.get("attempt_number")).intValue();
        String paymentStatus = ready == null ? null : str(ready, "payment_status");
        boolean advanceConfirmed = number > 0 && "COD".equals(str(ready, "payment_method"))
                && "PENDING".equals(paymentStatus) && hasLedger(orderId, number, "DEBIT_ADVANCE");
        boolean advanceReturned = number > 0 && hasLedger(orderId, number, "CREDIT_RETURN");
        String merchantPaymentStatus = settlementStatus(paymentStatus, advanceConfirmed, advanceReturned);
        BigDecimal customerDue = isRealPrepaid(paymentStatus) ? BigDecimal.ZERO
                : ready != null && ready.get("total_amount") instanceof BigDecimal total ? total
                : ready != null && "COD".equals(str(ready, "payment_method"))
                    ? (BigDecimal) shipment.get("cod_amount") : null;
        JsonNode geometry = attempt == null ? null : parseJson(attempt.get("route"));
        Instant proofAt = attempt == null ? null : time(attempt, "proof_at");
        Proof proof = proofAt == null ? null : proof(orderId, number, proofAt);
        boolean isCustomer = CurrentActor.require().role() == Role.CUSTOMER;
        return new TrackingResponse(orderId, ((Number) shipment.get("id")).longValue(),
                ((Number) shipment.get("store_id")).longValue(), str(shipment, "status"),
                phase, str(shipment, "simulation_mode"),
                ((Number) shipment.get("mock_version")).longValue(), now(), number,
                time(attempt, "assigned_at"), time(attempt, "started_at"),
                time(attempt, "due_at"), time(attempt, "completed_at"),
                time(attempt, "failed_at"), time(attempt, "returned_at"),
                str(attempt, "failure_code"), isCustomer ? null : str(attempt, "failure_note"), resolution,
                geometry, proof, str(shipment, "customer_name"), str(shipment, "phone"),
                str(shipment, "address"), (BigDecimal) shipment.get("cod_amount"),
                ready == null ? null : str(ready, "payment_method"),
                false, safeTrackingError(ready == null ? null : str(ready, "last_error_code")),
                paymentStatus, merchantPaymentStatus,
                isRealPrepaid(paymentStatus) ? "NOT_APPLICABLE_PREPAID" : "OUT_OF_BAND_UNVERIFIED",
                customerDue);
    }

    @Transactional
    public TrackingResponse fail(long orderId, FailRequest request) {
        ensureEnabled();
        if (request == null || !FAILURE_CODES.contains(request.reasonCode())
                || (request.note() != null && request.note().length() > 1000)
                || ("OTHER".equals(request.reasonCode())
                    && (request.note() == null || request.note().isBlank()))) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        validateKey(request.idempotencyKey());
        Map<String, Object> shipment = shipment(orderId, true);
        authorize(shipment, true);
        Map<String, Object> attempt = latest(orderId, true);
        if (attempt != null) rejectReusedAttemptKey(orderId,
                ((Number) attempt.get("attempt_number")).intValue(), "failure_key", request.idempotencyKey());
        if (attempt != null && request.idempotencyKey() != null
                && request.idempotencyKey().equals(str(attempt, "failure_key"))) {
            if (request.reasonCode().equals(str(attempt, "failure_code"))
                    && java.util.Objects.equals(request.note(), str(attempt, "failure_note"))) {
                return tracking(orderId);
            }
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
        validateAttempt(attempt, request.attemptNumber(), request.version(), shipment);
        if (!"SHIPPING".equals(str(attempt, "phase")) || !now().isBefore(time(attempt, "due_at"))) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
        jdbc.update("UPDATE " + ATTEMPTS + " SET phase='FAILED',failed_at=clock_timestamp(),"
                + "failure_code=?,failure_note=?,failed_by=?,failure_key=? WHERE order_id=? AND attempt_number=?",
                request.reasonCode(), request.note(), CurrentActor.require().userId(), request.idempotencyKey(),
                orderId, attempt.get("attempt_number"));
        changeShipment(shipment, "FAILED", "SIMULATED_DELIVERY_FAILED");
        emit("shipping.failed", shipment, attempt, "FAILED", false, null);
        return tracking(orderId);
    }

    @Transactional
    public TrackingResponse returned(long orderId, NoteRequest request) {
        ensureEnabled();
        validateKey(request == null ? null : request.idempotencyKey());
        if (request != null && request.note() != null && request.note().length() > 1000) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        Map<String, Object> shipment = shipment(orderId, true);
        authorize(shipment, true);
        Map<String, Object> attempt = latest(orderId, true);
        if (attempt != null && request != null) rejectReusedAttemptKey(orderId,
                ((Number) attempt.get("attempt_number")).intValue(), "return_key", request.idempotencyKey());
        if (attempt != null && "RETURNED".equals(str(attempt, "phase"))) {
            if (request != null && request.idempotencyKey() != null
                    && !request.idempotencyKey().equals(str(attempt, "return_key"))) {
                throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            }
            return tracking(orderId);
        }
        validateAttempt(attempt, request == null ? null : request.attemptNumber(),
                request == null ? null : request.version(), shipment);
        if (!"FAILED".equals(str(attempt, "phase"))) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        int number = ((Number) attempt.get("attempt_number")).intValue();
        BigDecimal debited = money("DEBIT_ADVANCE", orderId, number);
        if (hasLedger(orderId, number, "DEBIT_ADVANCE")) {
            lockWallet();
            jdbc.update("INSERT INTO " + LEDGER + " (order_id,attempt_number,operation,amount) "
                    + "VALUES (?,?,'CREDIT_RETURN',?) ON CONFLICT DO NOTHING",
                    orderId, number, debited);
        }
        jdbc.update("UPDATE " + ATTEMPTS + " SET phase='RETURNED',returned_at=clock_timestamp(),"
                + "returned_by=?,return_note=?,return_key=? WHERE order_id=? AND attempt_number=?",
                CurrentActor.require().userId(), request == null ? null : request.note(),
                request == null ? null : request.idempotencyKey(), orderId, number);
        changeShipment(shipment, "FAILED", "SIMULATED_RETURNED_TO_STORE");
        return tracking(orderId);
    }

    public TrackingResponse retry(long orderId, NoteRequest request) {
        ensureEnabled();
        validateKey(request == null ? null : request.idempotencyKey());
        if (request != null && request.note() != null && request.note().length() > 1000) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        Map<String, Object> shipment = shipment(orderId, false);
        authorizeManager(shipment);
        if (request != null && request.idempotencyKey() != null
                && hasRetryReceipt(orderId, request.idempotencyKey())) return tracking(orderId);
        Map<String, Object> previous = latest(orderId, false);
        if (previous == null || !"RETURNED".equals(str(previous, "phase"))
                || ((Number) previous.get("attempt_number")).intValue() >= maxAttempts) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
        MockRouteProvider.Route route = fetchRoute(shipment);
        transactions.executeWithoutResult(status -> {
            Map<String, Object> locked = shipment(orderId, true);
            authorizeManager(locked);
            if (request != null && request.idempotencyKey() != null
                    && hasRetryReceipt(orderId, request.idempotencyKey())) return;
            Map<String, Object> current = latest(orderId, true);
            validateAttempt(current, request == null ? null : request.attemptNumber(),
                    request == null ? null : request.version(), locked);
            if (!"RETURNED".equals(str(current, "phase"))) {
                throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            }
            int next = ((Number) current.get("attempt_number")).intValue() + 1;
            if (next > maxAttempts) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            jdbc.update("UPDATE " + ATTEMPTS + " SET retry_note=?,retry_key=? "
                    + "WHERE order_id=? AND attempt_number=?",
                    request == null ? null : request.note(),
                    request == null ? null : request.idempotencyKey(), orderId,
                    current.get("attempt_number"));
            createAttempt(orderId, next, route);
            changeShipment(locked, "ASSIGNED", "SIMULATED_RETRY_ASSIGNED");
        });
        return tracking(orderId);
    }

    @Transactional
    public TrackingResponse close(long orderId, NoteRequest request) {
        ensureEnabled();
        if (request == null || request.note() == null || request.note().isBlank()
                || request.note().length() > 1000) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        validateKey(request.idempotencyKey());
        Map<String, Object> shipment = shipment(orderId, true);
        authorizeManager(shipment);
        Map<String, Object> attempt = latest(orderId, true);
        if (attempt != null && "CLOSED".equals(str(attempt, "phase"))
                && request.idempotencyKey() != null
                && request.idempotencyKey().equals(str(attempt, "resolution_key"))) {
            if (request.note().equals(str(attempt, "resolution_note"))) return tracking(orderId);
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
        validateAttempt(attempt, request.attemptNumber(), request.version(), shipment);
        if ("CLOSED".equals(str(attempt, "phase"))) return tracking(orderId);
        if (!"RETURNED".equals(str(attempt, "phase"))) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        jdbc.update("UPDATE " + ATTEMPTS + " SET phase='CLOSED',resolved_at=clock_timestamp(),"
                + "resolved_by=?,resolution_note=?,resolution_key=? WHERE order_id=? AND attempt_number=?",
                CurrentActor.require().userId(), request.note(), request.idempotencyKey(), orderId,
                attempt.get("attempt_number"));
        changeShipment(shipment, "FAILED", "SIMULATED_CLOSED_UNDELIVERABLE");
        emit("shipping.resolved", shipment, attempt, "CLOSED", false, "CLOSED_UNDELIVERABLE");
        return tracking(orderId);
    }

    @Scheduled(fixedDelayString = "${clucky.shipping.mock.tick-ms:500}")
    public void reconcileReady() {
        if (!enabled) return;
        List<Map<String,Object>> pending = jdbc.queryForList(
                "SELECT r.order_id,r.store_id,s.latitude,s.longitude,s.status FROM " + READY
                + " r JOIN " + SHIPMENT + " s ON s.order_id=r.order_id "
                + "WHERE s.simulation_mode='NONE' AND s.status='CREATED' AND "
                + "((r.payment_method='COD' AND r.payment_status='PENDING') OR "
                + "(r.payment_method='BANK_TRANSFER' AND r.payment_status='PAID')) AND "
                + "(r.last_attempt_at IS NULL OR r.last_attempt_at < clock_timestamp() - interval '15 seconds') "
                + "AND NOT EXISTS (SELECT 1 FROM " + ATTEMPTS + " a WHERE a.order_id=r.order_id) "
                + "ORDER BY r.created_at LIMIT 12");
        for (Map<String, Object> candidate : pending) {
            long orderId = ((Number) candidate.get("order_id")).longValue();
            Integer claimed = transactions.execute(tx -> jdbc.update(
                    "UPDATE " + READY + " SET last_attempt_at=clock_timestamp(),last_error_code=NULL "
                    + "WHERE order_id=? AND (last_attempt_at IS NULL OR "
                    + "last_attempt_at < clock_timestamp() - interval '15 seconds')", orderId));
            if (claimed == null || claimed == 0) continue;
            try {
                MockRouteProvider.Route route = fetchRoute(candidate);
                transactions.executeWithoutResult(tx -> {
                    Map<String,Object> locked = shipment(orderId, true);
                    Map<String,Object> ready = nullableRow("SELECT store_id FROM " + READY
                            + " WHERE order_id=?", orderId);
                    if (ready == null || !ready.get("store_id").equals(locked.get("store_id"))
                            || !"CREATED".equals(str(locked, "status"))
                            || latest(orderId, false) != null) return;
                    createAttempt(orderId, 1, route);
                    changeShipment(locked, "ASSIGNED", "SIMULATED_RIDER_ASSIGNED");
                });
            } catch (ApiException failure) {
                String code = failure.getCode().name();
                jdbc.update("UPDATE " + READY + " SET last_error_code=? WHERE order_id=?", code, orderId);
                LOG.warn("event=mock_route_pending orderId={} code={}", orderId, code);
            }
        }
    }

    @Scheduled(fixedDelayString = "${clucky.shipping.mock.tick-ms:500}")
    public void reconcileDeadlines() {
        if (!enabled) return;
        List<Map<String,Object>> due = jdbc.queryForList("SELECT order_id,attempt_number FROM "
                + ATTEMPTS + " WHERE (phase IN ('WAITING_RIDER','WALLET_BLOCKED') AND assigned_at <= "
                + "clock_timestamp()-interval '5 seconds') OR (phase='SHIPPING' AND "
                + "due_at <= clock_timestamp()) ORDER BY assigned_at LIMIT 64");
        for (Map<String,Object> candidate : due) {
            long orderId = ((Number) candidate.get("order_id")).longValue();
            int number = ((Number) candidate.get("attempt_number")).intValue();
            transactions.executeWithoutResult(tx -> advance(orderId, number));
        }
    }

    private void advance(long orderId, int number) {
        Map<String,Object> shipment = shipment(orderId, true);
        Map<String,Object> attempt = latest(orderId, true);
        if (attempt == null || ((Number) attempt.get("attempt_number")).intValue() != number) return;
        Instant now = now();
        if (Set.of("WAITING_RIDER", "WALLET_BLOCKED").contains(str(attempt, "phase"))
                && !now.isBefore(time(attempt, "assigned_at").plusSeconds(5))) {
            Map<String,Object> ready = nullableRow("SELECT payment_method,payment_status,"
                    + "merchant_goods_amount FROM " + READY
                    + " WHERE order_id=?", orderId);
            if (ready == null) return;
            String method = str(ready, "payment_method");
            String paymentStatus = str(ready, "payment_status");
            boolean codPending = "COD".equals(method) && "PENDING".equals(paymentStatus);
            boolean prepaidQr = "BANK_TRANSFER".equals(method) && "PAID".equals(paymentStatus);
            if (!codPending && !prepaidQr) {
                jdbc.update("UPDATE " + ATTEMPTS + " SET phase='PAYMENT_BLOCKED' "
                        + "WHERE order_id=? AND attempt_number=?", orderId, number);
                jdbc.update("UPDATE " + READY + " SET last_error_code='PAYMENT_STATUS_INVALID' "
                        + "WHERE order_id=?", orderId);
                return;
            }
            // Correct historical mock ledger entries from the old deferred-QR simulation.
            // A real processor-paid QR order must never retain an outstanding rider debit.
            if (prepaidQr && hasLedger(orderId, number, "DEBIT_ADVANCE")
                    && !hasLedger(orderId, number, "CREDIT_RETURN")) {
                lockWallet();
                jdbc.update("INSERT INTO " + LEDGER + " (order_id,attempt_number,operation,amount) "
                        + "VALUES (?,?,'CREDIT_RETURN',?) ON CONFLICT DO NOTHING",
                        orderId, number, money("DEBIT_ADVANCE", orderId, number));
            }
            BigDecimal advance = (BigDecimal) ready.get("merchant_goods_amount");
            if (advance == null && codPending) {
                // Backward-compatible fallback for rows ingested before the V11 snapshot.
                advance = ((BigDecimal) shipment.get("cod_amount"))
                        .subtract((BigDecimal) shipment.get("fee")).max(BigDecimal.ZERO);
            }
            if (codPending && advance == null) {
                // Never pretend the merchant was paid when the COD snapshot is incomplete.
                jdbc.update("UPDATE " + ATTEMPTS + " SET phase='WALLET_BLOCKED' "
                        + "WHERE order_id=? AND attempt_number=?", orderId, number);
                jdbc.update("UPDATE " + READY + " SET last_error_code='ADVANCE_AMOUNT_MISSING' "
                        + "WHERE order_id=?", orderId);
                return;
            }
            if (codPending && !hasLedger(orderId, number, "DEBIT_ADVANCE")) {
                lockWallet();
                BigDecimal spent = jdbc.queryForObject("SELECT COALESCE(SUM(CASE WHEN operation="
                        + "'DEBIT_ADVANCE' THEN amount WHEN operation='CREDIT_RETURN' THEN -amount ELSE 0 END),0) "
                        + "FROM " + LEDGER, BigDecimal.class);
                if (initialWallet.subtract(spent).compareTo(advance) < 0) {
                    jdbc.update("UPDATE " + ATTEMPTS + " SET phase='WALLET_BLOCKED' "
                            + "WHERE order_id=? AND attempt_number=?", orderId, number);
                    jdbc.update("UPDATE " + READY + " SET last_error_code='RIDER_WALLET_INSUFFICIENT' "
                            + "WHERE order_id=?", orderId);
                    return;
                }
                jdbc.update("INSERT INTO " + LEDGER + " (order_id,attempt_number,operation,amount) "
                        + "VALUES (?,?,'DEBIT_ADVANCE',?) ON CONFLICT DO NOTHING", orderId, number, advance);
            }
            jdbc.update("UPDATE " + READY + " SET last_error_code=NULL WHERE order_id=?", orderId);
            // The pickup and mock third-party rider-wallet advance commit at T1.
            // Once SHIPPING, due_at is persisted and survives restarts unchanged.
            jdbc.update("UPDATE " + ATTEMPTS + " SET phase='SHIPPING', "
                    + "started_at=clock_timestamp(), "
                    + "due_at=clock_timestamp()+interval '20 seconds' "
                    + "WHERE order_id=? AND attempt_number=?", orderId, number);
            changeShipment(shipment, "SHIPPING", "SIMULATED_PICKUP_AND_TRANSIT");
            emit("shipping.started", shipment, attempt, "SHIPPING", false, null);
        } else if ("SHIPPING".equals(str(attempt, "phase"))
                && !now.isBefore(time(attempt, "due_at"))) {
            Map<String,Object> ready = nullableRow("SELECT payment_method,payment_status FROM " + READY
                    + " WHERE order_id=?", orderId);
            if (ready == null) return;
            String method = str(ready, "payment_method");
            String paymentStatus = str(ready, "payment_status");
            boolean codPending = "COD".equals(method) && "PENDING".equals(paymentStatus);
            boolean prepaidQr = "BANK_TRANSFER".equals(method) && "PAID".equals(paymentStatus);
            if (!codPending && !prepaidQr) {
                jdbc.update("UPDATE " + ATTEMPTS + " SET phase='PAYMENT_BLOCKED' "
                        + "WHERE order_id=? AND attempt_number=?", orderId, number);
                jdbc.update("UPDATE " + READY + " SET last_error_code='PAYMENT_STATUS_INVALID' "
                        + "WHERE order_id=?", orderId);
                changeShipment(shipment, "ASSIGNED", "SIMULATED_PAYMENT_VALIDATION_PENDING");
                return;
            }
            if (codPending && !hasLedger(orderId, number, "DEBIT_ADVANCE")) {
                // Guard upgraded COD attempts missing a pickup debit. Never auto-deliver
                // an unpaid merchant order.
                jdbc.update("UPDATE " + ATTEMPTS + " SET phase='WALLET_BLOCKED' "
                        + "WHERE order_id=? AND attempt_number=?", orderId, number);
                jdbc.update("UPDATE " + READY + " SET last_error_code='ADVANCE_MISSING_AT_HANDOFF' "
                        + "WHERE order_id=?", orderId);
                changeShipment(shipment, "ASSIGNED", "SIMULATED_ADVANCE_RECONCILIATION");
                return;
            }
            if (prepaidQr && hasLedger(orderId, number, "DEBIT_ADVANCE")
                    && !hasLedger(orderId, number, "CREDIT_RETURN")) {
                lockWallet();
                jdbc.update("INSERT INTO " + LEDGER + " (order_id,attempt_number,operation,amount) "
                        + "VALUES (?,?,'CREDIT_RETURN',?) ON CONFLICT DO NOTHING",
                        orderId, number, money("DEBIT_ADVANCE", orderId, number));
            }
            // A sample handoff proof is simulated. Rider collection from the customer is
            // explicitly out of band; Shipping has no evidence of cash or QR collection.
            jdbc.update("UPDATE " + ATTEMPTS + " SET phase='DELIVERED',"
                    + "completed_at=clock_timestamp(),proof_kind='SIMULATED_WATERMARK',"
                    + "proof_at=clock_timestamp() WHERE order_id=? AND attempt_number=?", orderId, number);
            changeShipment(shipment, "DELIVERED", "SIMULATED_DELIVERED_WITH_PROOF");
            emit("shipping.delivered", shipment, attempt, "DELIVERED", true, null);
        }
    }

    @Scheduled(fixedDelayString = "${clucky.shipping.mock.tick-ms:500}")
    public void publishOutbox() {
        if (!enabled) return;
        var pending = jdbc.queryForList("SELECT event_id,order_id,envelope::text AS envelope "
                + "FROM shipping_service.mock_delivery_outbox "
                + "WHERE published_at IS NULL ORDER BY created_at,event_id LIMIT 40");
        for (var row : pending) {
            try {
                DomainEvent event = events.fromJson((String) row.get("envelope"),
                        parseJson(row.get("envelope")).path("eventType").asText());
                kafka.send(events.toRecord(event, row.get("order_id").toString()))
                        .get(5, TimeUnit.SECONDS);
                jdbc.update("UPDATE shipping_service.mock_delivery_outbox "
                        + "SET published_at=clock_timestamp() WHERE event_id=? AND published_at IS NULL",
                        row.get("event_id"));
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                return;
            } catch (Exception failure) {
                LOG.warn("event=mock_shipping_outbox_retry reason={}", failure.getClass().getSimpleName());
                return;
            }
        }
    }

    /** Repair all historical QR mock debits, including invalid unpaid legacy snapshots. */
    @Scheduled(fixedDelay = 15000)
    public void reconcileHistoricalQrDebits() {
        if (!enabled) return;
        List<Map<String,Object>> outstanding = jdbc.queryForList(
                "SELECT l.order_id,l.attempt_number,l.amount FROM " + LEDGER + " l "
                + "JOIN " + READY + " r ON r.order_id=l.order_id "
                + "WHERE r.payment_method='BANK_TRANSFER' "
                + "AND l.operation='DEBIT_ADVANCE' "
                + "AND NOT EXISTS (SELECT 1 FROM " + LEDGER + " credited "
                + "WHERE credited.order_id=l.order_id AND credited.attempt_number=l.attempt_number "
                + "AND credited.operation='CREDIT_RETURN') "
                + "ORDER BY l.order_id,l.attempt_number LIMIT 32");
        for (Map<String,Object> row : outstanding) {
            transactions.executeWithoutResult(tx -> {
                lockWallet();
                long orderId = ((Number) row.get("order_id")).longValue();
                int attemptNumber = ((Number) row.get("attempt_number")).intValue();
                if (!hasLedger(orderId, attemptNumber, "CREDIT_RETURN")) {
                    jdbc.update("INSERT INTO " + LEDGER
                            + " (order_id,attempt_number,operation,amount) "
                            + "VALUES (?,?,'CREDIT_RETURN',?) ON CONFLICT DO NOTHING",
                            orderId, attemptNumber, row.get("amount"));
                }
            });
        }
    }

    private MockRouteProvider.Route fetchRoute(Map<String,Object> shipment) {
        Double lat = (Double) shipment.get("latitude");
        Double lon = (Double) shipment.get("longitude");
        if (lat == null || lon == null) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        return routes.fetch(((Number) shipment.get("store_id")).longValue(), lat, lon);
    }

    private void createAttempt(long orderId, int number, MockRouteProvider.Route route) {
        jdbc.update("INSERT INTO " + ATTEMPTS + " (order_id,attempt_number,phase,assigned_at,route) "
                + "VALUES (?,?,'WAITING_RIDER',clock_timestamp(),?::jsonb)",
                orderId, number, route.geometry().toString());
        jdbc.update("UPDATE " + SHIPMENT + " SET distance_km=? WHERE order_id=?",
                BigDecimal.valueOf(route.distanceMeters()).divide(BigDecimal.valueOf(1000),
                        2, RoundingMode.HALF_UP), orderId);
        jdbc.update("UPDATE " + READY + " SET last_error_code=NULL WHERE order_id=?", orderId);
    }

    private void changeShipment(Map<String,Object> shipment, String status, String note) {
        long orderId = ((Number) shipment.get("order_id")).longValue();
        jdbc.update("UPDATE " + SHIPMENT + " SET status=?,simulation_mode='MOCK',"
                + "mock_version=mock_version+1,updated_at=clock_timestamp() WHERE order_id=?", status, orderId);
        jdbc.update("INSERT INTO shipping_service.shipment_status_history(shipment_id,status,note) "
                + "VALUES (?,?,?)", shipment.get("id"), status, note);
    }

    private void emit(String topic, Map<String,Object> shipment, Map<String,Object> attempt,
            String phase, boolean proofRecorded, String resolution) {
        UUID id = UUID.randomUUID();
        long orderId = ((Number) shipment.get("order_id")).longValue();
        long version = jdbc.queryForObject("SELECT mock_version FROM " + SHIPMENT
                + " WHERE order_id=?", Long.class, orderId);
        ObjectNode payload = json.createObjectNode();
        payload.put("orderId", orderId);
        payload.put("storeId", ((Number) shipment.get("store_id")).longValue());
        payload.put("shipmentId", ((Number) shipment.get("id")).longValue());
        payload.put("attemptNumber", ((Number) attempt.get("attempt_number")).intValue());
        payload.put("phase", phase);
        payload.put("source", "SIMULATOR");
        payload.put("simulationOnly", true);
        payload.put("version", version);
        payload.put("proofRecorded", proofRecorded);
        // Customer pays the third-party rider externally, outside Clucky's visibility.
        // This flag must stay FALSE for all delivery outcomes.
        payload.put("simulatedCollectionConfirmed", false);
        payload.put("customerCollectionStatus", "OUT_OF_BAND_UNVERIFIED");
        Map<String,Object> ready = nullableRow("SELECT payment_method,payment_status,total_amount FROM " + READY
                + " WHERE order_id=?", orderId);
        payload.put("paymentMethod", ready == null ? "UNKNOWN" : str(ready, "payment_method"));
        String originalPaymentStatus = str(ready, "payment_status");
        int attemptNumber = ((Number) attempt.get("attempt_number")).intValue();
        boolean codPending = "COD".equals(str(ready, "payment_method"))
                && "PENDING".equals(originalPaymentStatus);
        boolean advanced = codPending && hasLedger(orderId, attemptNumber, "DEBIT_ADVANCE");
        boolean returned = hasLedger(orderId, attemptNumber, "CREDIT_RETURN");
        boolean merchantPaidByRider = advanced && !returned;
        payload.put("originalPaymentStatus", originalPaymentStatus);
        payload.put("merchantPaymentStatus", settlementStatus(originalPaymentStatus, advanced, returned));
        payload.put("merchantPaidByRider", merchantPaidByRider);
        payload.put("simulatedAdvanceConfirmed", merchantPaidByRider);
        if (codPending) {
            payload.put("riderAdvanceAmount", money("DEBIT_ADVANCE", orderId, attemptNumber));
        }
        if ("BANK_TRANSFER".equals(str(ready, "payment_method"))
                && "PAID".equals(originalPaymentStatus)) {
            payload.put("customerCollectionStatus", "NOT_APPLICABLE_PREPAID");
        }
        BigDecimal customerDue = isRealPrepaid(originalPaymentStatus) ? BigDecimal.ZERO
                : ready != null && ready.get("total_amount") instanceof BigDecimal total ? total
                : "COD".equals(str(ready, "payment_method"))
                    ? (BigDecimal) shipment.get("cod_amount") : null;
        if (customerDue != null) payload.put("customerCollectionExpectedAmount", customerDue);
        if (resolution != null) payload.put("resolution", resolution);
        String correlation = MDC.get("correlationId");
        if (correlation == null || !correlation.matches("[A-Za-z0-9._-]{1,128}")) {
            correlation = id.toString();
        }
        DomainEvent event = new DomainEvent(id.toString(), correlation, topic,
                "shipping-service", now(), payload);
        jdbc.update("INSERT INTO shipping_service.mock_delivery_outbox(event_id,order_id,envelope) "
                + "VALUES (?,?,?::jsonb)", id, orderId, events.toJson(event));
    }

    private void validateAttempt(Map<String,Object> attempt, Integer number,
            Long version, Map<String,Object> shipment) {
        if (attempt == null) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        // Every mutation must target the shipment snapshot shown to Staff/Manager.
        // An unversioned replay must never be applied to a subsequent retry attempt.
        if (number == null || version == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        if (number != null && number != ((Number) attempt.get("attempt_number")).intValue()
                || version != null && version != ((Number) shipment.get("mock_version")).longValue()) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
    }

    private void rejectReusedAttemptKey(long orderId, int currentAttempt,
            String column, String key) {
        if (key == null) return;
        // Column names are fixed internal literals at call sites, never user input.
        Boolean previouslyUsed = jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM " + ATTEMPTS
                + " WHERE order_id=? AND attempt_number<>? AND " + column + "=?)",
                Boolean.class, orderId, currentAttempt, key);
        if (Boolean.TRUE.equals(previouslyUsed)) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
    }

    private Map<String,Object> shipment(long orderId, boolean lock) {
        var found = nullableRow("SELECT id,order_id,customer_id,store_id,customer_name,phone,"
                + "address,latitude,longitude,fee,cod_amount,status,simulation_mode,mock_version "
                + "FROM " + SHIPMENT + " WHERE order_id=?" + (lock ? " FOR UPDATE" : ""), orderId);
        if (found == null) throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND);
        return found;
    }

    private Map<String,Object> latest(long orderId, boolean lock) {
        return nullableRow("SELECT * FROM " + ATTEMPTS + " WHERE order_id=? "
                + "ORDER BY attempt_number DESC LIMIT 1" + (lock ? " FOR UPDATE" : ""), orderId);
    }

    private Map<String,Object> nullableRow(String sql, Object... parameters) {
        var rows = jdbc.queryForList(sql, parameters);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private void authorize(Map<String,Object> shipment, boolean staffOnly) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() == Role.CUSTOMER && !staffOnly) {
            access.requireOwner(shipment.get("customer_id") instanceof Number owner
                    ? owner.longValue() : null);
        } else if (actor.role() == Role.STAFF || actor.role() == Role.STORE_MANAGER
                || actor.role() == Role.ADMIN) {
            access.requireStore(((Number) shipment.get("store_id")).longValue());
        } else throw new ApiException(ErrorCode.FORBIDDEN);
    }

    private void authorizeManager(Map<String,Object> shipment) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.ADMIN && actor.role() != Role.STORE_MANAGER) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        access.requireStore(((Number) shipment.get("store_id")).longValue());
    }

    private void lockWallet() {
        jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtext('clucky-mock-wallet'))",
                (result, row) -> result.getObject(1));
    }

    private BigDecimal money(String operation, long orderId, int number) {
        BigDecimal found = jdbc.queryForObject("SELECT COALESCE(SUM(amount),0) FROM " + LEDGER
                + " WHERE order_id=? AND attempt_number=? AND operation=?", BigDecimal.class,
                orderId, number, operation);
        return found == null ? BigDecimal.ZERO : found;
    }

    private static boolean isRealPrepaid(String paymentStatus) {
        return "PAID".equals(paymentStatus) || "COLLECTED".equals(paymentStatus);
    }

    private static String settlementStatus(String originalPaymentStatus,
            boolean advanceConfirmed, boolean advanceReturned) {
        if (isRealPrepaid(originalPaymentStatus)) return "PAID_REAL_PROCESSOR";
        if (advanceReturned) return "ADVANCE_RETURNED";
        if (advanceConfirmed) return "PAID_SIMULATED";
        return "AWAITING_RIDER_ADVANCE";
    }

    private static String safeTrackingError(String error) {
        if (error == null) return null;
        if (Set.of("RIDER_WALLET_INSUFFICIENT", "ADVANCE_AMOUNT_MISSING",
                "ADVANCE_MISSING_AT_HANDOFF").contains(error)) {
            return "DELIVERY_ASSIGNMENT_PENDING";
        }
        return error;
    }


    private boolean hasLedger(long orderId, int number, String operation) {
        return jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM " + LEDGER
                + " WHERE order_id=? AND attempt_number=? AND operation=?)", Boolean.class,
                orderId, number, operation);
    }

    private boolean hasRetryReceipt(long orderId, String key) {
        return jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM " + ATTEMPTS
                + " WHERE order_id=? AND retry_key=?)", Boolean.class, orderId, key);
    }

    private static void validateKey(String key) {
        if (key != null && !key.matches("[A-Za-z0-9._:-]{1,160}")) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
    }

    private Instant now() {
        return jdbc.queryForObject("SELECT clock_timestamp()", java.sql.Timestamp.class).toInstant();
    }

    private JsonNode parseJson(Object raw) {
        try { return json.readTree(raw.toString()); }
        catch (com.fasterxml.jackson.core.JsonProcessingException failure) {
            throw new IllegalStateException("Invalid stored mock delivery geometry");
        }
    }

    private static String str(Map<String,Object> row, String key) {
        return row == null || row.get(key) == null ? null : row.get(key).toString();
    }

    private static Instant time(Map<String,Object> row, String key) {
        if (row == null || row.get(key) == null) return null;
        Object value = row.get(key);
        return value instanceof java.sql.Timestamp timestamp ? timestamp.toInstant() : (Instant) value;
    }

    private Proof proof(long orderId, int attempt, Instant capturedAt) {
        String svg = "<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'>"
                + "<rect width='640' height='360' fill='#fff5e7'/>"
                + "<rect x='24' y='24' width='592' height='312' rx='24' fill='#ffdfae'/>"
                + "<text x='320' y='128' text-anchor='middle' font-size='53' font-family='sans-serif'"
                + " font-weight='bold' fill='#b44120'>CLUCKY · DEMO</text>"
                + "<text x='320' y='195' text-anchor='middle' font-size='29' font-family='sans-serif'"
                + " fill='#6d321e'>SIMULATED DELIVERY PROOF</text>"
                + "<text x='320' y='245' text-anchor='middle' font-size='22' font-family='sans-serif'"
                + " fill='#6d321e'>Order #" + orderId + " · Attempt #" + attempt + "</text>"
                + "<text x='320' y='287' text-anchor='middle' font-size='16' font-family='sans-serif'"
                + " fill='#6d321e'>" + capturedAt + "</text></svg>";
        return new Proof("SIMULATED_WATERMARK", capturedAt, "data:image/svg+xml;base64,"
                + Base64.getEncoder().encodeToString(svg.getBytes(StandardCharsets.UTF_8)));
    }

    private void ensureEnabled() {
        if (!enabled) throw new ApiException(ErrorCode.NOT_IMPLEMENTED);
    }
}
