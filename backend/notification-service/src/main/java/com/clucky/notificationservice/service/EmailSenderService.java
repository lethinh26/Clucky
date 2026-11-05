package com.clucky.notificationservice.service;

import com.clucky.notificationservice.config.MailSenderProperties;
import com.clucky.notificationservice.entity.EmailLog;
import com.clucky.notificationservice.repository.EmailLogRepository;
import com.clucky.notificationservice.repository.MailTemplateRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Map;

@Service
public class EmailSenderService {
    private final MailSenderProperties properties;
    private final JavaMailSender mailSender;
    private final EmailLogRepository emailLogs;
    private final MailTemplateRepository templates;
    private final ObjectMapper mapper;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;

    public EmailSenderService(MailSenderProperties properties, JavaMailSender mailSender,
            EmailLogRepository emailLogs, MailTemplateRepository templates, ObjectMapper mapper,
            JdbcTemplate jdbc, PlatformTransactionManager transactionManager) {
        this.properties = properties;
        this.mailSender = mailSender;
        this.emailLogs = emailLogs;
        this.templates = templates;
        this.mapper = mapper;
        this.jdbc = jdbc;
        this.transactions = new TransactionTemplate(transactionManager);
    }

    @Transactional
    public void processEmailIntent(String messageId, String eventId, String correlationId,
            String toEmail, String templateKey, Map<String, String> variables) {
        if (messageId == null || messageId.isBlank() || messageId.length() > 160
                || toEmail == null || toEmail.isBlank() || toEmail.length() > 255
                || templateKey == null || templateKey.isBlank() || templateKey.length() > 100) {
            throw new IllegalArgumentException("Invalid email intent");
        }
        String serialized;
        try {
            serialized = mapper.writeValueAsString(variables);
        } catch (Exception failure) {
            throw new IllegalArgumentException("Invalid email variables");
        }
        jdbc.update("""
                INSERT INTO notification_service.email_logs
                    (message_id, event_id, correlation_id, to_email, subject, template, provider, status, variables)
                VALUES (?, ?, ?, ?, '', ?, 'GMAIL_SMTP', 'QUEUED', ?)
                ON CONFLICT (message_id) DO NOTHING
                """, messageId, eventId, correlationId, toEmail, templateKey, serialized);
    }

    @Scheduled(fixedDelayString = "${mail-sender.poll-interval-ms:1000}")
    public void dispatchNext() {
        if (!properties.enabled()) return;
        jdbc.update("""
                UPDATE notification_service.email_logs SET status = 'FAILED', last_error = 'SMTP_OUTCOME_UNKNOWN'
                WHERE status = 'SENDING' AND claimed_at < NOW() - INTERVAL '5 minutes'
                """);
        EmailLog email = transactions.execute(status -> {
            var ids = jdbc.queryForList("""
                    WITH candidate AS (
                        SELECT id FROM notification_service.email_logs
                        WHERE status = 'QUEUED' AND next_attempt_at <= NOW()
                        ORDER BY next_attempt_at, id FOR UPDATE SKIP LOCKED LIMIT 1
                    )
                    UPDATE notification_service.email_logs SET status = 'SENDING', claimed_at = NOW()
                    WHERE id IN (SELECT id FROM candidate) RETURNING id
                    """, Long.class);
            return ids.isEmpty() ? null : emailLogs.findById(ids.getFirst()).orElseThrow();
        });
        if (email == null) return;

        String subject;
        String body;
        try {
            var template = templates.findByTemplateKeyAndIsActiveTrue(email.getTemplate()).orElseThrow();
            Map<String, String> variables = mapper.readValue(email.getVariables(), new TypeReference<>() {});
            subject = replacePlaceholders(template.getSubjectTemplate(), variables);
            body = replacePlaceholders(template.getBodyTemplate(), variables);
            if (subject.length() > 255 || subject.contains("\r") || subject.contains("\n")
                    || subject.contains("{{") || body.contains("{{")) {
                throw new IllegalArgumentException("Invalid template variables");
            }
        } catch (Exception failure) {
            jdbc.update("UPDATE notification_service.email_logs SET status = 'FAILED', last_error = 'INVALID_TEMPLATE' WHERE id = ? AND status = 'SENDING'", email.getId());
            return;
        }

        try {
            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(properties.username(), properties.fromName());
            helper.setTo(email.getToEmail());
            helper.setSubject(subject);
            helper.setText(body, false);
            mailSender.send(message);
        } catch (Exception failure) {
            boolean safeToRetry = false;
            for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
                if (cause instanceof java.net.ConnectException || cause instanceof java.net.UnknownHostException) {
                    safeToRetry = true;
                    break;
                }
            }
            int retries = email.getRetryCount() + 1;
            String status = safeToRetry && retries < properties.maxRetries() ? "QUEUED" : "FAILED";
            jdbc.update("""
                    UPDATE notification_service.email_logs
                    SET status = ?, retry_count = ?, last_error = ?,
                        next_attempt_at = NOW() + (? * INTERVAL '1 second')
                    WHERE id = ? AND status = 'SENDING'
                    """, status, retries, safeToRetry ? "SMTP_CONNECT_FAILED" : "SMTP_OUTCOME_UNKNOWN",
                    Math.min(300L, 5L << Math.min(retries, 6)), email.getId());
            return;
        }
        jdbc.update("""
                UPDATE notification_service.email_logs SET status = 'SENT', sent_at = NOW(), subject = ?, last_error = NULL
                WHERE id = ? AND status = 'SENDING'
                """, subject, email.getId());
    }

    private String replacePlaceholders(String template, Map<String, String> variables) {
        if (template == null || variables == null) throw new IllegalArgumentException("Missing template data");
        String result = template;
        for (var entry : variables.entrySet()) {
            if (entry.getKey() != null && entry.getValue() != null) {
                result = result.replace("{{" + entry.getKey() + "}}", entry.getValue());
            }
        }
        return result;
    }
}
