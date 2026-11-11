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
public class CustomerLockedEventConsumer {
    private static final Logger LOG = LoggerFactory.getLogger(CustomerLockedEventConsumer.class);
    private final CustomerLockService customerLockService;
    private final EventMapper eventMapper;
    public CustomerLockedEventConsumer(CustomerLockService customerLockService, EventMapper eventMapper) {
        this.customerLockService = customerLockService; this.eventMapper = eventMapper;
    }
    @KafkaListener(topics = "customer.locked", groupId = "cart-order-service-group")
    public void onCustomerLocked(ConsumerRecord<String, String> record, Acknowledgment ack) {
        try {
            DomainEvent event = eventMapper.fromJson(record.value(), "customer.locked");
            JsonNode payload = event.payload();
            long customerId = requiredPositiveLong(payload, "customerId");
            Long actorId = optionalPositiveLong(payload, "adminId");
            String actorRole = payload.hasNonNull("adminRole") ? payload.get("adminRole").asText() : "ADMIN";
            customerLockService.apply(event, customerId, actorId, actorRole);
            if (ack != null) ack.acknowledge();
        } catch (IllegalArgumentException ex) {
            LOG.error("event=customer_locked_invalid_payload partition={} offset={} error={}", record.partition(), record.offset(), ex.getMessage());
            if (ack != null) ack.acknowledge();
        } catch (Exception ex) {
            LOG.error("event=customer_locked_error partition={} offset={} error={}", record.partition(), record.offset(), ex.getMessage(), ex);
            throw ex;
        }
    }
    private long requiredPositiveLong(JsonNode payload, String field) {
        if (!payload.hasNonNull(field) || !payload.get(field).canConvertToLong() || payload.get(field).asLong() <= 0) throw new IllegalArgumentException("Missing valid " + field);
        return payload.get(field).asLong();
    }
    private Long optionalPositiveLong(JsonNode payload, String field) {
        if (!payload.hasNonNull(field)) return null;
        return requiredPositiveLong(payload, field);
    }
}
