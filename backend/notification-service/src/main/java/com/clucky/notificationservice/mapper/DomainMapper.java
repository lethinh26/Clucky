package com.clucky.notificationservice.mapper;

import com.clucky.notificationservice.dto.*;
import com.clucky.notificationservice.entity.*;

public final class DomainMapper {
    private DomainMapper() {}

    public static NotificationResponse toResponse(Notification entity) {
        return new NotificationResponse(
                entity.getId(),
                entity.getUserId(),
                entity.getTitle(),
                entity.getContent(),
                entity.getType(),
                entity.getRefId(),
                entity.getIsRead(),
                entity.getCreatedAt()
        );
    }

    public static EmailLogResponse toResponse(EmailLog entity) {
        return new EmailLogResponse(
                entity.getId(),
                entity.getMessageId(),
                entity.getEventId(),
                entity.getToEmail(),
                entity.getSubject(),
                entity.getTemplate(),
                entity.getProvider(),
                entity.getStatus(),
                entity.getRetryCount(),
                entity.getLastError(),
                entity.getSentAt(),
                entity.getCreatedAt()
        );
    }

    public static MailTemplateResponse toResponse(MailTemplate entity) {
        return new MailTemplateResponse(
                entity.getId(),
                entity.getTemplateKey(),
                entity.getSubjectTemplate(),
                entity.getBodyTemplate(),
                entity.getIsActive(),
                entity.getUpdatedAt()
        );
    }
}
