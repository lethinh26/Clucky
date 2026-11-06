package com.clucky.notificationservice;

import com.clucky.notificationservice.config.MailSenderProperties;
import com.clucky.notificationservice.entity.EmailLog;
import com.clucky.notificationservice.entity.MailTemplate;
import com.clucky.notificationservice.repository.EmailLogRepository;
import com.clucky.notificationservice.repository.MailTemplateRepository;
import com.clucky.notificationservice.service.EmailSenderService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Map;
import java.util.Optional;
import java.util.Properties;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@EnabledIfEnvironmentVariable(named = "CLUCKY_TEST_DB_URL", matches = ".+")
class EmailDeliveryPostgresTest {
    @Test
    void queueDeduplicatesAndSendsOutsideTheClaimTransaction() {
        var source = new DriverManagerDataSource(System.getenv("CLUCKY_TEST_DB_URL"), "postgres", System.getenv("CLUCKY_TEST_DB_PASSWORD"));
        Flyway.configure().dataSource(source).schemas("notification_service").locations("classpath:db/migration").load().migrate();
        var jdbc = new JdbcTemplate(source);
        var logs = mock(EmailLogRepository.class);
        when(logs.findById(anyLong())).thenAnswer(call -> Optional.ofNullable(jdbc.queryForObject(
                "SELECT * FROM notification_service.email_logs WHERE id = ?", (row, index) -> {
                    var email = new EmailLog();
                    email.setId(row.getLong("id"));
                    email.setToEmail(row.getString("to_email"));
                    email.setTemplate(row.getString("template"));
                    email.setVariables(row.getString("variables"));
                    email.setRetryCount(row.getInt("retry_count"));
                    return email;
                }, (Long) call.getArgument(0))));
        var templates = mock(MailTemplateRepository.class);
        var template = new MailTemplate();
        template.setSubjectTemplate("Order {{orderCode}}");
        template.setBodyTemplate("Completed {{orderCode}}");
        when(templates.findByTemplateKeyAndIsActiveTrue("ORDER_COMPLETED")).thenReturn(Optional.of(template));
        var mail = mock(JavaMailSender.class);
        when(mail.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        doAnswer(call -> {
            assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
            return null;
        }).when(mail).send(any(MimeMessage.class));
        var properties = new MailSenderProperties(true, "smtp.gmail.com", 587, "sender@example.com", "test-only-password", "Clucky", 8000, 3);
        var service = new EmailSenderService(properties, mail, logs, templates, new ObjectMapper(), jdbc, new DataSourceTransactionManager(source));
        String messageId = UUID.randomUUID().toString();
        for (int attempt = 0; attempt < 2; attempt++) {
            service.processEmailIntent(messageId, "event", "correlation", "customer@example.com", "ORDER_COMPLETED", Map.of("orderCode", "123"));
        }
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM notification_service.email_logs WHERE message_id = ?", Integer.class, messageId));
        verifyNoInteractions(mail);
        service.dispatchNext();
        service.dispatchNext();
        verify(mail, times(1)).send(any(MimeMessage.class));
        assertEquals("SENT", jdbc.queryForObject("SELECT status FROM notification_service.email_logs WHERE message_id = ?", String.class, messageId));
        String retryId = UUID.randomUUID().toString();
        service.processEmailIntent(retryId, "event-retry", "correlation", "customer@example.com", "ORDER_COMPLETED", Map.of("orderCode", "124"));
        doThrow(new org.springframework.mail.MailSendException("connection refused", new java.net.ConnectException()))
                .when(mail).send(any(MimeMessage.class));
        service.dispatchNext();
        assertEquals("QUEUED", jdbc.queryForObject("SELECT status FROM notification_service.email_logs WHERE message_id = ?", String.class, retryId));
        assertEquals(1, jdbc.queryForObject("SELECT retry_count FROM notification_service.email_logs WHERE message_id = ?", Integer.class, retryId));
        String unknownId = UUID.randomUUID().toString();
        service.processEmailIntent(unknownId, "event-unknown", "correlation", "customer@example.com", "ORDER_COMPLETED", Map.of("orderCode", "125"));
        doThrow(new org.springframework.mail.MailSendException("provider returned sensitive diagnostic"))
                .when(mail).send(any(MimeMessage.class));
        service.dispatchNext();
        assertEquals("FAILED", jdbc.queryForObject("SELECT status FROM notification_service.email_logs WHERE message_id = ?", String.class, unknownId));
        assertEquals("SMTP_OUTCOME_UNKNOWN", jdbc.queryForObject("SELECT last_error FROM notification_service.email_logs WHERE message_id = ?", String.class, unknownId));
    }
}
