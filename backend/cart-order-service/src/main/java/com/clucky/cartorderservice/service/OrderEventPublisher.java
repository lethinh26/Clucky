package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.dto.DomainEvent;
import com.clucky.cartorderservice.entity.Order;
import com.clucky.cartorderservice.entity.OrderItem;
import com.clucky.cartorderservice.entity.OutboxEvent;
import com.clucky.cartorderservice.repository.OutboxEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Component
public class OrderEventPublisher {
    private static final Logger LOG = LoggerFactory.getLogger(OrderEventPublisher.class);

    public static final String TOPIC_ORDER_CREATED = "order.created";
    public static final String TOPIC_ORDER_STATUS_CHANGED = "order.status-changed";
    public static final String TOPIC_ORDER_COMPLETED = "order.completed";
    public static final String TOPIC_ORDER_CANCELLED = "order.cancelled";

    private final OutboxEventRepository outboxEventRepository;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final ObjectMapper objectMapper;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;

    public OrderEventPublisher(
            OutboxEventRepository outboxEventRepository,
            ApplicationEventPublisher applicationEventPublisher,
            ObjectMapper objectMapper,
            org.springframework.jdbc.core.JdbcTemplate jdbc
    ) {
        this.outboxEventRepository = outboxEventRepository;
        this.applicationEventPublisher = applicationEventPublisher;
        this.objectMapper = objectMapper;
        this.jdbc = jdbc;
    }

    public void publishOrderCreated(Order order, List<OrderItem> items, java.util.Map<Long, Long> stockQuantities) {
        ObjectNode payload = buildOrderPayload(order, items, null, null);
        payload.set("stockQuantities", objectMapper.valueToTree(stockQuantities));
        publish(TOPIC_ORDER_CREATED, order, payload);
    }

    public void publishOrderStatusChanged(Order order, List<OrderItem> items, String previousStatus) {
        ObjectNode payload = buildOrderPayload(order, items, previousStatus, null);
        publish(TOPIC_ORDER_STATUS_CHANGED, order, payload);
        auditOperation(order, "ORDER_STATUS_CHANGED");
    }

    public void publishOrderCompleted(Order order, List<OrderItem> items) {
        ObjectNode payload = buildOrderPayload(order, items, null, null);
        publish(TOPIC_ORDER_COMPLETED, order, payload);
    }

    public void publishOrderCancelled(Order order, List<OrderItem> items, String reason) {
        publishOrderCancelled(order, items, reason, false);
    }

    public void publishOrderCancelled(Order order, List<OrderItem> items, String reason, boolean paymentExpired) {
        ObjectNode payload = buildOrderPayload(order, items, null, reason);
        payload.put("paymentExpired", paymentExpired);
        publish(TOPIC_ORDER_CANCELLED, order, payload);
        if (!paymentExpired && "BANK_TRANSFER".equals(order.getPaymentMethod()))
            jdbc.update("INSERT INTO order_service.cancellation_refund_work(order_id) VALUES (?) ON CONFLICT DO NOTHING", order.getId());
        auditOperation(order, "ORDER_CANCELLED");
    }

    public void publishRefundEvent(String topic, com.clucky.cartorderservice.entity.RefundRequest refund, Order order, String reason) {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("refundId", refund.getId());
        payload.put("orderId", refund.getOrderId());
        payload.put("orderCode", order.getOrderCode());
        if (order.getCustomerEmail() != null && order.isCustomerEmailVerified()) {
            payload.put("customerEmail", order.getCustomerEmail());
            payload.putObject("recipient").put("userId", order.getCustomerId()).put("role", "CUSTOMER")
                    .put("email", order.getCustomerEmail()).put("emailVerified", true);
        }
        if (refund.getCustomerId() != null) {
            payload.put("customerId", refund.getCustomerId());
        }
        payload.put("storeId", order.getStoreId());
        if (refund.getAmount() != null) {
            payload.put("amount", refund.getAmount());
        }
        payload.put("status", refund.getStatus());
        if (reason != null && !reason.isBlank()) {
            payload.put("reason", reason);
        }
        if (refund.getAttemptCount() != null) {
            payload.put("attemptCount", refund.getAttemptCount());
        }
        if (refund.getBankDetailsVersion() != null) {
            payload.put("bankDetailsVersion", refund.getBankDetailsVersion());
        }
        publish(topic, order, payload);
    }

    public void auditRefund(Order order, com.clucky.cartorderservice.entity.RefundRequest refund,
            String action, Long actorId, String actorRole) {
        ObjectNode payload = objectMapper.createObjectNode().put("actorId", actorId).put("actorRole", actorRole)
                .put("storeId", order.getStoreId()).put("action", action).put("targetType", "RefundRequest").put("targetId", refund.getId());
        payload.putObject("detail").put("result", "SUCCESS").put("orderId", order.getId())
                .put("amount", refund.getAmount()).put("status", refund.getStatus())
                .put("attemptCount", refund.getAttemptCount()).put("bankDetailsVersion", refund.getBankDetailsVersion());
        publish("audit.recorded", order, payload);
    }

    private void auditOperation(Order order, String action) {
        var authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken token)) return;
        String role = token.getToken().getClaimAsString("role");
        if (!List.of("ADMIN", "STORE_MANAGER", "STAFF").contains(role)) return;
        ObjectNode payload = objectMapper.createObjectNode().put("actorId", Long.parseLong(token.getToken().getSubject()))
                .put("actorRole", role).put("storeId", order.getStoreId()).put("action", action)
                .put("targetType", "Order").put("targetId", order.getId());
        payload.putObject("detail").put("sessionId", token.getToken().getClaimAsString("sid"))
                .put("result", "SUCCESS").put("status", order.getStatus()).put("identity", "SHARED_ACCOUNT_NOT_PERSON");
        publish("audit.recorded", order, payload);
    }

    private ObjectNode buildOrderPayload(Order order, List<OrderItem> items, String previousStatus, String reason) {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("orderId", order.getId());
        payload.put("orderCode", order.getOrderCode());
        payload.put("customerId", order.getCustomerId());
        payload.put("storeId", order.getStoreId());
        payload.put("type", order.getType());
        payload.put("status", order.getStatus());
        payload.put("paymentStatus", order.getPaymentStatus());
        if (order.getOrderSource() != null) {
            payload.put("orderSource", order.getOrderSource());
        }
        if (order.getDiningOption() != null) {
            payload.put("diningOption", order.getDiningOption());
        }
        if (order.getQueueNumber() != null) {
            payload.put("queueNumber", order.getQueueNumber());
        }
        if (order.getPaymentMethod() != null) {
            payload.put("paymentMethod", order.getPaymentMethod());
        }
        if (order.getCollectionMethod() != null) {
            payload.put("paymentMethod", order.getCollectionMethod());
            payload.put("cashAmount", order.getCollectedCash());
            payload.put("declaredTransfer", order.getDeclaredTransfer());
        }

        if (previousStatus != null) {
            payload.put("previousStatus", previousStatus);
        }
        if (reason != null && !reason.isBlank()) {
            payload.put("reason", reason);
        }

        if (order.getSubtotal() != null) {
            payload.put("subtotal", order.getSubtotal());
        }
        if (order.getDiscountAmount() != null) {
            payload.put("discountAmount", order.getDiscountAmount());
        }
        if (order.getPointsUsed() != null) {
            payload.put("pointsUsed", order.getPointsUsed());
        }
        if (order.getPointsAmount() != null) {
            payload.put("pointsAmount", order.getPointsAmount());
        }
        if (order.getShippingFee() != null) {
            payload.put("shippingFee", order.getShippingFee());
        }
        if (order.getTotalAmount() != null) {
            payload.put("totalAmount", order.getTotalAmount());
        }
        if (order.getVoucherCode() != null) {
            payload.put("voucherCode", order.getVoucherCode());
        }
        if (order.getReceiverName() != null) {
            payload.put("receiverName", order.getReceiverName());
        }
        if (order.getReceiverPhone() != null) {
            payload.put("receiverPhone", order.getReceiverPhone());
        }
        if (order.getDeliveryAddress() != null) {
            payload.put("deliveryAddress", order.getDeliveryAddress());
        }
        if (order.getLatitude() != null) {
            payload.put("latitude", order.getLatitude());
        }
        if (order.getLongitude() != null) {
            payload.put("longitude", order.getLongitude());
        }
        if (order.getNote() != null) {
            payload.put("note", order.getNote());
        }
        if (order.getScheduledAt() != null) {
            payload.put("scheduledAt", order.getScheduledAt().toString());
        }

        ArrayNode itemsNode = payload.putArray("items");
        if (items != null) {
            for (OrderItem item : items) {
                ObjectNode itemNode = itemsNode.addObject();
                itemNode.put("id", item.getId());
                itemNode.put("itemType", item.getItemType());
                if (item.getProductId() != null) {
                    itemNode.put("productId", item.getProductId());
                }
                if (item.getComboId() != null) {
                    itemNode.put("comboId", item.getComboId());
                }
                itemNode.put("itemName", item.getItemName());
                if (item.getUnitPrice() != null) {
                    itemNode.put("unitPrice", item.getUnitPrice());
                }
                if (item.getQuantity() != null) {
                    itemNode.put("quantity", item.getQuantity());
                }
                if (item.getLineTotal() != null) {
                    itemNode.put("lineTotal", item.getLineTotal());
                }
                if (item.getNote() != null) {
                    itemNode.put("note", item.getNote());
                }
            }
        }

        return payload;
    }

    /**
     * Transactional Outbox Pattern: Saves outbox record in the same database transaction.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void publish(String topic, Order order, ObjectNode payload) {
        try {
            String eventId = UUID.randomUUID().toString();
            String correlationId = resolveCorrelationId();

            DomainEvent event = new DomainEvent(
                    eventId,
                    correlationId,
                    topic,
                    "cart-order-service",
                    Instant.now(),
                    payload
            );

            String jsonPayload = objectMapper.writeValueAsString(event);
            OutboxEvent outboxEvent = new OutboxEvent(
                    eventId,
                    "Order",
                    order.getOrderCode() != null ? order.getOrderCode() : String.valueOf(order.getId()),
                    topic,
                    topic,
                    jsonPayload
            );

            OutboxEvent saved = outboxEventRepository.save(outboxEvent);
            if (topic.startsWith("refund.") && order.getCustomerId() != null && !payload.hasNonNull("recipient")) {
                saved.setStatus("WAITING_RECIPIENT");
                saved.setLastError("Verified customer email required");
                outboxEventRepository.save(saved);
                return;
            }
            LOG.info("event=outbox_event_saved eventId={} topic={} orderCode={}",
                    eventId, topic, order.getOrderCode());

            // Fire application event to be dispatched after transaction commit
            applicationEventPublisher.publishEvent(new OutboxEventCreatedEvent(saved.getId(), topic, order.getOrderCode()));
        } catch (Exception ex) {
            LOG.error("event=outbox_event_save_failed topic={} orderCode={} error={}",
                    topic, order.getOrderCode(), ex.getMessage(), ex);
            throw new RuntimeException("Failed to persist outbox event", ex);
        }
    }

    private String resolveCorrelationId() {
        String correlationId = MDC.get("correlationId");
        if (correlationId != null && correlationId.matches("[A-Za-z0-9._-]{1,128}")) {
            return correlationId;
        }
        return UUID.randomUUID().toString();
    }

    public record OutboxEventCreatedEvent(Long outboxId, String topic, String orderCode) {}
}
