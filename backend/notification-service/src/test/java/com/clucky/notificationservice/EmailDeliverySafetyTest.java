package com.clucky.notificationservice;

import com.clucky.notificationservice.config.CurrentActor;
import com.clucky.notificationservice.config.JwtSettings;
import com.clucky.notificationservice.config.MailSenderProperties;
import com.clucky.notificationservice.dto.Role;
import com.clucky.notificationservice.service.EmailLogService;
import com.clucky.notificationservice.service.EmailPayloadCodec;
import com.clucky.notificationservice.service.EmailSenderService;
import org.junit.jupiter.api.Test;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class EmailDeliverySafetyTest {
    static MailSenderProperties settings() {
        return new MailSenderProperties(true, "smtp.gmail.com", 587, "sender@example.com", "test-only-password",
                "Clucky", 8000, 3, 300, 168, 2, 5, 300, "notification.email-failed");
    }

    static EmailPayloadCodec codec() {
        return new EmailPayloadCodec(new JwtSettings("test-only-key-for-snapshots-32-bytes-minimum", "test", "test"));
    }

    @Test
    void snapshotsAreAuthenticatedRandomizedAndBoundToDelivery() {
        var codec = codec();
        String secret = "otp-test-value";
        String first = codec.encrypt("delivery-a", secret);
        String second = codec.encrypt("delivery-a", secret);
        assertNotEquals(first, second);
        assertFalse(first.contains(secret));
        assertEquals(secret, codec.decrypt("delivery-a", first));
        assertThrows(IllegalStateException.class, () -> codec.decrypt("delivery-b", first));
        assertThrows(IllegalStateException.class, () -> codec.decrypt("delivery-a", first.substring(0, first.length() - 3)));
        assertEquals(codec.fingerprint(secret), codec.fingerprint(secret));
        assertNotEquals(codec.fingerprint(secret), codec.fingerprint(secret + "changed"));
    }

    @Test
    void retriesRequireSafeFailureSnapshotExpiryAndAdmin() {
        var actor = new CurrentActor(1L, Role.ADMIN, null);
        var row = new HashMap<String, Object>(Map.of("status", "FAILED", "sensitive", false, "last_error", "SMTP_CONNECT_FAILED",
                "generation", 0, "expires_at", Timestamp.from(Instant.now().plusSeconds(60)), "snapshot_version", 1, "variables", "encrypted"));
        assertNull(EmailLogService.retryReason(row, actor, 2));
        assertEquals("FORBIDDEN", EmailLogService.retryReason(row, new CurrentActor(2L, Role.STORE_MANAGER, 1L), 2));
        row.put("last_error", "SMTP_OUTCOME_UNKNOWN");
        assertEquals("OUTCOME_UNKNOWN", EmailLogService.retryReason(row, actor, 2));
        row.put("last_error", "SMTP_CONNECT_FAILED");
        row.put("sensitive", true);
        assertEquals("SECURITY_EMAIL", EmailLogService.retryReason(row, actor, 2));
        row.put("sensitive", false);
        row.put("status", "SENT");
        assertEquals("NOT_FAILED", EmailLogService.retryReason(row, actor, 2));
        row.put("status", "FAILED");
        row.put("generation", 2);
        assertEquals("RETRY_LIMIT", EmailLogService.retryReason(row, actor, 2));
        row.put("generation", 0);
        row.put("expires_at", Timestamp.from(Instant.now().minusSeconds(1)));
        assertEquals("EXPIRED", EmailLogService.retryReason(row, actor, 2));
        assertEquals("DELIVERY_FAILED", EmailLogService.safeFailure("otp-test-value"));
    }

    @Test
    void uncertainSmtpFailuresNeverAutomaticallyRetry() {
        assertEquals("SMTP_CONNECT_FAILED", EmailSenderService.classify(new java.net.ConnectException()));
        assertEquals("SMTP_CONNECT_FAILED", EmailSenderService.classify(new IllegalStateException(new java.net.UnknownHostException())));
        assertEquals("SMTP_AUTH_FAILED", EmailSenderService.classify(new org.springframework.mail.MailAuthenticationException("secret")));
        assertEquals("SMTP_OUTCOME_UNKNOWN", EmailSenderService.classify(new java.net.SocketTimeoutException("secret")));
    }
}
