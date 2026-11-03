package com.clucky.notificationservice.service;

import com.clucky.notificationservice.dto.NotificationResponse;
import com.clucky.notificationservice.dto.NotificationReadResponse;
import com.clucky.notificationservice.dto.NotificationReadAllResponse;
import com.clucky.notificationservice.dto.PageResponse;
import org.springframework.data.domain.Pageable;
import com.clucky.notificationservice.repository.NotificationRepository;
import com.clucky.notificationservice.exception.ApiException;
import com.clucky.notificationservice.exception.ErrorCode;

public class NotificationServiceTemplate {
    protected final NotificationRepository repository;

    public NotificationServiceTemplate(NotificationRepository repository) {
        this.repository = repository;
    }

    public PageResponse<NotificationResponse> myNotifications(Pageable pageable) {
        throw new ApiException(ErrorCode.NOT_IMPLEMENTED);
    }

    public NotificationReadResponse markRead(Long id) {
        throw new ApiException(ErrorCode.NOT_IMPLEMENTED);
    }

    public NotificationReadAllResponse markAllRead() {
        throw new ApiException(ErrorCode.NOT_IMPLEMENTED);
    }
}
