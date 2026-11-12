package com.clucky.auditservice;

import com.clucky.auditservice.config.CurrentActor;
import com.clucky.auditservice.dto.AuditLogQuery;
import com.clucky.auditservice.dto.Role;
import com.clucky.auditservice.mapper.AuditMapper;
import com.clucky.auditservice.service.AuditLogService;
import com.clucky.auditservice.service.AccountAuditConsumer;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import org.springframework.security.access.AccessDeniedException;

public final class AuditSelfCheck {
    public static void main(String[] args) throws Exception {
        CurrentActor manager = new CurrentActor(1L, Role.STORE_MANAGER, 11L);
        require(AuditLogService.effectiveStore(manager, query(null, null)) == 11L, "Manager scope not enforced");
        denied(() -> AuditLogService.effectiveStore(manager, query(12L, null)));
        denied(() -> AuditLogService.effectiveStore(manager, query(null, "ADMIN")));
        denied(() -> AuditLogService.effectiveStore(new CurrentActor(2L, Role.STAFF, 11L), query(null, null)));
        denied(() -> AuditLogService.effectiveStore(new CurrentActor(3L, Role.CUSTOMER, null), query(null, null)));
        require(AuditLogService.effectiveStore(new CurrentActor(4L, Role.ADMIN, null), query(null, null)) == null,
                "Admin global query restricted");
        ObjectMapper mapper = new ObjectMapper();
        String safe = new AuditMapper().safeDetail(mapper.readTree("""
                {"before":{"password":"secret","amount":100,"nested":{"token":"secret"}},
                 "after":{"role":"STAFF","amount":"secret","isLocked":true,"authorization":"secret"},
                 "body":"secret","otp":"secret"}
                """)).toString();
        require(!safe.contains("secret") && safe.contains("100") && safe.contains("STAFF"), "Unsafe audit detail or lost typed fields");
        String policy = new AuditMapper().safeDetail(mapper.readTree("{\"fee\":25000,\"version\":2,\"beforeStatus\":\"ACTIVE\",\"afterStatus\":\"LOCKED\",\"reason\":\"Account investigation\",\"apiKey\":\"secret\"}")).toString();
        require(policy.contains("25000") && policy.contains("LOCKED") && policy.contains("Account investigation")
                && !policy.contains("secret"), "Policy/status audit lost or secrets exposed");
        require(AccountAuditConsumer.ALLOWED_SOURCES.containsAll(java.util.List.of("shipping-service", "catalog-store-service",
                "promotion-loyalty-service", "review-report-service")), "Admin audit domain missing");
        String provenance = new AuditMapper().safeDetail(mapper.readTree("{\"sessionId\":\"session-123\",\"identity\":\"SHARED_ACCOUNT_NOT_PERSON\",\"accessToken\":\"secret\"}")).toString();
        require(provenance.contains("session-123") && provenance.contains("SHARED_ACCOUNT_NOT_PERSON") && !provenance.contains("secret"),
                "Shared-account session provenance lost or bearer credential exposed");
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            require(!factory.getValidator().validate(query(-1L, "UNKNOWN")).isEmpty(), "Invalid query accepted");
        }
        System.out.println("Audit self-check passed");
    }

    private static AuditLogQuery query(Long storeId, String role) {
        return new AuditLogQuery(null, role, null, null, null, null, storeId, null, null, 0, 20);
    }

    private static void denied(Runnable action) {
        try { action.run(); }
        catch (AccessDeniedException expected) { return; }
        throw new AssertionError("Unauthorized audit access accepted");
    }

    private static void require(boolean condition, String message) {
        if (!condition) { throw new AssertionError(message); }
    }
}
