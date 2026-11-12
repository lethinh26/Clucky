package com.clucky.notificationservice.service;

import com.clucky.notificationservice.config.CurrentActor;
import com.clucky.notificationservice.config.MailSenderProperties;
import com.clucky.notificationservice.dto.PageResponse;
import com.clucky.notificationservice.dto.Role;
import com.clucky.notificationservice.exception.ApiException;
import com.clucky.notificationservice.exception.ErrorCode;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class EmailLogService {
    private static final Set<String> STATUSES = Set.of("QUEUED", "SENDING", "SENT", "FAILED", "EXPIRED");
    private static final Set<String> FAILURES = Set.of("SMTP_CONNECT_FAILED", "SMTP_AUTH_FAILED", "SMTP_OUTCOME_UNKNOWN",
            "INVALID_TEMPLATE", "SNAPSHOT_UNAVAILABLE", "EMAIL_EXPIRED", "LEGACY_UNSNAPSHOTTED");
    private static final String SELECT = """
            SELECT email.*, (SELECT CASE WHEN failure.published_at IS NULL THEN 'PENDING' ELSE 'PUBLISHED' END
            FROM notification_service.email_failure_outbox failure
            WHERE failure.delivery_id=email.id AND failure.generation=email.generation) AS failure_delivery_status
            FROM notification_service.email_logs email
            """;
    private final JdbcTemplate jdbc;
    private final MailSenderProperties settings;

    public EmailLogService(JdbcTemplate jdbc, MailSenderProperties settings) {
        this.jdbc = jdbc;
        this.settings = settings;
    }

    public record EmailLogView(long id, String toEmail, String subject, String status, String template,
            Instant sentAt, Instant createdAt, String failureCode, int retryCount, String eventId,
            String correlationId, String messageId, Instant nextAttemptAt, Long storeId, int attemptCount,
            int generation, Instant expiresAt, boolean canRetry, String retryBlockedReason, String failureDeliveryStatus) {}
    public record AttemptView(int attemptNumber, int generation, Instant startedAt, Instant finishedAt, String outcome) {}
    public record FailureView(UUID id, int generation, int attemptNumber, String failureCode, Instant createdAt,
            Instant publishedAt, int publishAttempts, Instant nextAttemptAt) {}
    public record RetryView(int expectedGeneration, UUID requestId, long actorId, Instant createdAt) {}
    public record Detail(EmailLogView delivery, List<AttemptView> attempts, List<FailureView> failures, List<RetryView> retries) {}
    public record RetryResult(long id, int generation, boolean replayed) {}

    @Transactional(readOnly = true, isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public PageResponse<EmailLogView> list(int page, int size, String recipient, String status, String template,
            Instant from, Instant to) {
        var actor = reader();
        if (page < 0 || size < 1 || size > 100 || recipient != null && recipient.length() > 255
                || status != null && !STATUSES.contains(status)
                || template != null && !template.matches("[A-Za-z0-9_-]{1,100}")
                || !validDate(from) || !validDate(to)
                || from != null && to != null && !from.isBefore(to)) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        var parameters = new ArrayList<Object>();
        var where = new StringBuilder(" WHERE 1=1");
        scope(where, parameters, actor);
        if (recipient != null && !recipient.isBlank()) {
            where.append(" AND position(lower(?) in lower(email.to_email))>0");
            parameters.add(recipient.trim());
        }
        if (status != null) { where.append(" AND email.status=?"); parameters.add(status); }
        if (template != null) { where.append(" AND email.template=?"); parameters.add(template); }
        if (from != null) { where.append(" AND email.created_at>=?"); parameters.add(Timestamp.from(from)); }
        if (to != null) { where.append(" AND email.created_at<?"); parameters.add(Timestamp.from(to)); }
        long total = jdbc.queryForObject("SELECT count(*) FROM notification_service.email_logs email" + where, Long.class, parameters.toArray());
        parameters.add(size);
        parameters.add((long) page * size);
        var content = jdbc.queryForList(SELECT + where + " ORDER BY email.created_at DESC,email.id DESC LIMIT ? OFFSET ?",
                parameters.toArray()).stream().map(row -> view(row, actor)).toList();
        return new PageResponse<>(content, page, size, total, (int) Math.min(Integer.MAX_VALUE, (total + size - 1) / size));
    }

    @Transactional(readOnly = true, isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Detail detail(long id) {
        var actor = reader();
        var parameters = new ArrayList<Object>();
        var where = new StringBuilder(" WHERE email.id=?");
        parameters.add(id);
        scope(where, parameters, actor);
        var rows = jdbc.queryForList(SELECT + where, parameters.toArray());
        if (rows.isEmpty()) throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND);
        var attempts = jdbc.query("""
                SELECT * FROM notification_service.email_attempts WHERE delivery_id=? ORDER BY attempt_number DESC LIMIT 200
                """, (row, index) -> new AttemptView(row.getInt("attempt_number"), row.getInt("generation"),
                row.getTimestamp("started_at").toInstant(), instant(row.getTimestamp("finished_at")),
                Set.of("SENDING", "SENT").contains(row.getString("outcome")) ? row.getString("outcome") : safeFailure(row.getString("outcome"))), id);
        var failures = jdbc.query("SELECT * FROM notification_service.email_failure_outbox WHERE delivery_id=? ORDER BY generation DESC LIMIT 200",
                (row, index) -> new FailureView(row.getObject("id", UUID.class), row.getInt("generation"),
                row.getInt("attempt_number"), safeFailure(row.getString("failure_code")), row.getTimestamp("created_at").toInstant(),
                instant(row.getTimestamp("published_at")), row.getInt("publish_attempts"),
                row.getTimestamp("published_at") == null ? instant(row.getTimestamp("next_attempt_at")) : null), id);
        var retries = actor.role() == Role.ADMIN ? jdbc.query("""
                SELECT * FROM notification_service.email_retry_requests WHERE delivery_id=? ORDER BY expected_generation DESC LIMIT 200
                """, (row, index) -> new RetryView(row.getInt("expected_generation"), row.getObject("request_id", UUID.class),
                row.getLong("actor_id"), row.getTimestamp("created_at").toInstant()), id) : List.<RetryView>of();
        return new Detail(view(rows.getFirst(), actor), attempts, failures, retries);
    }

    @Transactional
    public RetryResult retry(long id, int expectedGeneration, UUID requestId) {
        var actor = CurrentActor.require();
        if (actor.role() != Role.ADMIN) throw new AccessDeniedException("Access denied");
        if (id < 1 || expectedGeneration < 0 || requestId == null) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        var rows = jdbc.queryForList("SELECT * FROM notification_service.email_logs WHERE id=? FOR UPDATE", id);
        if (rows.isEmpty()) throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND);
        var existing = jdbc.queryForList("SELECT * FROM notification_service.email_retry_requests WHERE delivery_id=? AND request_id=?", id, requestId);
        if (!existing.isEmpty()) {
            var request = existing.getFirst();
            if (number(request, "expected_generation") != expectedGeneration
                    || ((Number) request.get("actor_id")).longValue() != actor.userId()) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            return new RetryResult(id, expectedGeneration + 1, true);
        }
        var row = rows.getFirst();
        if (number(row, "generation") != expectedGeneration || retryReason(row, actor, settings.maxManualRetries()) != null) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
        jdbc.update("""
                INSERT INTO notification_service.email_retry_requests(delivery_id,expected_generation,request_id,actor_id)
                VALUES (?,?,?,?)
                """, id, expectedGeneration, requestId, actor.userId());
        jdbc.update("""
                UPDATE notification_service.email_logs SET status='QUEUED',generation=generation+1,cycle_attempts=0,
                next_attempt_at=now(),claim_token=NULL,lease_until=NULL WHERE id=?
                """, id);
        return new RetryResult(id, expectedGeneration + 1, false);
    }

    private EmailLogView view(Map<String, Object> row, CurrentActor actor) {
        String reason = retryReason(row, actor, settings.maxManualRetries());
        return new EmailLogView(((Number) row.get("id")).longValue(), AdminNotificationService.maskEmail((String) row.get("to_email")),
                number(row, "snapshot_version") == 1 ? AdminNotificationService.maskSubject((String) row.get("subject")) : "",
                (String) row.get("status"), (String) row.get("template"), instant((Timestamp) row.get("sent_at")),
                instant((Timestamp) row.get("created_at")), safeFailure((String) row.get("last_error")), number(row, "retry_count"),
                EmailFailurePublisher.safeToken(row.get("event_id")), EmailFailurePublisher.safeToken(row.get("correlation_id")),
                EmailFailurePublisher.safeToken(row.get("message_id")), "QUEUED".equals(row.get("status")) ? instant((Timestamp) row.get("next_attempt_at")) : null,
                row.get("store_id") == null ? null : ((Number) row.get("store_id")).longValue(), number(row, "attempt_count"),
                number(row, "generation"), instant((Timestamp) row.get("expires_at")), reason == null, reason,
                row.get("failure_delivery_status") == null ? "NONE" : row.get("failure_delivery_status").toString());
    }

    public static String retryReason(Map<String, Object> row, CurrentActor actor, int maxRetries) {
        if (actor.role() != Role.ADMIN) return "FORBIDDEN";
        if (!"FAILED".equals(row.get("status"))) return "NOT_FAILED";
        if (Boolean.TRUE.equals(row.get("sensitive"))) return "SECURITY_EMAIL";
        if ("SMTP_OUTCOME_UNKNOWN".equals(row.get("last_error"))) return "OUTCOME_UNKNOWN";
        if (number(row, "generation") >= maxRetries) return "RETRY_LIMIT";
        Timestamp expiry = (Timestamp) row.get("expires_at");
        if (expiry == null || !expiry.toInstant().isAfter(Instant.now())) return "EXPIRED";
        if (number(row, "snapshot_version") != 1 || row.get("variables") == null) return "NO_SNAPSHOT";
        if (row.get("last_error") == null || !Set.of("SMTP_CONNECT_FAILED", "SMTP_AUTH_FAILED").contains(row.get("last_error"))) return "UNSAFE_FAILURE";
        return null;
    }

    public static String safeFailure(String failure) {
        return failure == null ? null : FAILURES.contains(failure) ? failure : "DELIVERY_FAILED";
    }

    private CurrentActor reader() {
        var actor = CurrentActor.require();
        if (actor.role() != Role.ADMIN && (actor.role() != Role.STORE_MANAGER || actor.storeId() == null || actor.storeId() <= 0)) {
            throw new AccessDeniedException("Access denied");
        }
        return actor;
    }

    private void scope(StringBuilder where, List<Object> parameters, CurrentActor actor) {
        if (actor.role() == Role.STORE_MANAGER) {
            where.append(" AND email.store_id=? AND email.sensitive=false");
            parameters.add(actor.storeId());
        }
    }

    private static Instant instant(Timestamp value) { return value == null ? null : value.toInstant(); }
    private static boolean validDate(Instant value) {
        return value == null || !value.isBefore(Instant.parse("0001-01-01T00:00:00Z"))
                && !value.isAfter(Instant.parse("9999-12-31T23:59:59.999999999Z"));
    }
    private static int number(Map<String, Object> row, String field) { return ((Number) row.get(field)).intValue(); }
}
