package com.clucky.identityservice.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;

class IdentityAuditServiceTest {
    @Test
    void writesCustomerAuditToExistingOutboxWithoutContactOrCredentials() throws Exception {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        ObjectMapper mapper = new ObjectMapper();
        IdentityAuditService audit = new IdentityAuditService(jdbc, mapper);

        audit.record(1L, "ADMIN", null, "session-1", "CUSTOMER_LOCKED", 42L, "Customer",
                Map.of("beforeStatus", "ACTIVE", "afterStatus", "LOCKED", "reason", "Violation", "result", "SUCCESS"),
                "correlation-1");

        ArgumentCaptor<String> payload = ArgumentCaptor.forClass(String.class);
        verify(jdbc).update(eq("INSERT INTO identity_service.branch_outbox(event_id,correlation_id,payload) VALUES (?,?,?::jsonb)"),
                any(UUID.class), eq("correlation-1"), payload.capture());
        var event = mapper.readTree(payload.getValue());
        assertEquals(1L, event.path("actorId").asLong());
        assertEquals(42L, event.path("targetId").asLong());
        assertEquals("CUSTOMER_LOCKED", event.path("action").asText());
        assertEquals("session-1", event.path("detail").path("sessionId").asText());
        assertEquals("Violation", event.path("detail").path("reason").asText());
        assertFalse(event.has("storeId"));
        assertFalse(payload.getValue().contains("password"));
        assertFalse(payload.getValue().contains("token"));
        assertFalse(payload.getValue().contains("email"));
    }

    @Test
    void outboxFailureIsNotSwallowedSoAccountTransactionCanRollback() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.update(anyString(), any(UUID.class), anyString(), anyString()))
                .thenThrow(new DataAccessResourceFailureException("outbox unavailable"));
        IdentityAuditService audit = new IdentityAuditService(jdbc, new ObjectMapper());
        assertThrows(DataAccessResourceFailureException.class, () -> audit.record(1L, "ADMIN", null, null,
                "CUSTOMER_LOCKED", 42L, "Customer", Map.of("result", "SUCCESS"), "unsafe correlation\n"));
    }
}
