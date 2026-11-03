package com.clucky.notificationservice.dto;

import java.time.Instant;

public record MailTemplateResponse(
        Long id,
        String templateKey,
        String subjectTemplate,
        String bodyTemplate,
        Boolean isActive,
        Instant updatedAt
) {}
