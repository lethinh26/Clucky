package com.clucky.notificationservice.dto;

import java.time.Instant;

public record NotificationResponse(
        Long id,
        Long userId,
        String title,
        String content,
        String type,
        Long refId,
        Boolean isRead,
        Instant createdAt
) {}
