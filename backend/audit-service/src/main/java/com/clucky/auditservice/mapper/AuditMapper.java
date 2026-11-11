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
        copySafeFields(detail, result);
        for (String phase : List.of("before", "after")) {
            JsonNode original = detail.path(phase);
            if (!original.isObject()) { continue; }
            ObjectNode safe = result.putObject(phase);
            copySafeFields(original, safe);
        }
        return result;
    }

    private void copySafeFields(JsonNode original, ObjectNode safe) {
            JsonNode session = original.get("sessionId");
            if (session != null && session.isTextual() && session.asText().matches("[A-Za-z0-9._:-]{1,160}")) {
                safe.set("sessionId", session);
            }
            if ("SHARED_ACCOUNT_NOT_PERSON".equals(original.path("identity").asText())) {
                safe.put("identity", "SHARED_ACCOUNT_NOT_PERSON");
            }
            for (String field : List.of("storeId", "price", "amount", "quantity", "version", "replyId", "previousAccountId",
                    "bankAccountId", "previousBankAccountId", "orderId", "attemptCount", "bankDetailsVersion",
                    "fee", "value", "totalLimit", "usedCount", "reservedCount", "minOrderAmount", "maxDiscount",
                    "spendPerPoint", "pointValue", "silverThreshold", "goldThreshold", "silverDiscount", "goldDiscount")) {
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
            for (String field : List.of("status", "beforeStatus", "afterStatus")) {
                JsonNode status = original.get(field);
                if (status != null && status.isTextual() && status.asText().matches(
                        "VISIBLE|HIDDEN|DELETED|PENDING_PAYMENT|CONFIRMED|PREPARING|READY|SHIPPING|COMPLETED|CANCELLED|EXPIRED|PAID|REFUNDED|ACTIVE|LOCKED|DISABLED|EXHAUSTED|UPCOMING")) {
                    safe.set(field, status);
                }
            }
            JsonNode reason = original.get("reason");
            if (reason != null && reason.isTextual() && reason.asText().length() <= 500) {
                safe.set("reason", reason);
            }
            JsonNode result = original.get("result");
            if (result != null && result.isTextual() && result.asText().matches("SUCCESS|FAILED|DENIED")) {
                safe.set("result", result);
            }
    }
}
