package com.clucky.notificationservice;

import com.clucky.notificationservice.entity.MailTemplate;
import com.clucky.notificationservice.repository.MailTemplateRepository;
import com.clucky.notificationservice.service.EmailTemplateRenderer;
import com.clucky.notificationservice.service.MailTemplateManagementService;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MailTemplateManagementServiceTest {
    @Test
    void rejectsUnsupportedSecurityVariablesAndHeaderInjectionBeforeRendering() throws Exception {
        var repository = mock(MailTemplateRepository.class);
        when(repository.findByTemplateKeyAndIsActiveTrue("register-otp")).thenReturn(Optional.of(new MailTemplate()));
        var service = new MailTemplateManagementService(mock(JdbcTemplate.class), repository,
                new EmailTemplateRenderer("https://clucky.example"));

        var badVariable = assertThrows(ResponseStatusException.class, () ->
                service.preview("register-otp", "Xác thực", "Mã là {{otp}}", "<p>Mã {{otp}}</p>"));
        assertEquals(HttpStatus.BAD_REQUEST, badVariable.getStatusCode());

        var headerInjection = assertThrows(ResponseStatusException.class, () ->
                service.preview("register-otp", "Xác thực\r\nBcc: attacker@example.com", "Nội dung", null));
        assertEquals(HttpStatus.BAD_REQUEST, headerInjection.getStatusCode());
    }

    @Test
    void generatesSanitizedPreviewWithoutSendingEmail() throws Exception {
        var repository = mock(MailTemplateRepository.class);
        when(repository.findByTemplateKeyAndIsActiveTrue("ORDER_READY")).thenReturn(Optional.of(new MailTemplate()));
        var service = new MailTemplateManagementService(mock(JdbcTemplate.class), repository,
                new EmailTemplateRenderer("https://clucky.example"));

        var preview = service.preview("ORDER_READY", "Đơn {{orderCode}}", "Chào {{customerName}}",
                "<p><strong>{{customerName}}</strong><script>alert(1)</script></p>");
        assertTrue(preview.html().contains("<strong>Nguyễn Văn A</strong>"));
        assertFalse(preview.html().contains("<script>"));
        assertTrue(preview.text().contains("Nguyễn Văn A"));
    }

    @Test
    void rejectsVariablesMissingFromRealOrderAndPaymentEvents() throws Exception {
        var repository = mock(MailTemplateRepository.class);
        for (String key : new String[]{"ORDER_CREATED", "ORDER_CONFIRMED", "ORDER_CANCELLED", "PAYMENT_CONFIRMED", "PAYMENT_FAILED"}) {
            when(repository.findByTemplateKeyAndIsActiveTrue(key)).thenReturn(Optional.of(new MailTemplate()));
        }
        var service = new MailTemplateManagementService(mock(JdbcTemplate.class), repository,
                new EmailTemplateRenderer("https://clucky.example"));
        for (String[] invalid : new String[][]{
                {"ORDER_CREATED", "readyInstruction"},
                {"ORDER_CONFIRMED", "reason"},
                {"ORDER_CANCELLED", "readyInstruction"},
                {"PAYMENT_CONFIRMED", "paymentExplanation"},
                {"PAYMENT_FAILED", "amount"},
        }) {
            var result = assertThrows(ResponseStatusException.class,
                    () -> service.preview(invalid[0], "Subject", "Body {{" + invalid[1] + "}}", null),
                    invalid[0]);
            assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        }
        assertDoesNotThrow(() -> service.preview("ORDER_CANCELLED", "Đơn {{orderCode}}",
                "Lý do: {{reason}}", null));
        assertDoesNotThrow(() -> service.preview("PAYMENT_FAILED", "Đơn {{orderCode}}",
                "Vui lòng xem: {{paymentExplanation}}", null));
    }
}
