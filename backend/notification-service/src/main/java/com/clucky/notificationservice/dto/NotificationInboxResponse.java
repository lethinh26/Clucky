package com.clucky.notificationservice.dto;

import java.util.List;

public record NotificationInboxResponse(List<NotificationResponse> content, int page, int size,
        long totalElements, int totalPages, long unreadCount) {
    public NotificationInboxResponse { content = List.copyOf(content); }
}
