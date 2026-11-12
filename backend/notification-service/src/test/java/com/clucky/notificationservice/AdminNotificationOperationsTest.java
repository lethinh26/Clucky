package com.clucky.notificationservice;

import com.clucky.notificationservice.consumer.NotificationConsumer;
import com.clucky.notificationservice.dto.DomainEvent;
import com.clucky.notificationservice.exception.ApiException;
import com.clucky.notificationservice.mapper.EventMapper;
import com.clucky.notificationservice.repository.NotificationRepository;
import com.clucky.notificationservice.service.AdminNotificationService;
import com.clucky.notificationservice.service.EmailSenderService;
import com.clucky.notificationservice.service.EmailLogService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AdminNotificationOperationsTest {
    private final com.clucky.notificationservice.service.CustomerContactClient contacts = mock(com.clucky.notificationservice.service.CustomerContactClient.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final EmailSenderService sender = mock(EmailSenderService.class);
    private final EventMapper mapper = mock(EventMapper.class);
    private final NotificationRepository repository = mock(NotificationRepository.class);
    private final ObjectMapper json = new ObjectMapper();

    @AfterEach
    void clearActor() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void nonAdminsCannotReadLogsOrUseAdminInboxEvenWhenCallingServiceDirectly() {
        var service = new AdminNotificationService(jdbc);
        for (String role : List.of("CUSTOMER", "STAFF", "STORE_MANAGER", "SHIPPER")) {
            actor(role, 7);
            assertThrows(AccessDeniedException.class, () -> new EmailLogService(jdbc, EmailDeliverySafetyTest.settings()).list(0, 20, null, null, null, null, null));
            assertThrows(AccessDeniedException.class, () -> service.inbox(0, 20));
            assertThrows(AccessDeniedException.class, service::unreadCount);
            assertThrows(AccessDeniedException.class, () -> service.markRead(1));
            assertThrows(AccessDeniedException.class, service::markAllRead);
        }
        verifyNoInteractions(jdbc);
    }

    @Test
    void invalidFiltersAreRejectedBeforeQuerying() {
        actor("ADMIN", 9);
        var service = new AdminNotificationService(jdbc);
        var emails = new EmailLogService(jdbc, EmailDeliverySafetyTest.settings());
        assertThrows(ApiException.class, () -> emails.list(0, 101, null, null, null, null, null));
        assertThrows(ApiException.class, () -> emails.list(0, 20, null, "ANY", null, null, null));
        assertThrows(ApiException.class, () -> emails.list(0, 20, null, null, null, Instant.MAX, Instant.MIN));
        assertThrows(ApiException.class, () -> emails.list(0, 20, null, null, null, Instant.MIN, null));
        assertThrows(ApiException.class, () -> service.inbox(-1, 20));
        verifyNoInteractions(jdbc);
    }

    @Test
    void emailAndSubjectRedactionDoNotExposeAddresses() {
        assertEquals("c***@e***", AdminNotificationService.maskEmail("customer@example.com"));
        assertEquals("***", AdminNotificationService.maskEmail("invalid"));
        assertEquals("Sent to c***@e***", AdminNotificationService.maskSubject("Sent to customer@example.com"));
    }

    @Test
    void readReceiptsUseAuthenticatedAdminNotCallerSuppliedUser() {
        actor("ADMIN", 9);
        when(jdbc.queryForObject(anyString(), eq(Boolean.class), eq(12L))).thenReturn(true);
        var service = new AdminNotificationService(jdbc);
        service.markRead(12);
        service.markAllRead();
        verify(jdbc).update(contains("ON CONFLICT DO NOTHING"), eq(12L), eq(9L));
        verify(jdbc).update(contains("SELECT id,?"), eq(9L));
    }

    @Test
    void orderCreatedProducesOnlySanitizedRoleScopedAdminFanout() {
        var payload = json.createObjectNode().put("orderId", 42).put("storeId", 3)
                .put("customerId", 7).put("status", "CONFIRMED")
                .put("managerUserId", 777).put("email", "staff@example.com")
                .put("body", "Do not copy customer private details");
        consume("order.created", "cart-order-service", "order-event", payload);
        verify(jdbc).update(contains("admin_notifications"), eq("order.created:42"), eq("order-event"), eq("trace"),
                eq("Đơn hàng #42 vừa được tạo tại chi nhánh #3."), eq(42L), eq(3L));
        verifyNoInteractions(sender);
        verify(contacts).verifiedEmail(7L);
    }

    @Test
    void spoofedSourceCannotCreateAdminBroadcast() {
        var payload = json.createObjectNode().put("orderId", 42).put("storeId", 3);
        assertThrows(IllegalArgumentException.class, () -> consume("order.created", "identity-service", "event", payload));
        verifyNoInteractions(jdbc, sender, repository);
    }

    @Test
    void lowStockAdminAlertRequiresCatalogSourceAndDoesNotExposeFreeText() {
        var payload = json.createObjectNode().put("productId", 15).put("storeId", 3)
                .put("productName", "untrusted private text");
        assertThrows(IllegalArgumentException.class, () -> consume("inventory.low-stock", "identity-service", "stock-event", payload));
        verifyNoInteractions(jdbc, sender, repository);
        consume("inventory.low-stock", "catalog-store-service", "stock-event", payload);
        verify(jdbc).update(contains("admin_notifications"), eq("admin:stock-event"), eq("stock-event"), eq("trace"),
                eq("Tồn kho thấp"), argThat((String content) -> !content.contains("untrusted")), eq("INVENTORY"), eq(15L), eq(3L));
    }

    @Test
    void processedRefundRequiresCustomerRecipientAndUsesOwnedContent() {
        var payload = refund();
        payload.put("managerUserId", 777).put("toEmail", "staff@example.com")
                .put("subject", "Untrusted subject").put("body", "Untrusted body");
        consume("refund.processed", "cart-order-service", "refund-event", payload);
        verify(jdbc).update(contains("INSERT INTO notification_service.notifications"), eq(7L), eq("Hoàn tiền thành công"),
                contains("25000"), eq("REFUND"), eq(42L), anyString());
        verify(sender).processEmailIntent(anyString(), eq("refund-event"), eq("trace"), eq("customer@example.com"),
                eq("REFUND_PROCESSED"), argThat(variables -> "CLK-42".equals(variables.get("orderCode"))
                        && "25000".equals(variables.get("amount"))), eq(3L), isNull());
    }

    @Test
    void missingOrStaffRecipientNeverFallsBackToActorOrArbitraryEmail() {
        var payload = refund();
        payload.withObject("recipient").put("role", "STAFF");
        payload.put("userId", 777).put("toEmail", "staff@example.com");
        consume("refund.processed", "cart-order-service", "refund-event", payload);
        verify(jdbc).update(contains("notification_delivery_gaps"), eq("refund-event"), eq("refund.processed"),
                eq("trace"), eq("NO_VERIFIED_CUSTOMER_RECIPIENT"));
        verifyNoInteractions(sender, repository);
    }

    @Test
    void unverifiedOrMultipleEmailRecipientsAreNotSent() {
        var payload = refund();
        payload.withObject("recipient").put("emailVerified", false);
        consume("refund.processed", "cart-order-service", "unverified", payload);
        payload.withObject("recipient").put("emailVerified", true).put("email", "customer@example.com,other@example.com");
        consume("refund.processed", "cart-order-service", "multiple", payload);
        verifyNoInteractions(sender);
    }

    @Test
    void replayUsesSameRefundDeliveryKeyEvenWithDifferentEnvelopeIds() {
        consume("refund.processed", "payment-service", "first", refund());
        consume("refund.processed", "payment-service", "second", refund());
        var keys = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(sender, times(2)).processEmailIntent(keys.capture(), anyString(), eq("trace"), eq("customer@example.com"), eq("REFUND_PROCESSED"), anyMap(), eq(3L), isNull());
        assertEquals(keys.getAllValues().getFirst(), keys.getAllValues().getLast());
        verify(jdbc, times(2)).update(contains("ON CONFLICT (operation_key)"), eq(7L), anyString(), anyString(), eq("REFUND"), eq(42L), anyString());
    }

    @Test
    void approvedRefundCannotClaimItWasProcessed() {
        var payload = refund().put("status", "APPROVED");
        assertThrows(IllegalArgumentException.class, () -> consume("refund.processed", "cart-order-service", "event", payload));
        verifyNoInteractions(sender, jdbc, repository);
    }

    @Test
    @EnabledIfEnvironmentVariable(named = "CLUCKY_TEST_DB_URL", matches = ".+")
    void postgresPreservesIndependentReceiptsFilteredLogsAndTransactionalConfigAudit() {
        var source = new org.springframework.jdbc.datasource.DriverManagerDataSource(
                System.getenv("CLUCKY_TEST_DB_URL"), "postgres", System.getenv("CLUCKY_TEST_DB_PASSWORD"));
        org.flywaydb.core.Flyway.configure().dataSource(source).schemas("notification_service")
                .locations("classpath:db/migration").load().migrate();
        var database = new JdbcTemplate(source);
        var transactions = new org.springframework.transaction.support.TransactionTemplate(
                new org.springframework.jdbc.datasource.DataSourceTransactionManager(source));
        String operation = UUID.randomUUID().toString();
        String template = "CHECK_" + operation;
        transactions.executeWithoutResult(transaction -> {
            transaction.setRollbackOnly();
            var payload = json.createObjectNode().put("orderId", 9223372036854775806L).put("storeId", 3)
                    .put("customerId", 7).put("status", "CONFIRMED");
            when(mapper.fromJson("event", "order.created")).thenReturn(new DomainEvent(operation, "trace", "order.created",
                    "cart-order-service", Instant.now(), payload));
            var consumer = new NotificationConsumer(mapper, repository, sender, database, "https://clucky.example", contacts);
            var record = new ConsumerRecord<String, String>("order.created", 0, 0, "42", "event");
            consumer.consume(record, null);
            long notificationId = database.queryForObject("SELECT id FROM notification_service.admin_notifications WHERE event_id = ?", Long.class, operation);
            actor("ADMIN", 900001);
            var service = new AdminNotificationService(database);
            service.markRead(notificationId);
            service.markRead(notificationId);
            consumer.consume(record, null);
            assertEquals(1L, database.queryForObject("SELECT count(*) FROM notification_service.admin_notifications WHERE event_id = ?", Long.class, operation));
            assertEquals(1L, database.queryForObject("SELECT count(*) FROM notification_service.admin_notification_reads WHERE notification_id = ?", Long.class, notificationId));
            actor("ADMIN", 900002);
            service.markRead(notificationId);
            assertEquals(2L, database.queryForObject("SELECT count(*) FROM notification_service.admin_notification_reads WHERE notification_id = ?", Long.class, notificationId));

            database.update("""
                    INSERT INTO notification_service.email_logs(message_id,to_email,subject,template,status)
                    VALUES (?,?,'Sent message',?,'SENT')
                    """, operation, operation + "@example.com", template);
            var emails = new EmailLogService(database, EmailDeliverySafetyTest.settings());
            var logs = emails.list(0, 1, operation, "SENT", template, Instant.now().minusSeconds(60), Instant.now().plusSeconds(60));
            assertEquals(1, logs.totalElements());
            assertFalse(logs.content().getFirst().toEmail().contains(operation));
            assertEquals(0, emails.list(0, 20, operation, "FAILED", null, null, null).totalElements());
            assertEquals(0, emails.list(0, 20, "%' OR 1=1 --", null, null, null, null).totalElements());

            database.queryForObject("SELECT set_config('clucky.actor_id','900002',true)", String.class);
            database.queryForObject("SELECT set_config('clucky.correlation_id','trace',true)", String.class);
            database.update("INSERT INTO notification_service.mail_templates(template_key,subject_template,body_template) VALUES (?,'Before','Body')", template);
            database.update("UPDATE notification_service.mail_templates SET subject_template='After' WHERE template_key=?", template);
            var audit = database.queryForMap("SELECT * FROM notification_service.configuration_audit WHERE template_key=? AND operation='UPDATE'", template);
            assertEquals("900002", audit.get("actor_id"));
            assertEquals("trace", audit.get("correlation_id"));
            assertNotEquals(audit.get("before_digest"), audit.get("after_digest"));
        });
        assertEquals(0L, database.queryForObject("SELECT count(*) FROM notification_service.configuration_audit WHERE template_key=?", Long.class, template));
    }

    private ObjectNode refund() {
        var payload = json.createObjectNode().put("refundId", 5).put("orderId", 42).put("storeId", 3)
                .put("customerId", 7).put("orderCode", "CLK-42").put("status", "REFUNDED").put("amount", 25000);
        payload.putObject("recipient").put("userId", 7).put("role", "CUSTOMER")
                .put("email", "customer@example.com").put("emailVerified", true);
        return payload;
    }

    private void consume(String type, String source, String eventId, ObjectNode payload) {
        when(mapper.fromJson("event", type)).thenReturn(new DomainEvent(eventId, "trace", type, source, Instant.now(), payload));
        new NotificationConsumer(mapper, repository, sender, jdbc, "https://clucky.example", contacts).consume(new ConsumerRecord<>(type, 0, 0, "42", "event"), null);
    }

    private void actor(String role, long userId) {
        var token = Jwt.withTokenValue("test").header("alg", "HS256").subject(String.valueOf(userId)).claim("role", role).build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(token, List.of()));
    }
}
