package com.clucky.paymentservice.service;

import com.clucky.paymentservice.config.CurrentActor;
import com.clucky.paymentservice.dto.DomainEvent;
import com.clucky.paymentservice.dto.Role;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CounterCollectionRegressionTest {
    @Test
    void counterOperationReplayReturnsItsStoredCollectionWithoutWritingAgain() throws Exception {
        var jdbc = mock(JdbcTemplate.class);
        var flow = mock(PaymentFlow.class);
        var mapper = new ObjectMapper().findAndRegisterModules();
        var service = new PaymentOperations(jdbc, mapper, flow);
        var actor = new CurrentActor(5L, Role.STAFF, 2L);
        var version = Instant.parse("2026-11-10T00:00:00Z");
        var amount = new BigDecimal("100000");
        var order = new PaymentFlow.Context(10L, "ORDER-10", null, 2L, amount, "CONFIRMED",
                "CASH", "PENDING", null, version, "COUNTER", "PICKUP");
        UUID key = UUID.randomUUID(), collectionId = UUID.randomUUID();
        String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(
                ("counter-collect:10" + mapper.writeValueAsString(List.of(version, amount, BigDecimal.ZERO,
                        amount, BigDecimal.ZERO, "Cash collection"))).getBytes(StandardCharsets.UTF_8)));
        when(jdbc.queryForList(startsWith("SELECT request_hash,response"), eq(5L), eq(key)))
                .thenReturn(List.of(Map.of("request_hash", hash, "response", "{\"collectionId\":\"" + collectionId + "\"}")));
        assertEquals(collectionId, service.createCounterCollection(10L, order, actor, amount, BigDecimal.ZERO,
                amount, BigDecimal.ZERO, "Cash collection", key));
        verify(jdbc, never()).update(anyString(), any(Object[].class));
        verifyNoInteractions(flow);
    }

    @Test
    void anonymousCounterDecisionsAcceptBothMissingAndNullCustomer() {
        for (boolean explicitNull : List.of(false, true)) {
            var jdbc = mock(JdbcTemplate.class);
            var flow = mock(PaymentFlow.class);
            var mapper = new ObjectMapper();
            var service = new PaymentOperations(jdbc, mapper, flow);
            UUID collectionId = UUID.randomUUID();
            var row = new HashMap<String, Object>(Map.of("status", "PENDING", "store_id", 2L, "order_code", "ORDER-10",
                    "amount", new BigDecimal("100000"), "cash_amount", new BigDecimal("100000"), "transfer_amount", BigDecimal.ZERO));
            row.put("customer_id", null);
            when(jdbc.queryForList(startsWith("SELECT * FROM payment_service.collections"), eq(collectionId), eq(10L))).thenReturn(List.of(row));
            var payload = mapper.createObjectNode().put("collectionId", collectionId.toString()).put("orderId", 10L)
                    .put("storeId", 2L).put("orderCode", "ORDER-10").put("decision", "ACCEPTED");
            if (explicitNull) payload.putNull("customerId");
            var event = new DomainEvent(UUID.randomUUID().toString(), "counter-regression", "order.payment-resolved",
                    "cart-order-service", Instant.now(), payload);
            assertDoesNotThrow(() -> service.resolve(event));
            verify(jdbc).update(startsWith("UPDATE payment_service.counter_payment_receipts SET collection_status="), eq("ACCEPTED"), eq(collectionId));
            verify(flow).enqueue(eq("payment.confirmed"), eq(10L), any());
        }
    }
}
