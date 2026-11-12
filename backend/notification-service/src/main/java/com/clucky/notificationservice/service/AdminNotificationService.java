package com.clucky.notificationservice.service;

import com.clucky.notificationservice.config.CurrentActor;
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
import java.util.regex.Pattern;

@Service
public class AdminNotificationService {
    private static final Pattern EMAIL = Pattern.compile("[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
    private final JdbcTemplate jdbc;

    public AdminNotificationService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record NotificationView(long id, String title, String content, String type, long refId,
                                   long storeId, boolean isRead, Instant createdAt) {}

    @Transactional(readOnly = true, isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public PageResponse<NotificationView> inbox(int page, int size) {
        long userId = requireAdmin();
        validatePage(page, size);
        long total = jdbc.queryForObject("SELECT count(*) FROM notification_service.admin_notifications", Long.class);
        var content = jdbc.query("""
                SELECT notification.*, receipt.user_id IS NOT NULL AS is_read
                FROM notification_service.admin_notifications notification
                LEFT JOIN notification_service.admin_notification_reads receipt
                  ON receipt.notification_id = notification.id AND receipt.user_id = ?
                ORDER BY notification.created_at DESC,notification.id DESC LIMIT ? OFFSET ?
                """, (row, index) -> new NotificationView(row.getLong("id"), row.getString("title"),
                row.getString("content"), row.getString("type"), row.getLong("ref_id"), row.getLong("store_id"),
                row.getBoolean("is_read"), row.getTimestamp("created_at").toInstant()), userId, size, (long) page * size);
        return new PageResponse<>(content, page, size, total, (int) ((total + size - 1) / size));
    }

    @Transactional(readOnly = true)
    public long unreadCount() {
        return jdbc.queryForObject("""
                SELECT count(*) FROM notification_service.admin_notifications notification
                WHERE NOT EXISTS (SELECT 1 FROM notification_service.admin_notification_reads receipt
                  WHERE receipt.notification_id = notification.id AND receipt.user_id = ?)
                """, Long.class, requireAdmin());
    }

    @Transactional
    public void markRead(long id) {
        long userId = requireAdmin();
        if (id <= 0) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        if (!Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM notification_service.admin_notifications WHERE id = ?)", Boolean.class, id))) {
            throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND);
        }
        jdbc.update("INSERT INTO notification_service.admin_notification_reads(notification_id,user_id) VALUES (?,?) ON CONFLICT DO NOTHING", id, userId);
    }

    @Transactional
    public int markAllRead() {
        return jdbc.update("""
                INSERT INTO notification_service.admin_notification_reads(notification_id,user_id)
                SELECT id,? FROM notification_service.admin_notifications ON CONFLICT DO NOTHING
                """, requireAdmin());
    }

    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        int separator = email.lastIndexOf('@');
        if (separator < 1 || separator == email.length() - 1) return "***";
        return email.substring(0, 1) + "***@" + email.substring(separator + 1, separator + 2) + "***";
    }

    public static String maskSubject(String subject) {
        return subject == null ? "" : EMAIL.matcher(subject).replaceAll(match -> maskEmail(match.group()));
    }

    private long requireAdmin() {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.ADMIN) throw new AccessDeniedException("Access denied");
        return actor.userId();
    }

    private void validatePage(int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw new ApiException(ErrorCode.VALIDATION_ERROR);
    }
}
