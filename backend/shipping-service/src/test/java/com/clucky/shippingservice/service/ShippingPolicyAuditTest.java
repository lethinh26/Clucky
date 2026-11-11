package com.clucky.shippingservice.service;

import com.clucky.shippingservice.controller.ShippingController;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ShippingPolicyAuditTest {
    @Test
    void recordsFeeVersionActorAndCorrelationInsidePolicyTransaction() throws Exception {
        var jdbc = mock(JdbcTemplate.class);
        var mapper = new ObjectMapper().findAndRegisterModules();
        var service = new ShippingPolicyAudit(jdbc, mapper, mock(KafkaTemplate.class), mock(PlatformTransactionManager.class));
        var jwt = Jwt.withTokenValue("test").header("alg", "none").subject("42").claim("role", "ADMIN").build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt, List.of()));
        try {
            service.record(new BigDecimal("25000"), 3);
            var envelope = ArgumentCaptor.forClass(String.class);
            verify(jdbc).update(eq("INSERT INTO shipping_service.audit_outbox(event_id,envelope) VALUES (?,?::jsonb)"),
                    any(java.util.UUID.class), envelope.capture());
            var event = mapper.readTree(envelope.getValue());
            assertEquals("shipping-service", event.path("sourceService").asText());
            assertEquals("audit.recorded", event.path("eventType").asText());
            assertTrue(event.path("correlationId").asText().matches("[A-Za-z0-9._-]{1,128}"));
            assertEquals(42, event.path("payload").path("actorId").asLong());
            assertEquals(25000, event.path("payload").path("detail").path("fee").asInt());
            assertEquals(3, event.path("payload").path("detail").path("version").asLong());
            assertTrue(ShippingController.class.getMethod("savePolicy", ShippingController.PolicyRequest.class)
                    .isAnnotationPresent(Transactional.class));
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
