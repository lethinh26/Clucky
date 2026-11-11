package com.clucky.identityservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IdentityAuditService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public IdentityAuditService(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(long actorId, String role, Long storeId, String sessionId, String action,
            long targetId, String targetType, Map<String, Object> detail, String correlation) {
        String correlationId = correlation != null ? correlation : MDC.get("correlationId");
        if (correlationId == null || !correlationId.matches("[A-Za-z0-9._-]{1,128}")) {
            correlationId = UUID.randomUUID().toString();
        }
        var payload = mapper.createObjectNode().put("actorId", actorId).put("actorRole", role)
                .put("action", action).put("targetId", targetId).put("targetType", targetType);
        if (storeId != null) payload.put("storeId", storeId);
        com.fasterxml.jackson.databind.node.ObjectNode details = mapper.valueToTree(detail);
        payload.set("detail", details);
        if (sessionId != null) details.put("sessionId", sessionId);
        jdbc.update("INSERT INTO identity_service.branch_outbox(event_id,correlation_id,payload) VALUES (?,?,?::jsonb)",
                UUID.randomUUID(), correlationId, payload.toString());
    }
}
