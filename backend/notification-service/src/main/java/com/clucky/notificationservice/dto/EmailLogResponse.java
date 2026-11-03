package com.clucky.notificationservice.dto;

import java.time.Instant;

public record EmailLogResponse(
        Long id,
        String messageId,
        String eventId,
        String toEmail,
        String subject,
        String template,
        String provider,
        String status,
        Integer retryCount,
        String lastError,
        Instant sentAt,
        Instant createdAt
) {}
