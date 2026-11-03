package com.clucky.notificationservice.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "mail_templates", schema = "notification_service")
public class MailTemplate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "template_key", nullable = false, length = 100, unique = true)
    private String templateKey;

    @Column(name = "subject_template", nullable = false, columnDefinition = "text")
    private String subjectTemplate;

    @Column(name = "body_template", nullable = false, columnDefinition = "text")
    private String bodyTemplate;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTemplateKey() { return templateKey; }
    public void setTemplateKey(String templateKey) { this.templateKey = templateKey; }

    public String getSubjectTemplate() { return subjectTemplate; }
    public void setSubjectTemplate(String subjectTemplate) { this.subjectTemplate = subjectTemplate; }

    public String getBodyTemplate() { return bodyTemplate; }
    public void setBodyTemplate(String bodyTemplate) { this.bodyTemplate = bodyTemplate; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    @PreUpdate
    protected void touch() { updatedAt = Instant.now(); }
}
