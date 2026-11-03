package com.clucky.auditservice.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;

public record AuditLogResponse(Long id, String eventId, String correlationId, String sourceService,
        Long actorId, String actorRole, Long storeId, String action, String targetType, Long targetId,
        JsonNode detail, Instant occurredAt, Instant createdAt) {}
