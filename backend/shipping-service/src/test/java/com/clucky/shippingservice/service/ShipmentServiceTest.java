package com.clucky.shippingservice.service;

import com.clucky.shippingservice.config.AccessGuard;
import com.clucky.shippingservice.dto.DomainEvent;
import com.clucky.shippingservice.mapper.EventMapper;
import com.clucky.shippingservice.repository.ShipmentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.validation.Validation;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.slf4j.MDC;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.support.Acknowledgment;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ShipmentServiceTest {
    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final ShipmentServiceTemplate service = new ShipmentServiceTemplate(mock(ShipmentRepository.class), new AccessGuard(), jdbc, mapper);

    @BeforeEach
    void setup() {
        when(jdbc.update(startsWith("INSERT INTO shipping_service.order_created_receipts"), any(Object[].class))).thenReturn(1);
        when(jdbc.queryForList(startsWith("INSERT INTO shipping_service.shipments"), eq(Long.class), any(Object[].class))).thenReturn(List.of(70L));
    }

    @Test
    void createsDeliveryFromSnapshotAndIgnoresExtraPayload() {
        ObjectNode payload = payload().put("providerSecret", "FAKE_SECRET_NOT_A_CREDENTIAL");
        service.createFromOrder(event("event-1", payload));
        ArgumentCaptor<Object[]> arguments = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).queryForList(startsWith("INSERT INTO shipping_service.shipments"), eq(Long.class), arguments.capture());
        Object[] values = arguments.getValue();
        assertEquals(42L, values[0]);
        assertEquals(20L, values[1]);
        assertEquals(2L, values[2]);
        assertEquals("event-1", values[3]);
        assertEquals(new BigDecimal("15000"), values[7]);
        assertEquals(new BigDecimal("200000"), values[8]);
        assertEquals(0.0, values[9]);
        assertEquals(106.7, values[10]);
        assertFalse(java.util.Arrays.toString(values).contains("FAKE_SECRET"));
        verify(jdbc).update(startsWith("INSERT INTO shipping_service.shipment_status_history"), eq(70L));
    }

    @Test
    void bankTransferHasNoCodAndOlderEventMayOmitBothCoordinates() {
        ObjectNode payload = payload().put("paymentMethod", "BANK_TRANSFER").put("deliveryAddress", "A".repeat(2001));
        payload.remove(List.of("latitude", "longitude"));
        service.createFromOrder(event("event-1", payload));
        ArgumentCaptor<Object[]> arguments = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).queryForList(startsWith("INSERT INTO shipping_service.shipments"), eq(Long.class), arguments.capture());
        assertEquals("A".repeat(2001), arguments.getValue()[6]);
        assertEquals(BigDecimal.ZERO, arguments.getValue()[8]);
        assertNull(arguments.getValue()[9]);
        assertNull(arguments.getValue()[10]);
    }

    @Test
    void pickupRecordsReceiptWithoutCreatingShipment() {
        service.createFromOrder(event("event-1", payload().put("type", "PICKUP").put("shippingFee", 0)));
        verify(jdbc).update(startsWith("INSERT INTO shipping_service.order_created_receipts"), any(Object[].class));
        verify(jdbc, never()).queryForList(startsWith("INSERT INTO shipping_service.shipments"), eq(Long.class), any(Object[].class));
        verify(jdbc, never()).update(startsWith("INSERT INTO shipping_service.shipment_status_history"), any(Object[].class));
    }

    @Test
    void replayAndDifferentEventIdForSameSnapshotDoNotCreateAgain() {
        service.createFromOrder(event("event-1", payload()));
        ArgumentCaptor<Object[]> arguments = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).update(startsWith("INSERT INTO shipping_service.order_created_receipts"), arguments.capture());
        Map<String, Object> saved = Map.of("order_id", 42L, "fingerprint", arguments.getValue()[2]);
        clearInvocations(jdbc);
        when(jdbc.queryForList(startsWith("SELECT order_id"), any(Object[].class))).thenReturn(List.of(saved));
        when(jdbc.queryForMap(startsWith("SELECT order_id"), any(Object[].class))).thenReturn(saved);
        when(jdbc.update(startsWith("INSERT INTO shipping_service.order_created_receipts"), any(Object[].class))).thenReturn(0, 1);
        service.createFromOrder(event("event-1", payload()));
        service.createFromOrder(event("event-2", payload()));
        verify(jdbc, never()).queryForList(startsWith("INSERT INTO shipping_service.shipments"), eq(Long.class), any(Object[].class));
        verify(jdbc, never()).update(startsWith("INSERT INTO shipping_service.shipment_status_history"), any(Object[].class));
    }

    @Test
    void conflictingSnapshotOrConcurrentEventIdentityIsRejected() {
        when(jdbc.queryForList(startsWith("SELECT order_id"), any(Object[].class)))
                .thenReturn(List.of(Map.of("order_id", 42L, "fingerprint", "different")));
        assertThrows(IllegalArgumentException.class, () -> service.createFromOrder(event("event-1", payload())));
        verify(jdbc, never()).update(startsWith("INSERT INTO shipping_service.order_created_receipts"), any(Object[].class));
        when(jdbc.queryForList(startsWith("SELECT order_id"), any(Object[].class))).thenReturn(List.of());
        when(jdbc.update(startsWith("INSERT INTO shipping_service.order_created_receipts"), any(Object[].class))).thenReturn(0);
        when(jdbc.queryForMap(startsWith("SELECT order_id"), any(Object[].class)))
                .thenReturn(Map.of("order_id", 99L, "fingerprint", "different"));
        assertThrows(IllegalArgumentException.class, () -> service.createFromOrder(event("event-1", payload())));
        verify(jdbc, never()).queryForList(startsWith("INSERT INTO shipping_service.shipments"), eq(Long.class), any(Object[].class));
    }

    @Test
    void legacyShipmentConflictIsNotOverwritten() {
        when(jdbc.queryForList(startsWith("INSERT INTO shipping_service.shipments"), eq(Long.class), any(Object[].class))).thenReturn(List.of());
        assertThrows(IllegalArgumentException.class, () -> service.createFromOrder(event("event-1", payload())));
        verify(jdbc, never()).update(startsWith("UPDATE shipping_service.shipments"), any(Object[].class));
    }

    @Test
    void malformedFieldsAndUntrustedSourceDoNotTouchDatabase() {
        for (ObjectNode invalid : List.of(payload().put("orderId", "42"), payload().put("storeId", 0),
                payload().put("customerId", 1.5), payload().putNull("receiverName"), payload().put("type", "OTHER"),
                payload().put("paymentMethod", "UNKNOWN"), payload().put("shippingFee", -1),
                payload().put("totalAmount", "200000"), payload().put("shippingFee", new BigDecimal("1.5")),
                payload().put("totalAmount", new BigDecimal("1000000000000")), payload().put("latitude", 91),
                payload().putNull("longitude"), payload().put("type", "PICKUP"))) {
            assertThrows(IllegalArgumentException.class, () -> service.createFromOrder(event("event-1", invalid)));
        }
        assertThrows(IllegalArgumentException.class, () -> service.createFromOrder(new DomainEvent("event-1", "trace-1",
                "order.created", "untrusted-service", Instant.now(), payload())));
        verifyNoInteractions(jdbc);
    }

    @Test
    void parserRejectsDuplicateKeysAndDoesNotRoundFractionalMoneyIntoValidVnd() throws Exception {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            EventMapper events = new EventMapper(mapper, factory.getValidator());
            String json = mapper.writeValueAsString(event("event-1", payload()));
            assertThrows(IllegalArgumentException.class, () -> events.fromJson(
                    json.replace("\"orderId\":42", "\"orderId\":42,\"orderId\":43"), "order.created"));
            DomainEvent fractional = events.fromJson(json.replace("\"shippingFee\":15000", "\"shippingFee\":15000.00000000000000001"), "order.created");
            assertThrows(IllegalArgumentException.class, () -> service.createFromOrder(fractional));
            verifyNoInteractions(jdbc);
        }
    }

    @Test
    void consumerAcknowledgesOnlyAfterServiceReturnsAndRestoresTrace() {
        EventMapper events = mock(EventMapper.class);
        ShipmentServiceTemplate persistence = mock(ShipmentServiceTemplate.class);
        Acknowledgment acknowledgment = mock(Acknowledgment.class);
        DomainEvent event = event("event-1", payload());
        when(events.fromJson("{}", "order.created")).thenReturn(event);
        var consumer = new OrderCreatedConsumer(events, persistence);
        var record = new ConsumerRecord<>("order.created", 0, 7L, "42", "{}");
        var previous = MDC.getCopyOfContextMap();
        try {
            MDC.put("correlationId", "previous-trace");
            consumer.receive(record, acknowledgment);
            var sequence = inOrder(persistence, acknowledgment);
            sequence.verify(persistence).createFromOrder(event);
            sequence.verify(acknowledgment).acknowledge();
            assertEquals("previous-trace", MDC.get("correlationId"));
            clearInvocations(acknowledgment);
            doThrow(new DataAccessResourceFailureException("Database unavailable")).when(persistence).createFromOrder(event);
            assertThrows(DataAccessResourceFailureException.class, () -> consumer.receive(record, acknowledgment));
            verifyNoInteractions(acknowledgment);
            assertEquals("previous-trace", MDC.get("correlationId"));
        } finally {
            if (previous == null) MDC.clear();
            else MDC.setContextMap(previous);
        }
    }

    private ObjectNode payload() {
        return mapper.createObjectNode().put("orderId", 42).put("customerId", 20).put("storeId", 2)
                .put("type", "DELIVERY").put("receiverName", "Fixture Customer").put("receiverPhone", "0900000000")
                .put("deliveryAddress", "Fixture address").put("shippingFee", 15000).put("totalAmount", 200000)
                .put("paymentMethod", "COD").put("latitude", 0).put("longitude", 106.7);
    }

    private DomainEvent event(String eventId, ObjectNode payload) {
        return new DomainEvent(eventId, "trace-1", "order.created", "cart-order-service", Instant.parse("2026-11-09T00:00:00Z"), payload);
    }
}
