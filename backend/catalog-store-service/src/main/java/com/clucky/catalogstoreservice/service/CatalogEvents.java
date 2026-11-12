package com.clucky.catalogstoreservice.service;

import com.clucky.catalogstoreservice.config.CurrentActor;
import com.clucky.catalogstoreservice.dto.DomainEvent;
import com.clucky.catalogstoreservice.dto.Role;
import com.clucky.catalogstoreservice.exception.ApiException;
import com.clucky.catalogstoreservice.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Component
@EnableScheduling
public class CatalogEvents {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final KafkaTemplate<String, String> kafka;
    private final TransactionTemplate transaction;

    public CatalogEvents(JdbcTemplate jdbc, ObjectMapper mapper, KafkaTemplate<String, String> kafka,
                         PlatformTransactionManager manager) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.kafka = kafka;
        this.transaction = new TransactionTemplate(manager);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void expect(String table, Long id, Long expectedVersion) {
        if (!Set.of("products", "combos", "categories", "stores").contains(table))
            throw new IllegalArgumentException("Unsupported aggregate");
        if (id == null || id <= 0 || expectedVersion == null || expectedVersion < 0 || expectedVersion == Long.MAX_VALUE)
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        if (jdbc.update("UPDATE catalog_service." + table + " SET version=version+1 WHERE id=? AND version=?", id, expectedVersion) != 1)
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void audit(String action, String targetType, Long targetId, Long storeId) {
        var actor = CurrentActor.require();
        if (actor.role() != Role.ADMIN) return;
        var payload = mapper.createObjectNode().put("actorId", actor.userId()).put("actorRole", actor.role().name())
                .put("action", action).put("targetType", targetType).put("targetId", targetId);
        if (storeId != null) payload.put("storeId", storeId);
        payload.set("detail", mapper.valueToTree(Map.of("result", "SUCCESS")));
        enqueue("audit.recorded", targetType + ":" + targetId, payload);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void enqueue(String topic, String key, JsonNode payload) {
        UUID eventId = UUID.randomUUID();
        String correlation = MDC.get("correlationId");
        if (correlation == null || !correlation.matches("[A-Za-z0-9._-]{1,128}")) correlation = UUID.randomUUID().toString();
        try {
            String envelope = mapper.writeValueAsString(new DomainEvent(eventId.toString(), correlation, topic,
                    "catalog-store-service", Instant.now(), payload));
            jdbc.update("INSERT INTO catalog_service.catalog_event_outbox(event_id,topic,partition_key,envelope) VALUES (?,?,?,?::jsonb)",
                    eventId, topic, key, envelope);
        } catch (com.fasterxml.jackson.core.JsonProcessingException failure) {
            throw new IllegalStateException("Cannot record catalog event", failure);
        }
    }

    @Scheduled(fixedDelay = 5000)
    public void dispatch() {
        for (int sent = 0; sent < 20 && !Thread.currentThread().isInterrupted(); sent++) {
            Boolean found = transaction.execute(status -> {
            var pending = jdbc.queryForList("SELECT event_id,topic,partition_key,envelope FROM catalog_service.catalog_event_outbox "
                    + "WHERE published_at IS NULL AND next_attempt_at<=now() ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED");
            if (pending.isEmpty()) return false;
            var row = pending.getFirst();
                try {
                    kafka.send(row.get("topic").toString(), row.get("partition_key").toString(), row.get("envelope").toString()).get(10, TimeUnit.SECONDS);
                } catch (Exception failure) {
                    jdbc.update("UPDATE catalog_service.catalog_event_outbox SET next_attempt_at=now()+interval '30 seconds' WHERE event_id=?", row.get("event_id"));
                    if (failure instanceof InterruptedException) Thread.currentThread().interrupt();
                    return true;
                }
            jdbc.update("UPDATE catalog_service.catalog_event_outbox SET published_at=now() WHERE event_id=?", row.get("event_id"));
            return true;
            });
            if (!Boolean.TRUE.equals(found)) break;
        }
    }
}
