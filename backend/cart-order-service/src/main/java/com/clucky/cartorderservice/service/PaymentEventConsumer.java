package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.dto.DomainEvent;
import com.clucky.cartorderservice.mapper.EventMapper;
import com.fasterxml.jackson.databind.JsonNode;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

@Component
public class PaymentEventConsumer {
    private static final Logger LOG = LoggerFactory.getLogger(PaymentEventConsumer.class);

    private final OrderService orderService;
    private final EventMapper eventMapper;

    public PaymentEventConsumer(OrderService orderService, EventMapper eventMapper) {
        this.orderService = orderService;
        this.eventMapper = eventMapper;
    }

    @KafkaListener(topics = "payment.failed", groupId = "cart-order-service-group")
    public void onPaymentFailed(ConsumerRecord<String, String> record, Acknowledgment ack) {
        try {
            LOG.info("event=kafka_payment_failed_received partition={} offset={} key={}",
                    record.partition(), record.offset(), record.key());

            DomainEvent event = eventMapper.fromJson(record.value(), "payment.failed");
            JsonNode payload = event.payload();

            Long orderId = payload.hasNonNull("orderId") ? payload.get("orderId").asLong() : null;
            String orderCode = payload.hasNonNull("orderCode") ? payload.get("orderCode").asText() : null;
            String reason = payload.hasNonNull("reason") ? payload.get("reason").asText()
                    : "Payment failed / cancelled by saga compensation";

            orderService.compensateFailedPayment(orderId, orderCode, reason);

            if (ack != null) {
                ack.acknowledge();
            }
        } catch (IllegalArgumentException e) {
            LOG.error("event=kafka_payment_failed_invalid_payload error={} payload={}", e.getMessage(), record.value());
            throw e;
        } catch (Exception e) {
            LOG.error("event=kafka_payment_failed_error error={}", e.getMessage(), e);
            throw e;
        }
    }
}
