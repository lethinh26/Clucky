package com.clucky.promotionloyaltyservice.consumer;

import com.clucky.promotionloyaltyservice.dto.DomainEvent;
import com.clucky.promotionloyaltyservice.dto.EarnPointsRequest;
import com.clucky.promotionloyaltyservice.dto.PointTransactionResponse;
import com.clucky.promotionloyaltyservice.logging.SafeLog;
import com.clucky.promotionloyaltyservice.mapper.EventMapper;
import com.clucky.promotionloyaltyservice.service.LoyaltyService;
import com.fasterxml.jackson.databind.JsonNode;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class OrderCompletedConsumer {
    private static final Logger LOG = LoggerFactory.getLogger(OrderCompletedConsumer.class);

    public static final String TOPIC_ORDER_COMPLETED = "order.completed";

    private final EventMapper eventMapper;
    private final LoyaltyService loyaltyService;

    public OrderCompletedConsumer(EventMapper eventMapper, LoyaltyService loyaltyService) {
        this.eventMapper = eventMapper;
        this.loyaltyService = loyaltyService;
    }

    @KafkaListener(
            topics = TOPIC_ORDER_COMPLETED,
            groupId = "${spring.kafka.consumer.group-id:promotion-loyalty-group}"
    )
    public void consume(ConsumerRecord<String, String> record, Acknowledgment ack) {
        try {
            // Validate topic contract (AC-03)
            if (!TOPIC_ORDER_COMPLETED.equals(record.topic())) {
                LOG.warn("event=order_event_ignored_wrong_topic topic={} partition={} offset={}",
                        SafeLog.token(record.topic()), record.partition(), record.offset());
                if (ack != null) {
                    ack.acknowledge();
                }
                return;
            }

            DomainEvent event;
            try {
                event = eventMapper.fromJson(record.value(), TOPIC_ORDER_COMPLETED);
            } catch (Exception ex) {
                LOG.error("event=order_completed_malformed topic={} partition={} offset={} error={}",
                        SafeLog.token(record.topic()), record.partition(), record.offset(), ex.getMessage());
                if (ack != null) {
                    ack.acknowledge();
                }
                return;
            }

            String eventId = event.eventId();
            String correlationId = event.correlationId();
            MDC.put("eventId", eventId);
            MDC.put("correlationId", correlationId);

            try {
                processCompletedEvent(event);
                if (ack != null) {
                    ack.acknowledge();
                }
            } finally {
                MDC.remove("eventId");
                MDC.remove("correlationId");
            }
        } catch (Exception ex) {
            LOG.error("event=order_completed_processing_error topic={} offset={} error={}",
                    record.topic(), record.offset(), ex.getMessage(), ex);
            throw ex;
        }
    }

    private void processCompletedEvent(DomainEvent event) {
        JsonNode payload = event.payload();
        if (payload == null || !payload.isObject()) {
            LOG.warn("event=order_completed_skipped_invalid_payload eventId={}", event.eventId());
            return;
        }

        // Validate status (AC-03)
        String status = payload.hasNonNull("status") ? payload.get("status").asText() : "";
        if (!"COMPLETED".equalsIgnoreCase(status) && !status.isBlank()) {
            LOG.warn("event=order_event_ignored_status_not_completed eventId={} status={}", event.eventId(), status);
            return;
        }

        // Validate customer identity (AC-01, AC-05)
        Long customerId = null;
        if (payload.hasNonNull("customerId")) {
            customerId = payload.get("customerId").asLong();
        } else if (payload.hasNonNull("userId")) {
            customerId = payload.get("userId").asLong();
        }

        if (customerId == null || customerId <= 0) {
            LOG.warn("event=order_completed_skipped_no_customer eventId={}", event.eventId());
            return;
        }

        Long orderId = null;
        if (payload.hasNonNull("orderId")) {
            orderId = payload.get("orderId").asLong();
        } else if (payload.hasNonNull("id")) {
            orderId = payload.get("id").asLong();
        }

        String orderCode = payload.hasNonNull("orderCode")
                ? payload.get("orderCode").asText()
                : (orderId != null ? String.valueOf(orderId) : "N/A");

        // Determine eligible amount
        BigDecimal orderAmount = BigDecimal.ZERO;
        if (payload.hasNonNull("totalAmount")) {
            orderAmount = new BigDecimal(payload.get("totalAmount").asText());
        } else if (payload.hasNonNull("subtotal")) {
            orderAmount = new BigDecimal(payload.get("subtotal").asText());
        }

        // Dedup operation key: tied to orderId to ensure exactly-once earning per order
        String operationKey = orderId != null ? "EARN:order:" + orderId : "EARN:event:" + event.eventId();
        String reason = "Tích điểm đơn hàng #" + orderCode + " hoàn tất";

        EarnPointsRequest earnRequest = new EarnPointsRequest(
                customerId,
                orderId,
                orderAmount,
                null,
                operationKey,
                reason
        );

        PointTransactionResponse tx = loyaltyService.earnPoints(earnRequest);
        LOG.info("event=loyalty_points_earned_from_completed customerId={} orderId={} change=+{} balanceAfter={} operationKey={}",
                customerId, orderId, tx.change(), tx.balanceAfter(), operationKey);
    }
}
