package com.clucky.notificationservice.service;

import com.clucky.notificationservice.config.CurrentActor;
import com.clucky.notificationservice.dto.NotificationResponse;
import com.clucky.notificationservice.dto.NotificationReadResponse;
import com.clucky.notificationservice.dto.NotificationReadAllResponse;
import com.clucky.notificationservice.dto.PageResponse;
import com.clucky.notificationservice.entity.Notification;
import com.clucky.notificationservice.mapper.DomainMapper;
import org.springframework.data.domain.Page;
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
        Long userId = CurrentActor.require().userId();
        Page<Notification> page = repository.findByUserId(userId, pageable);
        return PageResponse.from(page.map(DomainMapper::toResponse));
    }

    public NotificationReadResponse markRead(Long id) {
        Long userId = CurrentActor.require().userId();
        Notification notification = repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        if (!Boolean.TRUE.equals(notification.getIsRead())) {
            notification.setIsRead(true);
            repository.save(notification);
        }
        return new NotificationReadResponse(id, true);
    }

    public NotificationReadAllResponse markAllRead() {
        Long userId = CurrentActor.require().userId();
        int count = repository.markAllAsReadByUserId(userId);
        return new NotificationReadAllResponse(count);
    }
}
