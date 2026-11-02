package com.clucky.paymentservice.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;

public record WebhookLogResponse(
        Long id,
        String provider,
        Boolean signatureValid,
        Boolean processed,
        Instant createdAt
) {}
