package com.clucky.notificationservice.service;

import com.clucky.notificationservice.config.MailSenderProperties;
import com.clucky.notificationservice.entity.EmailLog;
import com.clucky.notificationservice.entity.MailTemplate;
import com.clucky.notificationservice.logging.SafeLog;
import com.clucky.notificationservice.repository.EmailLogRepository;
import com.clucky.notificationservice.repository.MailTemplateRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

@Service
public class EmailSenderService {
    private static final Logger LOG = LoggerFactory.getLogger(EmailSenderService.class);

    private final MailSenderProperties properties;
    private final JavaMailSender mailSender;
    private final EmailLogRepository emailLogRepository;
    private final MailTemplateRepository mailTemplateRepository;
    private final ObjectMapper objectMapper;

    public EmailSenderService(
            MailSenderProperties properties,
            JavaMailSender mailSender,
            EmailLogRepository emailLogRepository,
            MailTemplateRepository mailTemplateRepository,
            ObjectMapper objectMapper
    ) {
        this.properties = properties;
        this.mailSender = mailSender;
        this.emailLogRepository = emailLogRepository;
        this.mailTemplateRepository = mailTemplateRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Render template and send email idempotently, updating status in email_logs.
     * Prevents duplicate deliveries by checking messageId.
     */
    @Transactional
    public void processEmailIntent(
            String messageId,
            String eventId,
            String correlationId,
            String toEmail,
            String templateKey,
            Map<String, String> variables
    ) {
        if (messageId == null || toEmail == null || toEmail.isBlank()) {
            LOG.warn("event=email_dispatch_skipped_invalid_input messageId={} toEmail={}", messageId, toEmail);
            return;
        }

        // Idempotency check: if messageId already exists and was SENT, skip
        Optional<EmailLog> existingOpt = emailLogRepository.findByMessageId(messageId);
        if (existingOpt.isPresent()) {
            EmailLog existing = existingOpt.get();
            if ("SENT".equals(existing.getStatus())) {
                LOG.info("event=email_replay_detected_already_sent messageId={}", messageId);
                return;
            }
            if ("FAILED".equals(existing.getStatus()) && existing.getRetryCount() >= properties.maxRetries()) {
                LOG.info("event=email_replay_detected_terminal_failed messageId={}", messageId);
                return;
            }
        }

        EmailLog emailLog = existingOpt.orElseGet(EmailLog::new);
        emailLog.setMessageId(messageId);
        emailLog.setEventId(eventId);
        emailLog.setCorrelationId(correlationId);
        emailLog.setToEmail(toEmail);
        emailLog.setTemplate(templateKey);
        emailLog.setProvider("GMAIL_SMTP");

        String variablesJson = "";
        try {
            variablesJson = objectMapper.writeValueAsString(variables);
        } catch (Exception ignored) {}
        emailLog.setVariables(variablesJson);

        // Render template
        RenderedContent rendered = render(templateKey, variables);
        emailLog.setSubject(rendered.subject());

        if (!properties.enabled()) {
            emailLog.setStatus("QUEUED");
            emailLogRepository.save(emailLog);
            LOG.info("event=email_queued_sender_disabled messageId={} recipient={}", messageId, SafeLog.token(toEmail));
            return;
        }

        // Attempt SMTP sending
        emailLog.setStatus("SENDING");
        emailLogRepository.save(emailLog);

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "UTF-8");
            String fromName = properties.fromName() != null ? properties.fromName() : "Clucky Fast Food";
            helper.setFrom(properties.username(), fromName);
            helper.setTo(toEmail);
            helper.setSubject(rendered.subject());
            helper.setText(rendered.body(), false);

            mailSender.send(mimeMessage);

            emailLog.setStatus("SENT");
            emailLog.setSentAt(Instant.now());
            emailLog.setLastError(null);
            emailLogRepository.save(emailLog);

            LOG.info("event=email_sent_success messageId={} template={} recipient={}",
                    messageId, templateKey, SafeLog.token(toEmail));
        } catch (Exception ex) {
            int retries = emailLog.getRetryCount() == null ? 1 : emailLog.getRetryCount() + 1;
            emailLog.setRetryCount(retries);
            String safeError = sanitizeError(ex.getMessage());
            emailLog.setLastError(safeError);

            if (retries >= properties.maxRetries()) {
                emailLog.setStatus("FAILED");
            } else {
                emailLog.setStatus("QUEUED");
            }
            emailLogRepository.save(emailLog);

            LOG.warn("event=email_send_attempt_failed messageId={} attempt={} status={} error={}",
                    messageId, retries, emailLog.getStatus(), safeError);
        }
    }

    private RenderedContent render(String templateKey, Map<String, String> variables) {
        Optional<MailTemplate> templateOpt = mailTemplateRepository.findByTemplateKeyAndIsActiveTrue(templateKey);
        String subject;
        String body;

        if (templateOpt.isPresent()) {
            MailTemplate template = templateOpt.get();
            subject = replacePlaceholders(template.getSubjectTemplate(), variables);
            body = replacePlaceholders(template.getBodyTemplate(), variables);
        } else {
            subject = "Clucky — Thông báo đơn hàng (" + templateKey + ")";
            body = "Xin chào, bạn có một thông báo mới từ hệ thống Clucky.";
        }

        return new RenderedContent(subject, body);
    }

    private String replacePlaceholders(String template, Map<String, String> variables) {
        if (template == null || variables == null || variables.isEmpty()) {
            return template != null ? template : "";
        }
        String result = template;
        for (Map.Entry<String, String> entry : variables.entrySet()) {
            if (entry.getKey() != null && entry.getValue() != null) {
                result = result.replace("{{" + entry.getKey() + "}}", entry.getValue());
            }
        }
        return result;
    }

    private String sanitizeError(String message) {
        if (message == null || message.isBlank()) {
            return "SMTP dispatch error";
        }
        String sanitized = message.replaceAll("(?i)(password|secret|key|token)=[^\\s,&]+", "$1=***");
        if (sanitized.length() > 500) {
            sanitized = sanitized.substring(0, 500) + "...";
        }
        return sanitized;
    }

    private record RenderedContent(String subject, String body) {}
}

