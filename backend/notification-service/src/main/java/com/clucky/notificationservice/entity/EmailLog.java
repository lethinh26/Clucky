package com.clucky.notificationservice.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "email_logs", schema = "notification_service")
public class EmailLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "message_id", nullable = false, length = 160, unique = true)
    private String messageId;

    @Column(name = "event_id", nullable = true, length = 160)
    private String eventId;

    @Column(name = "to_email", nullable = false, length = 255)
    private String toEmail;

    @Column(name = "subject", nullable = false, length = 255)
    private String subject;

    @Column(name = "template", nullable = false, length = 100)
    private String template;

    @Column(name = "provider", nullable = false, length = 30)
    private String provider = "GMAIL_SMTP";

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "retry_count", nullable = false)
    private Integer retryCount = 0;

    @Column(name = "last_error", nullable = true, columnDefinition = "text")
    private String lastError;

    @Column(name = "sent_at", nullable = true)
    private Instant sentAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getMessageId() { return messageId; }
    public void setMessageId(String messageId) { this.messageId = messageId; }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public String getToEmail() { return toEmail; }
    public void setToEmail(String toEmail) { this.toEmail = toEmail; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getTemplate() { return template; }
    public void setTemplate(String template) { this.template = template; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getRetryCount() { return retryCount; }
    public void setRetryCount(Integer retryCount) { this.retryCount = retryCount; }

    public String getLastError() { return lastError; }
    public void setLastError(String lastError) { this.lastError = lastError; }

    public Instant getSentAt() { return sentAt; }
    public void setSentAt(Instant sentAt) { this.sentAt = sentAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
