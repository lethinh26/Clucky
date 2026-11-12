package com.clucky.notificationservice;

import com.clucky.notificationservice.service.EmailTemplateRenderer;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;

class EmailTemplateRendererTest {
    @Test
    void allNineteenTemplatesUseTheApprovedLayoutAndOnlyTransactionsHaveButtons() throws Exception {
        var renderer = new EmailTemplateRenderer("https://clucky.example");
        String sql = new ClassPathResource("db/migration/V14__refined_email_templates.sql")
                .getContentAsString(StandardCharsets.UTF_8);
        var templates = Pattern.compile("\\('([^']+)'\\s*,\\s*'((?:[^']|'')*)'\\s*,\\s*'((?:[^']|'')*)'\\s*,true\\)", Pattern.DOTALL).matcher(sql);
        var keys = new HashSet<String>();
        while (templates.find()) {
            String key = templates.group(1);
            keys.add(key);
            var variables = new HashMap<>(Map.of("orderCode", "CLK-42", "orderId", "42", "customerName", "<script>alert(1)</script>",
                    "amount", "125000", "reason", "Món <hết> & cần đổi", "readyInstruction", "Nhận tại cửa hàng",
                    "paymentExplanation", "Chưa xác nhận", "orderItems", "[{\"itemName\":\"Gà & <khoai>\",\"quantity\":2,\"unitPrice\":65000,\"lineTotal\":130000}]", "orderUrl", "https://evil.example"));
            variables.putAll(Map.of("otp", key.startsWith("BRANCH_") ? "12345678" : "123456", "login", "branch<3>",
                    "role", "STORE_MANAGER", "accountId", "3", "challengeId", "challenge-3"));
            var rendered = renderer.render(key, templates.group(2), templates.group(3), variables, "challenge.primary", Instant.parse("2026-11-12T03:00:00Z"));
            assertFalse(rendered.get("html").contains("{{"), key);
            assertFalse(rendered.get("body").contains("{{"), key);
            assertTrue(rendered.get("html").contains("cid:clucky-logo-v1"), key);
            assertFalse(rendered.get("html").contains("<script>"), key);
            assertFalse(rendered.get("html").contains("evil.example"), key);
            assertTrue(rendered.get("html").contains("width=\"80\" height=\"80\""), key);
            assertTrue(rendered.get("html").contains("max-width:560px"), key);
            assertTrue(rendered.get("html").contains("background:#F7F5F2"), key);
            if (key.startsWith("BRANCH_") || key.endsWith("-otp")) {
                assertTrue(rendered.get("body").contains(variables.get("otp")), key);
                assertTrue(rendered.get("html").contains("10:00:00 12/11/2026"), key);
                assertFalse(rendered.get("subject").contains(variables.get("otp")), key);
                assertFalse(rendered.get("html").contains("href="), key);
                assertFalse(rendered.get("body").contains("https://"), key);
                assertFalse(rendered.get("html").contains("Mở ứng dụng"), key);
                assertTrue(rendered.get("body").contains("Không chia sẻ mã"), key);
            } else {
                assertTrue(rendered.get("html").contains("<td align=\"center\" bgcolor=\"#8F1216\""), key);
                assertTrue(rendered.get("html").contains("href=\"https://clucky.example/orders/42\""), key);
                assertTrue(rendered.get("body").contains("https://clucky.example/orders/42"), key);
                assertFalse(rendered.get("html").contains("href=\"http://localhost"), key);
                if (key.startsWith("ORDER_")) {
                    assertTrue(rendered.get("html").contains("<th scope=\"col\""), key);
                    assertTrue(rendered.get("html").contains("Gà &amp; &lt;khoai&gt;"), key);
                    assertTrue(rendered.get("body").contains("Gà & <khoai>"), key);
                }
            }
        }
        assertEquals(Set.of("register-otp", "reset-password-otp", "ORDER_CREATED", "ORDER_CONFIRMED", "ORDER_PREPARING", "ORDER_READY",
                "ORDER_COMPLETED", "ORDER_CANCELLED", "PAYMENT_CONFIRMED", "PAYMENT_FAILED", "REFUND_APPROVED", "REFUND_REJECTED",
                "REFUND_WAITING_BANK_DETAILS", "REFUND_PROCESSED", "BRANCH_ACTIVATE", "BRANCH_RESET", "BRANCH_RECOVERY",
                "BRANCH_ADMIN_RESET", "BRANCH_ADMIN_RECOVERY"), keys);
    }

    @Test
    void securityPurposesAndConfiguredOriginsAreValidated() throws Exception {
        for (String purpose : Set.of("ACTIVATE", "RESET", "RECOVERY", "ADMIN_RESET", "ADMIN_RECOVERY")) {
            assertEquals("BRANCH_" + purpose, EmailTemplateRenderer.templateKey("branch-security", Map.of("purpose", purpose)));
        }
        assertThrows(IllegalArgumentException.class, () -> EmailTemplateRenderer.templateKey("branch-security", Map.of("purpose", "UNKNOWN")));
        assertThrows(IllegalArgumentException.class, () -> new EmailTemplateRenderer("javascript:alert(1)"));
        assertThrows(IllegalArgumentException.class, () -> new EmailTemplateRenderer("https://user@clucky.example"));
        var renderer = new EmailTemplateRenderer("https://clucky.example");
        assertThrows(IllegalArgumentException.class, () -> renderer.render("register-otp", "Subject\r\nBcc: other@example.com", "Body", Map.of(), "id", Instant.now()));
        var variables = Map.of("otp", "12345678", "login", "branch", "role", "STORE_MANAGER", "accountId", "3", "challengeId", "id");
        assertTrue(renderer.render("BRANCH_RECOVERY", "Recovery", "{{channelInstruction}}", variables, "id.secondary", Instant.now())
                .get("body").contains("địa chỉ email khôi phục mới"));
        assertThrows(IllegalArgumentException.class, () -> renderer.render("BRANCH_RESET", "Reset", "Body", variables, "id.unknown", Instant.now()));
    }

    @Test
    void orderTotalsAndPaymentCopyPreserveTheActualTransactionState() throws Exception {
        var renderer = new EmailTemplateRenderer("https://clucky.example");
        var values = new HashMap<>(Map.of("orderCode", "CL-128", "orderId", "128", "orderType", "PICKUP",
                "orderItems", "[{\"itemName\":\"Burger gà\",\"quantity\":2,\"unitPrice\":65000,\"lineTotal\":130000}]",
                "subtotal", "160000", "discountAmount", "20000", "totalAmount", "140000", "paymentMethod", "COD", "paymentStatus", "PENDING"));
        var rendered = renderer.render("ORDER_CONFIRMED", "Clucky — Đơn CL-128", "Đơn đã được xác nhận.", values, "id", null);
        for (String text : new String[]{"Nhận tại cửa hàng", "160.000", "−20.000", "140.000", "2 × 65.000", "Chưa xác nhận thanh toán"}) {
            assertTrue(rendered.get("html").contains(text), text);
            assertTrue(rendered.get("body").contains(text), text);
        }
        assertFalse(rendered.get("html").contains("Đã thanh toán"));
        values.put("paymentStatus", "COLLECTED");
        values.put("paymentMethod", "MIXED");
        values.put("moreItems", "true");
        var collected = renderer.render("ORDER_COMPLETED", "Done", "Done", values, "id", null);
        assertTrue(collected.get("html").contains("chờ đối soát"));
        assertTrue(collected.get("html").contains("Các món còn lại"));
        values.put("orderId", "42\" onclick=\"alert(1)");
        assertTrue(renderer.render("ORDER_CONFIRMED", "Order", "Body", values, "id", null)
                .get("html").contains("href=\"https://clucky.example/orders\""));
        values.put("orderItems", "[{\"itemName\":\"Bad\",\"quantity\":-1}]");
        assertThrows(IllegalArgumentException.class, () -> renderer.render("ORDER_CONFIRMED", "Order", "Body", values, "id", null));
    }
}
