package com.clucky.notificationservice;

import com.clucky.notificationservice.entity.MailTemplate;
import com.clucky.notificationservice.repository.MailTemplateRepository;
import com.clucky.notificationservice.service.EmailFailurePublisher;
import com.clucky.notificationservice.service.EmailLogService;
import com.clucky.notificationservice.service.EmailSenderService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@EnabledIfEnvironmentVariable(named = "CLUCKY_TEST_DB_URL", matches = ".+")
class EmailDeliveryPostgresTest {
    private String mailText(jakarta.mail.Part part, String type) throws Exception {
        if (part.isMimeType(type)) return part.getContent().toString();
        if (part.getContent() instanceof jakarta.mail.Multipart multipart) {
            for (int index = 0; index < multipart.getCount(); index++) {
                String result = mailText(multipart.getBodyPart(index), type);
                if (!result.isEmpty()) return result;
            }
        }
        return "";
    }

    @Test
    void deliveryLedgerOutboxScopeAndManualRetryStayConsistent() throws Exception {
        var source = new DriverManagerDataSource(System.getenv("CLUCKY_TEST_DB_URL"), "postgres", System.getenv("CLUCKY_TEST_DB_PASSWORD"));
        Flyway.configure().dataSource(source).schemas("notification_service").locations("classpath:db/migration").load().migrate();
        var jdbc = new JdbcTemplate(source);
        var manager = new DataSourceTransactionManager(source);
        var transactions = new TransactionTemplate(manager);
        var templates = mock(MailTemplateRepository.class);
        var template = new MailTemplate();
        template.setSubjectTemplate("Order {{orderCode}}");
        template.setBodyTemplate("Completed {{orderCode}}");
        when(templates.findByTemplateKeyAndIsActiveTrue("ORDER_COMPLETED")).thenReturn(Optional.of(template));
        var mail = mock(JavaMailSender.class);
        when(mail.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        doAnswer(call -> { assertFalse(TransactionSynchronizationManager.isActualTransactionActive()); return null; }).when(mail).send(any(MimeMessage.class));
        var metrics = new SimpleMeterRegistry();
        var service = new EmailSenderService(EmailDeliverySafetyTest.settings(), mail, templates, new ObjectMapper(), jdbc,
                manager, EmailDeliverySafetyTest.codec(), metrics,
                new com.clucky.notificationservice.service.EmailTemplateRenderer("https://clucky.example"));
        String messageId = UUID.randomUUID().toString();
        for (int attempt = 0; attempt < 2; attempt++) {
            service.processEmailIntent(messageId, "event", "trace", "customer@example.com", "ORDER_COMPLETED", Map.of("orderCode", "123"), 3L, null);
        }
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM notification_service.email_logs WHERE message_id=?", Integer.class, messageId));
        assertThrows(IllegalArgumentException.class, () -> service.processEmailIntent(messageId, "event", "trace", "other@example.com", "ORDER_COMPLETED", Map.of("orderCode", "123"), 3L, null));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM notification_service.email_command_conflicts WHERE message_id=?", Integer.class, messageId));
        template.setBodyTemplate("Changed after enqueue");
        service.dispatchNext();
        var sent = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mail).send(sent.capture());
        var rawMessage = new java.io.ByteArrayOutputStream();
        sent.getValue().writeTo(rawMessage);
        String mime = rawMessage.toString(java.nio.charset.StandardCharsets.UTF_8);
        assertTrue(mime.contains("multipart/alternative"));
        assertTrue(mime.contains("Content-ID: <clucky-logo-v1>"));
        assertTrue(mime.contains("image/png"));
        assertTrue(mailText(sent.getValue(), "text/plain").startsWith("Completed 123"));
        assertTrue(mailText(sent.getValue(), "text/html").contains("cid:clucky-logo-v1"));
        assertFalse(mailText(sent.getValue(), "text/html").contains("Changed after enqueue"));
        var delivery = jdbc.queryForMap("SELECT * FROM notification_service.email_logs WHERE message_id=?", messageId);
        assertEquals("SENT", delivery.get("status"));
        assertNull(delivery.get("variables"));

        String failedId = UUID.randomUUID().toString();
        service.processEmailIntent(failedId, "event-failed", "trace", "customer@example.com", "ORDER_COMPLETED", Map.of("orderCode", "124"), 3L, null);
        doThrow(new org.springframework.mail.MailSendException("secret-provider-message", new java.net.ConnectException())).when(mail).send(any(MimeMessage.class));
        for (int attempt = 0; attempt < 3; attempt++) {
            jdbc.update("UPDATE notification_service.email_logs SET next_attempt_at=now() WHERE message_id=?", failedId);
            service.dispatchNext();
        }
        long id = jdbc.queryForObject("SELECT id FROM notification_service.email_logs WHERE message_id=?", Long.class, failedId);
        assertEquals("FAILED", jdbc.queryForObject("SELECT status FROM notification_service.email_logs WHERE id=?", String.class, id));
        assertEquals(3, jdbc.queryForObject("SELECT count(*) FROM notification_service.email_attempts WHERE delivery_id=?", Integer.class, id));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM notification_service.email_failure_outbox WHERE delivery_id=?", Integer.class, id));

        var kafka = mock(KafkaTemplate.class);
        when(kafka.send(any(ProducerRecord.class))).thenReturn(CompletableFuture.failedFuture(new IllegalStateException("broker down")));
        var publisher = new EmailFailurePublisher(jdbc, kafka, new ObjectMapper(), EmailDeliverySafetyTest.settings(), manager, metrics);
        publisher.publishNext();
        assertNull(jdbc.queryForMap("SELECT * FROM notification_service.email_failure_outbox WHERE delivery_id=?", id).get("published_at"));
        jdbc.update("UPDATE notification_service.email_failure_outbox SET next_attempt_at=now() WHERE delivery_id=?", id);
        when(kafka.send(any(ProducerRecord.class))).thenReturn(CompletableFuture.completedFuture(null));
        publisher.publishNext();
        var records = ArgumentCaptor.forClass(ProducerRecord.class);
        verify(kafka, times(2)).send(records.capture());
        assertEquals(records.getAllValues().getFirst().value(), records.getAllValues().getLast().value());
        assertFalse(records.getValue().value().toString().contains("customer@example.com"));
        assertFalse(records.getValue().value().toString().contains("secret-provider-message"));

        var logs = new EmailLogService(jdbc, EmailDeliverySafetyTest.settings());
        try {
            actor("STORE_MANAGER", 4L);
            assertEquals(0, logs.list(0, 20, null, "FAILED", "ORDER_COMPLETED", null, null).totalElements());
            assertThrows(com.clucky.notificationservice.exception.ApiException.class, () -> logs.detail(id));
            actor("STORE_MANAGER", 3L);
            assertFalse(logs.detail(id).delivery().canRetry());
            actor("ADMIN", null);
            UUID requestId = UUID.randomUUID();
            assertFalse(transactions.execute(transaction -> logs.retry(id, 0, requestId)).replayed());
            assertTrue(transactions.execute(transaction -> logs.retry(id, 0, requestId)).replayed());
            assertThrows(com.clucky.notificationservice.exception.ApiException.class,
                    () -> transactions.execute(transaction -> logs.retry(id, 0, UUID.randomUUID())));
            doThrow(new org.springframework.mail.MailSendException("uncertain", new java.net.SocketTimeoutException())).when(mail).send(any(MimeMessage.class));
            service.dispatchNext();
            assertEquals("OUTCOME_UNKNOWN", logs.detail(id).delivery().retryBlockedReason());
            assertEquals(2, logs.detail(id).failures().size());

            String concurrentId = UUID.randomUUID().toString();
            service.processEmailIntent(concurrentId, "concurrent-event", "trace", "customer@example.com", "ORDER_COMPLETED",
                    Map.of("orderCode", "125"), 3L, null);
            var entered = new java.util.concurrent.CountDownLatch(1);
            var release = new java.util.concurrent.CountDownLatch(1);
            doAnswer(call -> {
                assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
                entered.countDown();
                assertTrue(release.await(10, java.util.concurrent.TimeUnit.SECONDS));
                return null;
            }).when(mail).send(any(MimeMessage.class));
            try (var workers = java.util.concurrent.Executors.newFixedThreadPool(2)) {
                var firstWorker = workers.submit(service::dispatchNext);
                try {
                    assertTrue(entered.await(10, java.util.concurrent.TimeUnit.SECONDS));
                    workers.submit(service::dispatchNext).get(5, java.util.concurrent.TimeUnit.SECONDS);
                    assertEquals(1, jdbc.queryForObject("SELECT attempt_count FROM notification_service.email_logs WHERE message_id=?", Integer.class, concurrentId));
                    jdbc.update("UPDATE notification_service.email_logs SET lease_until=now()-interval '1 second' WHERE message_id=?", concurrentId);
                    workers.submit(service::dispatchNext).get(5, java.util.concurrent.TimeUnit.SECONDS);
                } finally {
                    release.countDown();
                }
                firstWorker.get(5, java.util.concurrent.TimeUnit.SECONDS);
            }
            assertEquals("SMTP_OUTCOME_UNKNOWN", jdbc.queryForObject("SELECT last_error FROM notification_service.email_logs WHERE message_id=?", String.class, concurrentId));

            String expiredId = UUID.randomUUID().toString();
            service.processEmailIntent(expiredId, "expired-event", "trace", "customer@example.com", "register-otp",
                    Map.of("otp", "912837", "expiresAt", Instant.now().minusSeconds(10).toString()), null, Instant.now().minusSeconds(10));
            var expired = jdbc.queryForMap("SELECT * FROM notification_service.email_logs WHERE message_id=?", expiredId);
            assertEquals("EXPIRED", expired.get("status"));
            assertNull(expired.get("variables"));
            assertNull(expired.get("store_id"));
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private void actor(String role, Long storeId) {
        var builder = Jwt.withTokenValue("test").header("alg", "HS256").subject("900001")
                .claim("role", role).issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60));
        if (storeId != null) builder.claim("storeId", storeId);
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(builder.build(), java.util.List.of()));
    }
}
