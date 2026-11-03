package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.dto.DomainEvent;
import com.clucky.cartorderservice.entity.Order;
import com.clucky.cartorderservice.entity.OrderItem;
import com.clucky.cartorderservice.mapper.EventMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

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

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final EventMapper eventMapper;
    private final ObjectMapper objectMapper;

    public OrderEventPublisher(
            KafkaTemplate<String, String> kafkaTemplate,
            EventMapper eventMapper,
            ObjectMapper objectMapper
    ) {
        this.kafkaTemplate = kafkaTemplate;
        this.eventMapper = eventMapper;
        this.objectMapper = objectMapper;
    }

    public void publishOrderCreated(Order order, List<OrderItem> items) {
        ObjectNode payload = buildOrderPayload(order, items, null, null);
        publish(TOPIC_ORDER_CREATED, order, payload);
    }

    public void publishOrderStatusChanged(Order order, List<OrderItem> items, String previousStatus) {
        ObjectNode payload = buildOrderPayload(order, items, previousStatus, null);
        publish(TOPIC_ORDER_STATUS_CHANGED, order, payload);
    }

    public void publishOrderCompleted(Order order, List<OrderItem> items) {
        ObjectNode payload = buildOrderPayload(order, items, null, null);
        publish(TOPIC_ORDER_COMPLETED, order, payload);
    }

    public void publishOrderCancelled(Order order, List<OrderItem> items, String reason) {
        ObjectNode payload = buildOrderPayload(order, items, null, reason);
        publish(TOPIC_ORDER_CANCELLED, order, payload);
    }

    private ObjectNode buildOrderPayload(Order order, List<OrderItem> items, String previousStatus, String reason) {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("orderId", order.getId());
        payload.put("orderCode", order.getOrderCode());
        payload.put("customerId", order.getCustomerId());
        payload.put("storeId", order.getStoreId());
        payload.put("type", order.getType());
        payload.put("status", order.getStatus());

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

    private void publish(String topic, Order order, ObjectNode payload) {
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

            ProducerRecord<String, String> record = eventMapper.toRecord(event, order.getOrderCode());
            kafkaTemplate.send(record).whenComplete((result, ex) -> {
                if (ex != null) {
                    LOG.warn("event=order_event_publish_failed topic={} orderCode={} error={}",
                            topic, order.getOrderCode(), ex.getMessage());
                } else {
                    LOG.info("event=order_event_published topic={} orderCode={} partition={} offset={}",
                            topic, order.getOrderCode(),
                            result.getRecordMetadata().partition(),
                            result.getRecordMetadata().offset());
                }
            });
        } catch (Exception ex) {
            LOG.warn("event=order_event_publish_exception topic={} orderCode={} error={}",
                    topic, order.getOrderCode(), ex.getMessage());
        }
    }

    private String resolveCorrelationId() {
        String correlationId = MDC.get("correlationId");
        if (correlationId != null && correlationId.matches("[A-Za-z0-9._-]{1,128}")) {
            return correlationId;
        }
        return UUID.randomUUID().toString();
    }
}
