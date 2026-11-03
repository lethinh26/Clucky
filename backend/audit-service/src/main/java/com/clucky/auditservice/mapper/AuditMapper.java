package com.clucky.auditservice.mapper;

import com.clucky.auditservice.dto.AuditLogResponse;
import com.clucky.auditservice.entity.AuditLog;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class AuditMapper {
    public AuditLogResponse toResponse(AuditLog entry) {
        return new AuditLogResponse(entry.getId(), entry.getEventId(), entry.getCorrelationId(),
                entry.getSourceService(), entry.getActorId(), entry.getActorRole(), entry.getStoreId(),
                entry.getAction(), entry.getTargetType(), entry.getTargetId(), safeDetail(entry.getDetail()),
                entry.getOccurredAt(), entry.getCreatedAt());
    }

    public JsonNode safeDetail(JsonNode detail) {
        ObjectNode result = JsonNodeFactory.instance.objectNode();
        if (detail == null || !detail.isObject()) { return result; }
        // ponytail: base exposes typed non-PII fields only; extend reviewed domain allowlists with INT-48.
        for (String phase : List.of("before", "after")) {
            JsonNode original = detail.path(phase);
            if (!original.isObject()) { continue; }
            ObjectNode safe = result.putObject(phase);
            for (String field : List.of("storeId", "price", "amount", "quantity")) {
                JsonNode value = original.get(field);
                if (value != null && (value.isNumber() || value.isNull())) { safe.set(field, value); }
            }
            for (String field : List.of("active", "enabled", "available", "isActive", "isLocked", "isAvailable")) {
                JsonNode value = original.get(field);
                if (value != null && (value.isBoolean() || value.isNull())) { safe.set(field, value); }
            }
            JsonNode role = original.get("role");
            if (role != null && (role.isNull() || role.isTextual()
                    && role.asText().matches("CUSTOMER|STAFF|STORE_MANAGER|ADMIN|SHIPPER"))) { safe.set("role", role); }
        }
        return result;
    }
}
