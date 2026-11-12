package com.clucky.promotionloyaltyservice.service;

import com.clucky.promotionloyaltyservice.dto.DomainEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Component
@EnableScheduling
public class VoucherAuditOutbox {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final KafkaTemplate<String, String> kafka;
    private final TransactionTemplate transaction;

    public VoucherAuditOutbox(JdbcTemplate jdbc, ObjectMapper mapper, KafkaTemplate<String, String> kafka,
            org.springframework.transaction.PlatformTransactionManager manager) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.kafka = kafka;
        this.transaction = new TransactionTemplate(manager);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(long actorId, String actorRole, Long storeId, String action, String targetType,
            long targetId, Object before, Object after) {
        String eventId = UUID.randomUUID().toString();
        String correlationId = MDC.get("correlationId");
        if (correlationId == null || !correlationId.matches("[A-Za-z0-9._-]{1,128}")) {
            correlationId = UUID.randomUUID().toString();
        }
        var payload = mapper.createObjectNode().put("actorId", actorId).put("actorRole", actorRole)
                .put("storeId", storeId).put("action", action).put("targetType", targetType).put("targetId", targetId);
        payload.set("detail", mapper.valueToTree(Map.of("before", before, "after", after)));
        DomainEvent event = new DomainEvent(eventId, correlationId, "audit.recorded",
                "promotion-loyalty-service", Instant.now(), payload);
        try {
            jdbc.update("INSERT INTO promotion_service.audit_outbox (event_id, event) VALUES (?, CAST(? AS jsonb))",
                    eventId, mapper.writeValueAsString(event));
        } catch (JsonProcessingException failure) {
            throw new IllegalStateException("Audit serialization failed");
        }
    }

    @Scheduled(fixedDelay = 5000)
    public void publish() {
        try {
            transaction.executeWithoutResult(status -> {
                var events = jdbc.queryForList("SELECT event_id,event::text FROM promotion_service.audit_outbox "
                        + "WHERE NOT published ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED");
                for (var event : events) {
                    try {
                        kafka.send("audit.recorded", event.get("event_id").toString(), (String) event.get("event")).get(5, TimeUnit.SECONDS);
                    } catch (InterruptedException failure) {
                        Thread.currentThread().interrupt();
                        throw new IllegalStateException("Audit publication pending");
                    } catch (Exception failure) { throw new IllegalStateException("Audit publication pending"); }
                    jdbc.update("UPDATE promotion_service.audit_outbox SET published=TRUE WHERE event_id=?", event.get("event_id"));
                }
            });
        } catch (RuntimeException failure) {
            org.slf4j.LoggerFactory.getLogger(getClass()).warn("event=voucher_audit_publication_pending");
        }
    }
}
