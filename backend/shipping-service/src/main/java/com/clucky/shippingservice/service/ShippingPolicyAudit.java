package com.clucky.shippingservice.service;

import com.clucky.shippingservice.config.CurrentActor;
import com.clucky.shippingservice.dto.DomainEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Component
@EnableScheduling
public class ShippingPolicyAudit {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final KafkaTemplate<String, String> kafka;
    private final TransactionTemplate transaction;

    public ShippingPolicyAudit(JdbcTemplate jdbc, ObjectMapper mapper, KafkaTemplate<String, String> kafka,
            PlatformTransactionManager manager) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.kafka = kafka;
        this.transaction = new TransactionTemplate(manager);
    }

    public void record(BigDecimal fee, long version) {
        var actor = CurrentActor.require();
        UUID eventId = UUID.randomUUID();
        String correlation = MDC.get("correlationId");
        if (correlation == null || !correlation.matches("[A-Za-z0-9._-]{1,128}")) correlation = eventId.toString();
        var payload = mapper.createObjectNode().put("actorId", actor.userId()).put("actorRole", actor.role().name())
                .put("action", "SHIPPING_POLICY_UPDATED").put("targetType", "SHIPPING_POLICY").put("targetId", 1);
        payload.putObject("detail").put("fee", fee).put("version", version);
        try {
            var envelope = mapper.writeValueAsString(new DomainEvent(eventId.toString(), correlation, "audit.recorded",
                    "shipping-service", Instant.now(), payload));
            jdbc.update("INSERT INTO shipping_service.audit_outbox(event_id,envelope) VALUES (?,?::jsonb)", eventId, envelope);
        } catch (JsonProcessingException failure) {
            throw new IllegalStateException("Cannot record shipping policy audit", failure);
        }
    }

    @Scheduled(fixedDelay = 5000)
    public void dispatch() {
        try {
            transaction.executeWithoutResult(status -> {
                var pending = jdbc.queryForList("SELECT event_id,envelope::text FROM shipping_service.audit_outbox "
                        + "ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED");
                for (var event : pending) {
                    try {
                        kafka.send("audit.recorded", "SHIPPING_POLICY:1", event.get("envelope").toString()).get(5, TimeUnit.SECONDS);
                    } catch (InterruptedException failure) {
                        Thread.currentThread().interrupt();
                        throw new IllegalStateException("Shipping audit publication pending");
                    } catch (Exception failure) {
                        throw new IllegalStateException("Shipping audit publication pending");
                    }
                    jdbc.update("DELETE FROM shipping_service.audit_outbox WHERE event_id=?", event.get("event_id"));
                }
            });
        } catch (RuntimeException failure) {
            LoggerFactory.getLogger(getClass()).warn("event=shipping_audit_publication_pending");
        }
    }
}
