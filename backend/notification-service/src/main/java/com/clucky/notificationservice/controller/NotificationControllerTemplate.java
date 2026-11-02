package com.clucky.notificationservice.controller;

import com.clucky.notificationservice.dto.NotificationResponse;
import com.clucky.notificationservice.dto.NotificationReadResponse;
import com.clucky.notificationservice.dto.NotificationReadAllResponse;
import com.clucky.notificationservice.dto.PageResponse;
import com.clucky.notificationservice.service.NotificationServiceTemplate;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Positive;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

public class NotificationControllerTemplate {
    private final NotificationServiceTemplate service;

    public NotificationControllerTemplate(NotificationServiceTemplate service) {
        this.service = service;
    }

    public PageResponse<NotificationResponse> myNotifications(@Min(0) int page, @Min(1) @Max(200) int size) {
        return service.myNotifications(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    public NotificationReadResponse markRead(@Positive Long id) {
        return service.markRead(id);
    }

    public NotificationReadAllResponse markAllRead() {
        return service.markAllRead();
    }
}
