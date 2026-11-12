package com.clucky.notificationservice.service;

import com.clucky.notificationservice.config.MailSenderProperties;
import com.clucky.notificationservice.repository.MailTemplateRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.mail.internet.InternetAddress;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class EmailSenderService {
    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{([A-Za-z0-9_]+)}}");
    private final MailSenderProperties properties;
    private final JavaMailSender mailSender;
    private final MailTemplateRepository templates;
    private final ObjectMapper mapper;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final TransactionTemplate conflictTransaction;
    private final EmailPayloadCodec codec;
    private final MeterRegistry metrics;
    private final EmailTemplateRenderer renderer;

    public EmailSenderService(MailSenderProperties properties, JavaMailSender mailSender,
            MailTemplateRepository templates, ObjectMapper mapper, JdbcTemplate jdbc,
            PlatformTransactionManager manager, EmailPayloadCodec codec, MeterRegistry metrics, EmailTemplateRenderer renderer) {
        this.properties = properties;
        this.mailSender = mailSender;
        this.templates = templates;
        this.mapper = mapper;
        this.jdbc = jdbc;
        this.codec = codec;
        this.metrics = metrics;
        this.renderer = renderer;
        transactions = new TransactionTemplate(manager);
        conflictTransaction = new TransactionTemplate(manager);
        conflictTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public void processEmailIntent(String messageId, String eventId, String correlationId, String recipient,
            String templateKey, Map<String, String> variables, Long storeId, Instant declaredExpiry) {
        validate(messageId, eventId, correlationId, recipient, templateKey, variables, storeId);
        String effectiveTemplate = EmailTemplateRenderer.templateKey(templateKey, variables);
        boolean sensitive = templateKey.toLowerCase(java.util.Locale.ROOT).contains("otp")
                || "branch-security".equals(templateKey) || variables.containsKey("otp");
        if (sensitive && (declaredExpiry == null || declaredExpiry.isAfter(Instant.now().plusSeconds(3600)))) {
            throw new IllegalArgumentException("Security email requires an absolute bounded expiry");
        }
        Map<String, Object> command = new LinkedHashMap<>();
        command.put("recipient", recipient);
        command.put("template", templateKey);
        command.put("variables", new TreeMap<>(variables));
        command.put("storeId", sensitive ? null : storeId);
        command.put("expiresAt", declaredExpiry == null ? null : declaredExpiry.toString());
        String fingerprint = codec.fingerprint(json(command));
        transactions.executeWithoutResult(transaction -> {
            Instant expiry = declaredExpiry == null ? Instant.now().plusSeconds(properties.retentionHours() * 3600L) : declaredExpiry;
            int inserted = jdbc.update("""
                    INSERT INTO notification_service.email_logs
                    (message_id,event_id,correlation_id,to_email,subject,template,status,command_hash,store_id,sensitive,expires_at)
                    VALUES (?,?,?,?,'',?,'QUEUED',?,?,?,?) ON CONFLICT (message_id) DO NOTHING
                    """, messageId, eventId, correlationId, recipient, effectiveTemplate, fingerprint,
                    sensitive ? null : storeId, sensitive, Timestamp.from(expiry));
            var delivery = jdbc.queryForMap("SELECT * FROM notification_service.email_logs WHERE message_id=? FOR UPDATE", messageId);
            if (inserted == 0) {
                if (!fingerprint.equals(delivery.get("command_hash"))) {
                    conflictTransaction.executeWithoutResult(ignored -> jdbc.update("""
                            INSERT INTO notification_service.email_command_conflicts(message_id,command_hash)
                            VALUES (?,?) ON CONFLICT DO NOTHING
                            """, messageId, fingerprint));
                    metrics.counter("clucky.email.command.conflicts").increment();
                    throw new IllegalArgumentException("Email command identity conflict");
                }
                return;
            }
            if (!expiry.isAfter(Instant.now())) {
                terminal(delivery, "EXPIRED", "EMAIL_EXPIRED");
                return;
            }
            Map<String, String> content;
            String displaySubject;
            try {
                var template = templates.findByTemplateKeyAndIsActiveTrue(effectiveTemplate).orElseThrow();
                content = renderer.render(effectiveTemplate, template.getSubjectTemplate(), template.getBodyTemplate(),
                        variables, messageId, expiry);
                displaySubject = sensitive ? "Clucky — Account verification"
                        : PLACEHOLDER.matcher(template.getSubjectTemplate()).replaceAll("(…)");
            } catch (Exception invalidTemplate) {
                terminal(delivery, "FAILED", "INVALID_TEMPLATE");
                return;
            }
            String snapshot = codec.encrypt(messageId, json(content));
            jdbc.update("UPDATE notification_service.email_logs SET subject=?,variables=?,snapshot_version=1 WHERE id=?",
                    displaySubject, snapshot, delivery.get("id"));
        });
    }

    @Scheduled(fixedDelayString = "${mail-sender.poll-interval-ms}")
    public void dispatchNext() {
        maintain();
        if (!properties.enabled()) return;
        var delivery = transactions.execute(transaction -> {
            var candidates = jdbc.queryForList("""
                    SELECT * FROM notification_service.email_logs
                    WHERE status='QUEUED' AND snapshot_version=1 AND expires_at>now() AND next_attempt_at<=now()
                    ORDER BY next_attempt_at,id LIMIT 1 FOR UPDATE SKIP LOCKED
                    """);
            if (candidates.isEmpty()) return null;
            var row = candidates.getFirst();
            UUID token = UUID.randomUUID();
            jdbc.update("""
                    UPDATE notification_service.email_logs SET status='SENDING',claim_token=?,claimed_at=now(),
                    lease_until=now()+(? * interval '1 second'),attempt_count=attempt_count+1,cycle_attempts=cycle_attempts+1
                    WHERE id=?
                    """, token, properties.leaseSeconds(), row.get("id"));
            jdbc.update("""
                    INSERT INTO notification_service.email_attempts(id,delivery_id,attempt_number,generation)
                    VALUES (?,?,?,?)
                    """, token, row.get("id"), number(row, "attempt_count") + 1, row.get("generation"));
            return jdbc.queryForMap("SELECT * FROM notification_service.email_logs WHERE id=?", row.get("id"));
        });
        if (delivery == null) return;
        var saved = MDC.getCopyOfContextMap();
        try {
            MDC.put("correlationId", String.valueOf(delivery.get("correlation_id")));
            MDC.put("eventId", String.valueOf(delivery.get("event_id")));
            MDC.put("messageId", String.valueOf(delivery.get("message_id")));
            String outcome;
            jakarta.mail.internet.MimeMessage message;
            try {
                var content = mapper.readTree(codec.decrypt((String) delivery.get("message_id"), (String) delivery.get("variables")));
                message = mailSender.createMimeMessage();
                boolean html = content.hasNonNull("html");
                var helper = new MimeMessageHelper(message, html, "UTF-8");
                helper.setFrom(properties.username(), properties.fromName());
                helper.setTo((String) delivery.get("to_email"));
                helper.setSubject(content.path("subject").asText());
                if (html) {
                    helper.setText(content.path("body").asText(), content.path("html").asText());
                    helper.addInline("clucky-logo-v1", new org.springframework.core.io.ClassPathResource("mail/logo_primary.png"), "image/png");
                } else {
                    helper.setText(content.path("body").asText(), false);
                }
            } catch (Exception unavailable) {
                finish(delivery, "SNAPSHOT_UNAVAILABLE");
                return;
            }
            if (!((Timestamp) delivery.get("expires_at")).toInstant().isAfter(Instant.now())) {
                finish(delivery, "EMAIL_EXPIRED");
                return;
            }
            if (!Boolean.TRUE.equals(jdbc.queryForObject("""
                    SELECT EXISTS(SELECT 1 FROM notification_service.email_logs
                    WHERE id=? AND claim_token=? AND status='SENDING' AND lease_until>now() AND expires_at>now())
                    """, Boolean.class, delivery.get("id"), delivery.get("claim_token")))) return;
            try {
                mailSender.send(message);
                outcome = "SENT";
            } catch (Exception failure) {
                outcome = classify(failure);
            }
            finish(delivery, outcome);
        } finally {
            if (saved == null) MDC.clear(); else MDC.setContextMap(saved);
        }
    }

    private void finish(Map<String, Object> claimed, String outcome) {
        transactions.executeWithoutResult(transaction -> {
            var row = jdbc.queryForMap("SELECT * FROM notification_service.email_logs WHERE id=? FOR UPDATE", claimed.get("id"));
            if (!"SENDING".equals(row.get("status")) || !claimed.get("claim_token").equals(row.get("claim_token"))) return;
            if (!((Timestamp) row.get("lease_until")).toInstant().isAfter(Instant.now())) {
                terminal(row, "FAILED", "SMTP_OUTCOME_UNKNOWN");
                return;
            }
            jdbc.update("UPDATE notification_service.email_attempts SET finished_at=now(),outcome=? WHERE id=?",
                    outcome, claimed.get("claim_token"));
            if ("SENT".equals(outcome)) {
                jdbc.update("""
                        UPDATE notification_service.email_logs SET status='SENT',sent_at=now(),last_error=NULL,
                        variables=NULL,claim_token=NULL,lease_until=NULL WHERE id=?
                        """, row.get("id"));
            } else {
                jdbc.update("UPDATE notification_service.email_logs SET retry_count=retry_count+1 WHERE id=?", row.get("id"));
                boolean retry = "SMTP_CONNECT_FAILED".equals(outcome) && number(row, "cycle_attempts") < properties.maxRetries();
                if (retry) {
                    jdbc.update("""
                            UPDATE notification_service.email_logs SET status='QUEUED',last_error=?,claim_token=NULL,
                            lease_until=NULL,next_attempt_at=now()+(? * interval '1 second') WHERE id=?
                            """, outcome, backoff(number(row, "cycle_attempts")), row.get("id"));
                } else {
                    terminal(row, "EMAIL_EXPIRED".equals(outcome) ? "EXPIRED" : "FAILED", outcome);
                }
            }
            metrics.counter("clucky.email.attempts", "outcome", outcome).increment();
        });
    }

    private void maintain() {
        transactions.executeWithoutResult(transaction -> {
            var stale = jdbc.queryForList("""
                    SELECT * FROM notification_service.email_logs WHERE
                    (status='SENDING' AND (lease_until<=now() OR lease_until IS NULL))
                    OR (status IN ('QUEUED','PENDING') AND (snapshot_version=0 OR expires_at<=now()))
                    ORDER BY id LIMIT 50 FOR UPDATE SKIP LOCKED
                    """);
            for (var row : stale) {
                String code = "SENDING".equals(row.get("status")) ? "SMTP_OUTCOME_UNKNOWN"
                        : number(row, "snapshot_version") == 0 ? "LEGACY_UNSNAPSHOTTED" : "EMAIL_EXPIRED";
                terminal(row, "EMAIL_EXPIRED".equals(code) ? "EXPIRED" : "FAILED", code);
            }
            jdbc.update("""
                    UPDATE notification_service.email_logs SET variables=NULL
                    WHERE variables IS NOT NULL AND (status IN ('SENT','EXPIRED') OR expires_at<=now()
                    OR (sensitive AND status='FAILED') OR (snapshot_version=0 AND status='FAILED'))
                    """);
        });
    }

    private void terminal(Map<String, Object> row, String status, String code) {
        jdbc.update("""
                UPDATE notification_service.email_logs SET status=?,last_error=?,claim_token=NULL,lease_until=NULL,
                variables=CASE WHEN sensitive OR ?='EXPIRED' OR snapshot_version=0 THEN NULL ELSE variables END WHERE id=?
                """, status, code, status, row.get("id"));
        if (row.get("claim_token") != null) {
            int recovered = jdbc.update("UPDATE notification_service.email_attempts SET finished_at=now(),outcome=? WHERE id=? AND finished_at IS NULL",
                    code, row.get("claim_token"));
            if (recovered > 0) jdbc.update("UPDATE notification_service.email_logs SET retry_count=retry_count+1 WHERE id=?", row.get("id"));
        }
        jdbc.update("""
                INSERT INTO notification_service.email_failure_outbox(id,delivery_id,generation,attempt_number,failure_code)
                VALUES (?,?,?,?,?) ON CONFLICT (delivery_id,generation) DO NOTHING
                """, UUID.randomUUID(), row.get("id"), row.get("generation"), row.get("attempt_count"), code);
        metrics.counter("clucky.email.terminal", "reason", code).increment();
    }

    private long backoff(int attempt) {
        return Math.min(properties.retryMaxSeconds(), properties.retryBaseSeconds() * (1L << Math.min(attempt - 1, 20)));
    }

    public static String classify(Throwable failure) {
        if (failure instanceof org.springframework.mail.MailAuthenticationException) return "SMTP_AUTH_FAILED";
        var visited = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<Throwable, Boolean>());
        for (Throwable cause = failure; cause != null && visited.add(cause); cause = cause.getCause()) {
            if (cause instanceof java.net.ConnectException || cause instanceof java.net.UnknownHostException) return "SMTP_CONNECT_FAILED";
        }
        return "SMTP_OUTCOME_UNKNOWN";
    }

    private static void validate(String messageId, String eventId, String correlationId, String recipient,
            String template, Map<String, String> variables, Long storeId) {
        if (messageId == null || !messageId.matches("[A-Za-z0-9._:-]{1,160}")
                || eventId == null || !eventId.matches("[A-Za-z0-9._:-]{1,160}")
                || correlationId == null || !correlationId.matches("[A-Za-z0-9._-]{1,128}")
                || template == null || !template.matches("[A-Za-z0-9_-]{1,100}")
                || recipient == null || recipient.length() > 255 || recipient.contains("\r") || recipient.contains("\n")
                || variables == null || variables.size() > 100 || storeId != null && storeId <= 0) {
            throw new IllegalArgumentException("Invalid email intent");
        }
        try {
            var address = new InternetAddress(recipient, true);
            address.validate();
            if (address.getPersonal() != null || !recipient.equals(address.getAddress())) throw new IllegalArgumentException();
        } catch (Exception invalid) {
            throw new IllegalArgumentException("Invalid email recipient");
        }
        for (var variable : variables.entrySet()) {
            if (variable.getKey() == null || !variable.getKey().matches("[A-Za-z0-9_]{1,100}")
                    || variable.getValue() == null || variable.getValue().length() > 10000) {
                throw new IllegalArgumentException("Invalid email variables");
            }
        }
    }

    private String json(Object value) {
        try { return mapper.writeValueAsString(value); }
        catch (Exception invalid) { throw new IllegalArgumentException("Invalid email payload"); }
    }

    private static int number(Map<String, Object> row, String field) { return ((Number) row.get(field)).intValue(); }
}
