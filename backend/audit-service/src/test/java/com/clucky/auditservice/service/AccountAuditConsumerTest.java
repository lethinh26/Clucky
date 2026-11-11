package com.clucky.auditservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.support.Acknowledgment;

import java.sql.Timestamp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("KAFKA-10 AccountAuditConsumer - Idempotency, Schema Validation & Sanitization Tests")
class AccountAuditConsumerTest {

    private ObjectMapper objectMapper;
    private JdbcTemplate jdbcTemplate;
    private Acknowledgment acknowledgment;
    private AccountAuditConsumer consumer;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        jdbcTemplate = mock(JdbcTemplate.class);
        acknowledgment = mock(Acknowledgment.class);
        consumer = new AccountAuditConsumer(objectMapper, jdbcTemplate);
    }

    @Test
    @DisplayName("AC-01 & AC-04: Valid audit event is parsed, persisted with ON CONFLICT DO NOTHING, and acknowledged")
    void validAuditEventPersistedAndAcknowledged() {
        String eventJson = """
            {
              "eventId": "evt-ord-12345",
              "correlationId": "corr-uuid-abc",
              "eventType": "audit.recorded",
              "sourceService": "cart-order-service",
              "occurredAt": "2026-11-12T02:00:00Z",
              "payload": {
                "actorId": 10,
                "actorRole": "STORE_MANAGER",
                "storeId": 2,
                "action": "ORDER_STATUS_CHANGED",
                "targetType": "Order",
                "targetId": 1001,
                "detail": {
                  "status": "CONFIRMED",
                  "beforeStatus": "PENDING_PAYMENT",
                  "orderId": 1001,
                  "amount": 150000,
                  "result": "SUCCESS"
                }
              }
            }
            """;

        when(jdbcTemplate.update(anyString(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(1);

        consumer.receive(eventJson, acknowledgment);

        // Verify SQL contains ON CONFLICT(event_id) DO NOTHING
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object> paramCaptor = ArgumentCaptor.forClass(Object.class);

        verify(jdbcTemplate).update(sqlCaptor.capture(),
                paramCaptor.capture(), paramCaptor.capture(), paramCaptor.capture(),
                paramCaptor.capture(), paramCaptor.capture(), paramCaptor.capture(),
                paramCaptor.capture(), paramCaptor.capture(), paramCaptor.capture(),
                paramCaptor.capture(), paramCaptor.capture());

        assertThat(sqlCaptor.getValue()).contains("ON CONFLICT(event_id) DO NOTHING");
        assertThat(sqlCaptor.getValue()).contains("audit_service.audit_logs");

        var params = paramCaptor.getAllValues();
        assertThat(params.get(0)).isEqualTo("evt-ord-12345"); // eventId
        assertThat(params.get(1)).isEqualTo("corr-uuid-abc"); // correlationId
        assertThat(params.get(2)).isEqualTo("cart-order-service"); // sourceService
        assertThat(params.get(3)).isEqualTo(10L); // actorId
        assertThat(params.get(4)).isEqualTo("STORE_MANAGER"); // actorRole
        assertThat(params.get(5)).isEqualTo(2L); // storeId
        assertThat(params.get(6)).isEqualTo("ORDER_STATUS_CHANGED"); // action
        assertThat(params.get(7)).isEqualTo("Order"); // targetType
        assertThat(params.get(8)).isEqualTo(1001L); // targetId
        assertThat((String) params.get(9)).contains("\"status\":\"CONFIRMED\"");
        assertThat(params.get(10)).isInstanceOf(Timestamp.class);

        verify(acknowledgment, times(1)).acknowledge();
    }

    @Test
    @DisplayName("AC-04: Duplicate event receipt returns 0 rows updated (idempotent ON CONFLICT) and acknowledges")
    void duplicateEventReceiptAcknowledgedWithoutError() {
        String eventJson = """
            {
              "eventId": "evt-dup-9999",
              "correlationId": "corr-uuid-dup",
              "eventType": "audit.recorded",
              "sourceService": "identity-service",
              "occurredAt": "2026-11-12T02:00:00Z",
              "payload": {
                "actorId": 1,
                "actorRole": "ADMIN",
                "storeId": null,
                "action": "BRANCH_ACCOUNT_PROVISIONED",
                "targetType": "User",
                "targetId": 50,
                "detail": {
                  "result": "SUCCESS"
                }
              }
            }
            """;

        // ON CONFLICT(event_id) DO NOTHING returns 0 when duplicate
        when(jdbcTemplate.update(anyString(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(0);

        consumer.receive(eventJson, acknowledgment);

        verify(jdbcTemplate, times(1)).update(anyString(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
        verify(acknowledgment, times(1)).acknowledge();
    }

    @Test
    @DisplayName("AC-08: Untrusted or unknown sourceService is safely ignored and acknowledged without DB write")
    void untrustedSourceServiceIgnoredAndAcknowledged() {
        String eventJson = """
            {
              "eventId": "evt-hack-123",
              "correlationId": "corr-hack",
              "eventType": "audit.recorded",
              "sourceService": "untrusted-third-party",
              "occurredAt": "2026-11-12T02:00:00Z",
              "payload": {
                "actorId": 1,
                "actorRole": "ADMIN",
                "action": "ATTACK",
                "targetType": "System",
                "targetId": 1
              }
            }
            """;

        consumer.receive(eventJson, acknowledgment);

        verifyNoInteractions(jdbcTemplate);
        verify(acknowledgment, times(1)).acknowledge();
    }

    @Test
    @DisplayName("AC-06: Sensitive credentials (passwords, tokens, OTPs, hashes) are strictly redacted from detail")
    void sensitiveCredentialsSanitizedFromDetail() {
        String eventJson = """
            {
              "eventId": "evt-sec-001",
              "correlationId": "corr-sec-001",
              "eventType": "audit.recorded",
              "sourceService": "identity-service",
              "occurredAt": "2026-11-12T02:00:00Z",
              "payload": {
                "actorId": 1,
                "actorRole": "ADMIN",
                "storeId": 1,
                "action": "USER_PASSWORD_RESET",
                "targetType": "User",
                "targetId": 77,
                "detail": {
                  "before": {
                    "password": "plain-secret-password",
                    "passwordHash": "$2a$10$abcdefghijklmnopqrstuvwxyz",
                    "token": "bearer-jwt-token",
                    "isLocked": false
                  },
                  "after": {
                    "otp": "123456",
                    "authorization": "Bearer secret-token",
                    "status": "LOCKED",
                    "isLocked": true
                  },
                  "apiKey": "super-secret-api-key",
                  "result": "SUCCESS"
                }
              }
            }
            """;

        ArgumentCaptor<Object> paramCaptor = ArgumentCaptor.forClass(Object.class);

        consumer.receive(eventJson, acknowledgment);

        verify(jdbcTemplate).update(anyString(),
                paramCaptor.capture(), paramCaptor.capture(), paramCaptor.capture(),
                paramCaptor.capture(), paramCaptor.capture(), paramCaptor.capture(),
                paramCaptor.capture(), paramCaptor.capture(), paramCaptor.capture(),
                paramCaptor.capture(), paramCaptor.capture());

        String savedDetailJson = (String) paramCaptor.getAllValues().get(9);

        // Assert sensitive secrets are NOT present
        assertThat(savedDetailJson).doesNotContain("plain-secret-password");
        assertThat(savedDetailJson).doesNotContain("$2a$10$abcdefghijklmnopqrstuvwxyz");
        assertThat(savedDetailJson).doesNotContain("bearer-jwt-token");
        assertThat(savedDetailJson).doesNotContain("123456");
        assertThat(savedDetailJson).doesNotContain("super-secret-api-key");
        assertThat(savedDetailJson).doesNotContain("Bearer secret-token");

        // Assert safe business fields ARE retained
        assertThat(savedDetailJson).contains("\"isLocked\":false");
        assertThat(savedDetailJson).contains("\"isLocked\":true");
        assertThat(savedDetailJson).contains("\"status\":\"LOCKED\"");
        assertThat(savedDetailJson).contains("\"result\":\"SUCCESS\"");

        verify(acknowledgment, times(1)).acknowledge();
    }

    @ParameterizedTest
    @ValueSource(strings = {
        // Missing or invalid eventId
        """
        {"eventId":"","correlationId":"c1","eventType":"audit.recorded","sourceService":"identity-service","occurredAt":"2026-11-12T02:00:00Z","payload":{"actorId":1,"actorRole":"ADMIN","action":"TEST","targetType":"User","targetId":1}}
        """,
        // Invalid eventType
        """
        {"eventId":"e1","correlationId":"c1","eventType":"order.created","sourceService":"identity-service","occurredAt":"2026-11-12T02:00:00Z","payload":{"actorId":1,"actorRole":"ADMIN","action":"TEST","targetType":"User","targetId":1}}
        """,
        // Non-positive actorId (zero or negative)
        """
        {"eventId":"e1","correlationId":"c1","eventType":"audit.recorded","sourceService":"identity-service","occurredAt":"2026-11-12T02:00:00Z","payload":{"actorId":0,"actorRole":"ADMIN","action":"TEST","targetType":"User","targetId":1}}
        """,
        // Non-positive targetId
        """
        {"eventId":"e1","correlationId":"c1","eventType":"audit.recorded","sourceService":"identity-service","occurredAt":"2026-11-12T02:00:00Z","payload":{"actorId":1,"actorRole":"ADMIN","action":"TEST","targetType":"User","targetId":-5}}
        """,
        // Disallowed actorRole (client spoofing or unknown role)
        """
        {"eventId":"e1","correlationId":"c1","eventType":"audit.recorded","sourceService":"identity-service","occurredAt":"2026-11-12T02:00:00Z","payload":{"actorId":1,"actorRole":"SUPERUSER","action":"TEST","targetType":"User","targetId":1}}
        """,
        // Invalid action characters
        """
        {"eventId":"e1","correlationId":"c1","eventType":"audit.recorded","sourceService":"identity-service","occurredAt":"2026-11-12T02:00:00Z","payload":{"actorId":1,"actorRole":"ADMIN","action":"drop table users;","targetType":"User","targetId":1}}
        """
    })
    @DisplayName("AC-08: Malformed or unvalidated events fail schema check and trigger retry/DLQ (not fail-open)")
    void malformedEventsThrowExceptionForRetryOrDlq(String malformedJson) {
        assertThatThrownBy(() -> consumer.receive(malformedJson, acknowledgment))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Audit persistence pending");

        verifyNoInteractions(jdbcTemplate);
        verify(acknowledgment, never()).acknowledge();
    }
}

