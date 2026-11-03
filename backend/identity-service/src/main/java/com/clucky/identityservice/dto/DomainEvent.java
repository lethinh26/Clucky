package com.clucky.identityservice.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import java.time.Instant;

public record DomainEvent(@NotBlank @Size(max = 160) String eventId,
        @NotBlank @Pattern(regexp = "[A-Za-z0-9._-]{1,128}") String correlationId,
        @NotBlank @Size(max = 100) String eventType,
        @NotBlank @Size(max = 100) String sourceService, @NotNull Instant occurredAt, @NotNull JsonNode payload) {
    @Override
    public String toString() { return "DomainEvent[payload redacted]"; }
}
