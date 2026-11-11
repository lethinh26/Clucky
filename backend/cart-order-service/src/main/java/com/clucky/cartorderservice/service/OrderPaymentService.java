package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.config.AccessGuard;
import com.clucky.cartorderservice.dto.DomainEvent;
import com.clucky.cartorderservice.entity.Order;
import com.clucky.cartorderservice.entity.OrderStatusHistory;
import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import com.clucky.cartorderservice.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderPaymentService {
    private final OrderRepository orders;
    private final OrderItemRepository items;
    private final OrderStatusHistoryRepository history;
    private final OrderService orderService;
    private final OrderEventPublisher events;
    private final AccessGuard access;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final Duration ttl;

    public OrderPaymentService(OrderRepository orders, OrderItemRepository items, OrderStatusHistoryRepository history,
            OrderService orderService, OrderEventPublisher events, AccessGuard access, JdbcTemplate jdbc, ObjectMapper mapper,
            @Value("${payment.session-ttl:15m}") Duration ttl) {
        this.orders = orders; this.items = items; this.history = history; this.orderService = orderService;
        this.events = events; this.access = access; this.jdbc = jdbc; this.mapper = mapper; this.ttl = ttl;
        if (ttl.isNegative() || ttl.isZero()) throw new IllegalArgumentException("Invalid payment TTL");
    }

    public record Session(Long orderId, String orderCode, Long customerId, Long storeId,
            BigDecimal amount, String status, String paymentMethod, Instant expiresAt) {}

    public record Context(long orderId, String orderCode, Long customerId, Long storeId, BigDecimal amount,
            String status, String paymentMethod, String paymentStatus, Instant expiresAt, Instant version) {}

    @Transactional(readOnly = true)
    public Context context(long id) {
        Order order = orders.findById(id).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        if (com.clucky.cartorderservice.config.CurrentActor.require().role() == com.clucky.cartorderservice.dto.Role.CUSTOMER) access.requireOwner(order.getCustomerId());
        else access.requireStore(order.getStoreId());
        return context(order);
    }

    private Context context(Order order) {
        return new Context(order.getId(), order.getOrderCode(), order.getCustomerId(), order.getStoreId(), order.getTotalAmount(),
                order.getStatus(), order.getPaymentMethod(), order.getPaymentStatus(), order.getPaymentExpiresAt(), order.getUpdatedAt());
    }


    @Transactional
    public Session open(long id) {
        Order order = orders.lockById(id).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        validate(order);
        if (order.getPaymentExpiresAt() == null) order.setPaymentExpiresAt(Instant.now().plus(ttl).truncatedTo(ChronoUnit.MILLIS));
        return session(order);
    }

    @Transactional(readOnly = true)
    public Session preview(long id) {
        Order order = orders.findById(id).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        validate(order);
        return session(order);
    }

    private void validate(Order order) {
        access.requireOwner(order.getCustomerId());
        if (!"BANK_TRANSFER".equals(order.getPaymentMethod()) || !"PENDING_PAYMENT".equals(order.getStatus())
                || !"PENDING".equals(order.getPaymentStatus()) || order.getTotalAmount().signum() <= 0) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
    }

    private Session session(Order order) {
        return new Session(order.getId(), order.getOrderCode(), order.getCustomerId(), order.getStoreId(),
                order.getTotalAmount(), order.getStatus(), order.getPaymentMethod(), order.getPaymentExpiresAt());
    }

    @Transactional
    public void decide(DomainEvent event) {
        if (!"payment-service".equals(event.sourceService()) || !"payment.received".equals(event.eventType())) {
            throw new IllegalArgumentException("Unexpected payment event source");
        }
        var payload = event.payload();
        if ("COLLECTION".equals(payload.path("operationType").asText())) { decideCollection(event); return; }
        long orderId = payload.path("orderId").asLong();
        long paymentId = payload.path("paymentId").asLong();
        if (!payload.path("orderId").isIntegralNumber() || !payload.path("orderId").canConvertToLong()
                || !payload.path("paymentId").isIntegralNumber() || !payload.path("paymentId").canConvertToLong()
                || orderId <= 0 || paymentId <= 0 || !payload.path("amount").isNumber()
                || !payload.path("receivedAmount").isNumber()) throw new IllegalArgumentException("Invalid receipt event");
        Order order = orders.lockById(orderId).orElseThrow(() -> new IllegalArgumentException("Payment order not found"));
        if (!jdbc.queryForList("SELECT payment_id FROM order_service.payment_decisions WHERE payment_id=?", Long.class, paymentId).isEmpty()) return;
        if (!"BANK_TRANSFER".equals(order.getPaymentMethod()) || order.getPaymentExpiresAt() == null
                || !Objects.equals(order.getOrderCode(), payload.path("orderCode").asText())
                || !Objects.equals(order.getCustomerId(), payload.path("customerId").asLong())
                || !Objects.equals(order.getStoreId(), payload.path("storeId").asLong())
                || order.getTotalAmount().compareTo(payload.path("amount").decimalValue()) != 0
                || payload.path("receivedAmount").decimalValue().compareTo(order.getTotalAmount()) < 0
                || !order.getPaymentExpiresAt().equals(Instant.parse(payload.path("expiresAt").asText()))) {
            throw new IllegalArgumentException("Receipt does not match order snapshot");
        }
        String decision;
        if ("COLLECTED".equals(order.getPaymentStatus())) {
            decision = "SUPERSEDED";
        } else if ("PENDING_PAYMENT".equals(order.getStatus()) && order.getPaymentExpiresAt().isAfter(Instant.now())) {
            order.setStatus("CONFIRMED");
            order.setPaymentStatus("PAID");
            OrderStatusHistory entry = new OrderStatusHistory();
            entry.setOrderId(orderId); entry.setFromStatus("PENDING_PAYMENT"); entry.setToStatus("CONFIRMED");
            entry.setChangedRole("SYSTEM_PAYMENT"); entry.setCreatedAt(Instant.now()); entry.setReason("SEPAY_PAYMENT_RECEIVED");
            history.save(entry);
            events.publishOrderStatusChanged(order, items.findByOrderIdOrderByIdAsc(orderId), "PENDING_PAYMENT");
            decision = "ACCEPTED";
        } else if ("PENDING_PAYMENT".equals(order.getStatus())) {
            orderService.compensateFailedPayment(orderId, order.getOrderCode(), "PAYMENT_EXPIRED");
            decision = "EXPIRED";
        } else {
            decision = history.findByOrderIdOrderByCreatedAtAsc(orderId).stream().anyMatch(entry ->
                    "SYSTEM_SAGA".equals(entry.getChangedRole()) && "PAYMENT_EXPIRED".equals(entry.getReason())) ? "EXPIRED" : "CANCELLED";
        }
        jdbc.update("INSERT INTO order_service.payment_decisions(payment_id,order_id,event_id,decision) VALUES (?,?,?,?)",
                paymentId, orderId, event.eventId(), decision);
        var result = mapper.createObjectNode().put("paymentId", paymentId).put("orderId", orderId)
                .put("customerId", order.getCustomerId()).put("storeId", order.getStoreId())
                .put("orderCode", order.getOrderCode()).put("decision", decision);
        events.publish("order.payment-resolved", order, result);
    }

    private void decideCollection(DomainEvent event) {
        var payload = event.payload();
        java.util.UUID collectionId = java.util.UUID.fromString(payload.path("collectionId").asText());
        if (!payload.path("orderId").isIntegralNumber() || !payload.path("orderId").canConvertToLong() || payload.path("orderId").asLong() <= 0
                || !payload.path("cashAmount").isNumber() || !payload.path("declaredTransfer").isNumber()) throw new IllegalArgumentException("Invalid collection event");
        long orderId = payload.path("orderId").asLong();
        Order order = orders.lockById(orderId).orElseThrow(() -> new IllegalArgumentException("Collection order missing"));
        if (!jdbc.queryForList("SELECT collection_id FROM order_service.collection_decisions WHERE collection_id=?", java.util.UUID.class, collectionId).isEmpty()) return;
        BigDecimal cash = payload.path("cashAmount").decimalValue();
        BigDecimal transfer = payload.path("declaredTransfer").decimalValue();
        if (cash.signum() < 0 || transfer.signum() < 0 || cash.stripTrailingZeros().scale() > 0 || transfer.stripTrailingZeros().scale() > 0
                || cash.compareTo(new BigDecimal("999999999999")) > 0 || transfer.compareTo(new BigDecimal("999999999999")) > 0 || !payload.path("amount").isNumber()
                || !java.util.Set.of("STAFF", "STORE_MANAGER", "ADMIN").contains(payload.path("actorRole").asText())
                || !payload.path("actorId").isIntegralNumber() || !payload.path("actorId").canConvertToLong() || payload.path("actorId").asLong() <= 0
                || !payload.path("storeId").isIntegralNumber() || !payload.path("storeId").canConvertToLong()
                || !payload.path("customerId").isIntegralNumber() || !payload.path("customerId").canConvertToLong()
                || !Objects.equals(order.getOrderCode(), payload.path("orderCode").asText())
                || !Objects.equals(order.getCustomerId(), payload.path("customerId").asLong())
                || !Objects.equals(order.getStoreId(), payload.path("storeId").asLong())
                || order.getTotalAmount().compareTo(payload.path("amount").decimalValue()) != 0) throw new IllegalArgumentException("Collection snapshot mismatch");
        String decision = "CANCELLED";
        if (!"PENDING".equals(order.getPaymentStatus())) decision = "SUPERSEDED";
        else if (order.getPaymentExpiresAt() != null && !order.getPaymentExpiresAt().isAfter(Instant.now())
                && "PENDING_PAYMENT".equals(order.getStatus())) {
            orderService.compensateFailedPayment(orderId, order.getOrderCode(), "PAYMENT_EXPIRED");
            decision = "EXPIRED";
        } else if (java.util.Set.of("PENDING_PAYMENT", "CONFIRMED", "PREPARING", "READY").contains(order.getStatus())) {
            if (!order.getUpdatedAt().equals(Instant.parse(payload.path("orderVersion").asText()))) decision = "STALE_VERSION";
            else {
                String previous = order.getStatus();
                order.setPaymentStatus("COLLECTED");
                order.setCollectionMethod(cash.signum() > 0 ? transfer.signum() > 0 ? "MIXED" : "CASH" : transfer.signum() > 0 ? "BANK_TRANSFER" : "UNVERIFIED");
                order.setCollectedCash(cash); order.setDeclaredTransfer(transfer);
                if ("PENDING_PAYMENT".equals(previous)) order.setStatus("CONFIRMED");
                OrderStatusHistory entry = new OrderStatusHistory();
                entry.setOrderId(orderId); entry.setFromStatus(previous); entry.setToStatus(order.getStatus());
                entry.setChangedRole("SYSTEM_COLLECTION"); entry.setReason("COLLECTION_ACCEPTED"); entry.setCreatedAt(Instant.now()); history.save(entry);
                events.publishOrderStatusChanged(order, items.findByOrderIdOrderByIdAsc(orderId), previous);
                decision = "ACCEPTED";
            }
        }
        jdbc.update("INSERT INTO order_service.collection_decisions(collection_id,order_id,event_id,decision) VALUES (?,?,?,?)",
                collectionId, orderId, event.eventId(), decision);
        var result = mapper.createObjectNode().put("operationType", "COLLECTION").put("collectionId", collectionId.toString()).put("orderId", orderId)
                .put("customerId", order.getCustomerId()).put("storeId", order.getStoreId()).put("orderCode", order.getOrderCode()).put("decision", decision);
        events.publish("order.payment-resolved", order, result);
    }

    @Transactional
    public void expire(long id) {
        Order order = orders.lockById(id).orElse(null);
        if (order != null && "PENDING_PAYMENT".equals(order.getStatus()) && order.getPaymentExpiresAt() != null
                && !order.getPaymentExpiresAt().isAfter(Instant.now())) {
            orderService.compensateFailedPayment(id, order.getOrderCode(), "PAYMENT_EXPIRED");
        }
    }

    @Transactional
    public void updatePaymentStatus(long id, String paymentStatus) {
        Order order = orders.lockById(id).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        if (com.clucky.cartorderservice.config.CurrentActor.require().role() != com.clucky.cartorderservice.dto.Role.ADMIN
                && com.clucky.cartorderservice.config.CurrentActor.require().role() != com.clucky.cartorderservice.dto.Role.INTERNAL_SERVICE) {
            access.requireStore(order.getStoreId());
        }
        if ("COLLECTED".equalsIgnoreCase(paymentStatus)) {
            order.setPaymentStatus("COLLECTED");
            if ("PENDING_PAYMENT".equals(order.getStatus())) {
                String prev = order.getStatus();
                order.setStatus("CONFIRMED");
                OrderStatusHistory historyEntry = new OrderStatusHistory();
                historyEntry.setOrderId(id);
                historyEntry.setFromStatus(prev);
                historyEntry.setToStatus("CONFIRMED");
                historyEntry.setChangedRole("STAFF");
                historyEntry.setReason("COUNTER_COLLECTED");
                historyEntry.setCreatedAt(Instant.now());
                history.save(historyEntry);
                events.publishOrderStatusChanged(order, items.findByOrderIdOrderByIdAsc(id), prev);
            }
        } else if ("PENDING".equalsIgnoreCase(paymentStatus)) {
            order.setPaymentStatus("PENDING");
        }
        orders.save(order);
    }
}
