package com.clucky.reviewreportservice.service;

import com.clucky.reviewreportservice.config.CurrentActor;
import com.clucky.reviewreportservice.dto.DomainEvent;
import com.clucky.reviewreportservice.exception.ApiException;
import com.clucky.reviewreportservice.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Component
public class ReviewAuditOutbox {
    // ponytail: durable BE-41 handoff only; Kafka dispatch and idempotent Audit ingestion belong to INT-48.
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public ReviewAuditOutbox(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(CurrentActor actor, Long storeId, String action, Long reviewId,
            Map<String, Object> before, Map<String, Object> after) {
        String eventId = UUID.randomUUID().toString();
        String correlationId = MDC.get("correlationId");
        if (correlationId == null || !correlationId.matches("[A-Za-z0-9._-]{1,128}")) {
            correlationId = UUID.randomUUID().toString();
        }
        var payload = mapper.valueToTree(Map.of("actorId", actor.userId(), "actorRole", actor.role().name(),
                "storeId", storeId, "action", action, "targetType", "REVIEW", "targetId", reviewId,
                "before", before, "after", after));
        DomainEvent event = new DomainEvent(eventId, correlationId, "audit.recorded",
                "review-report-service", Instant.now(), payload);
        try {
            jdbc.update("INSERT INTO review_report_service.audit_outbox (event_id, event) VALUES (?, CAST(? AS jsonb))",
                    eventId, mapper.writeValueAsString(event));
        } catch (JsonProcessingException failure) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR);
        }
    }
}
