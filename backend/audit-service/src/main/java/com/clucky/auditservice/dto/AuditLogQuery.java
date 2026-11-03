package com.clucky.auditservice.dto;

import jakarta.validation.constraints.*;
import java.time.Instant;
import org.springframework.format.annotation.DateTimeFormat;

public record AuditLogQuery(
        @Positive Long actorId,
        @Pattern(regexp = "STAFF|STORE_MANAGER|ADMIN") String actorRole,
        @Pattern(regexp = "[A-Za-z0-9._-]{1,100}") String sourceService,
        @Pattern(regexp = "[A-Za-z0-9._:-]{1,100}") String action,
        @Pattern(regexp = "[A-Za-z0-9._:-]{1,100}") String targetType,
        @Positive Long targetId,
        @Positive Long storeId,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
        @Min(0) Integer page,
        @Min(1) @Max(200) Integer size) {}
