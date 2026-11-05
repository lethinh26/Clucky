package com.clucky.notificationservice.service;

import com.clucky.notificationservice.dto.NotificationReadAllResponse;
import com.clucky.notificationservice.dto.NotificationReadResponse;
import com.clucky.notificationservice.dto.NotificationResponse;
import com.clucky.notificationservice.dto.PageResponse;
import com.clucky.notificationservice.entity.Notification;
import com.clucky.notificationservice.exception.ApiException;
import com.clucky.notificationservice.exception.ErrorCode;
import com.clucky.notificationservice.mapper.DomainMapper;
import com.clucky.notificationservice.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
public class NotificationService {
    private static final Logger LOG = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    /**
     * Get paginated notifications for the authenticated user.
     */
    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> myNotifications(Long userId, Pageable pageable) {
        Objects.requireNonNull(userId, "userId is required");
        Page<Notification> page = notificationRepository.findByUserId(userId, pageable);
        return PageResponse.from(page.map(DomainMapper::toResponse));
    }

    /**
     * Mark a single notification as read by id and owner userId.
     * Idempotent: if already read, returns isRead=true without changing count.
     * If not found or belongs to another user, throws RESOURCE_NOT_FOUND (404) to avoid leaking data.
     */
    @Transactional
    public NotificationReadResponse markRead(Long id, Long userId) {
        Objects.requireNonNull(id, "id is required");
        Objects.requireNonNull(userId, "userId is required");

        Notification notification = notificationRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        if (!Boolean.TRUE.equals(notification.getIsRead())) {
            notification.setIsRead(true);
            notificationRepository.save(notification);
            LOG.info("event=notification_marked_read id={} userId={}", id, userId);
        }

        return new NotificationReadResponse(id, true);
    }

    /**
     * Mark all unread notifications of the authenticated user as read.
     * Returns updatedCount: number of records actually changed from unread to read.
     */
    @Transactional
    public NotificationReadAllResponse markAllRead(Long userId) {
        Objects.requireNonNull(userId, "userId is required");

        int updatedCount = notificationRepository.markAllAsReadByUserId(userId);
        LOG.info("event=notifications_marked_all_read userId={} updatedCount={}", userId, updatedCount);

        return new NotificationReadAllResponse(updatedCount);
    }
}

