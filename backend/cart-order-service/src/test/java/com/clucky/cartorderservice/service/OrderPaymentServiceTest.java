package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.config.AccessGuard;
import com.clucky.cartorderservice.dto.DomainEvent;
import com.clucky.cartorderservice.entity.Order;
import com.clucky.cartorderservice.entity.OrderStatusHistory;
import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OrderPaymentServiceTest {
    private final OrderRepository orders = mock(OrderRepository.class);
    private final OrderStatusHistoryRepository history = mock(OrderStatusHistoryRepository.class);
    private final OrderEventPublisher events = mock(OrderEventPublisher.class);
    private final OrderService compensation = mock(OrderService.class);
    private final AccessGuard access = mock(AccessGuard.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final ObjectMapper mapper = new ObjectMapper();
    private final OrderPaymentService service = new OrderPaymentService(orders, mock(OrderItemRepository.class), history,
            compensation, events, access, jdbc, mapper, Duration.ofMinutes(15));
    private final Order order = new Order();

    @BeforeEach
    void setup() {
        order.setId(10L); order.setOrderCode("ORD-10"); order.setCustomerId(1L); order.setStoreId(2L);
        order.setPaymentMethod("BANK_TRANSFER"); order.setStatus("PENDING_PAYMENT"); order.setTotalAmount(new BigDecimal("100000"));
        when(orders.lockById(10L)).thenReturn(Optional.of(order));
        when(orders.findById(10L)).thenReturn(Optional.of(order));
    }

    private DomainEvent receipt() {
        var payload = mapper.createObjectNode().put("paymentId", 7L).put("orderId", 10L).put("orderCode", "ORD-10")
                .put("customerId", 1L).put("storeId", 2L).put("amount", 100000).put("receivedAmount", 120000)
                .put("expiresAt", order.getPaymentExpiresAt().toString());
        return new DomainEvent("receipt-7", "correlation-7", "payment.received", "payment-service", Instant.now(), payload);
    }

    @Test
    void previewDoesNotStartClockAndRetryDoesNotExtendDeadline() {
        assertNull(service.preview(10L).expiresAt());
        Instant before = Instant.now();
        Instant deadline = service.open(10L).expiresAt();
        assertTrue(deadline.isAfter(before.plusSeconds(899)));
        assertTrue(deadline.isBefore(Instant.now().plusSeconds(901)));
        assertEquals(deadline, service.open(10L).expiresAt());
        verify(access, times(3)).requireOwner(1L);
        order.setTotalAmount(BigDecimal.ZERO);
        assertThrows(ApiException.class, () -> service.open(10L));
    }

    @Test
    void fullPaymentConfirmsOnceAndDoesNotChangeOrderValue() {
        service.open(10L);
        service.decide(receipt());
        assertEquals("CONFIRMED", order.getStatus());
        assertEquals("PAID", order.getPaymentStatus());
        assertEquals(new BigDecimal("100000"), order.getTotalAmount());
        when(jdbc.queryForList(anyString(), eq(Long.class), eq(7L))).thenReturn(List.of(7L));
        service.decide(receipt());
        verify(events, times(1)).publish(eq("order.payment-resolved"), eq(order), argThat(payload -> "ACCEPTED".equals(payload.path("decision").asText())));
        verify(history, times(1)).save(any());
    }

    @Test
    void collectionAcceptsMixedSourcesOnceWithoutCompletingOrRepricingOrder() {
        order.setTotalAmount(new BigDecimal("200000"));
        order.setPaymentExpiresAt(Instant.now().plusSeconds(600));
        var collectionId=java.util.UUID.randomUUID();
        var payload=mapper.createObjectNode().put("operationType","COLLECTION").put("collectionId",collectionId.toString())
                .put("orderId",10L).put("orderCode","ORD-10").put("customerId",1L).put("storeId",2L).put("amount",200000)
                .put("cashAmount",120000).put("declaredTransfer",80000).put("actorId",5L).put("actorRole","STAFF")
                .put("orderVersion",order.getUpdatedAt().toString());
        var event=new DomainEvent("collection-event","trace","payment.received","payment-service",Instant.now(),payload);
        service.decide(event);
        assertEquals("COLLECTED",order.getPaymentStatus()); assertEquals("CONFIRMED",order.getStatus());
        assertEquals("MIXED",order.getCollectionMethod()); assertEquals(new BigDecimal("200000"),order.getTotalAmount());
        when(jdbc.queryForList(anyString(),eq(java.util.UUID.class),eq(collectionId))).thenReturn(List.of(collectionId));
        service.decide(event);
        verify(history,times(1)).save(any());
        verify(events,times(1)).publish(eq("order.payment-resolved"),eq(order),argThat(value->"ACCEPTED".equals(value.path("decision").asText())));
    }

    @Test
    void staleCollectionCannotChangeOrder() {
        var payload=mapper.createObjectNode().put("operationType","COLLECTION").put("collectionId",java.util.UUID.randomUUID().toString())
                .put("orderId",10L).put("orderCode","ORD-10").put("customerId",1L).put("storeId",2L).put("amount",100000)
                .put("cashAmount",0).put("declaredTransfer",80000).put("actorId",5L).put("actorRole","STAFF").put("orderVersion",Instant.EPOCH.toString());
        service.decide(new DomainEvent("stale","trace","payment.received","payment-service",Instant.now(),payload));
        assertEquals("PENDING",order.getPaymentStatus());
        verify(history,never()).save(any());
        verify(events).publish(eq("order.payment-resolved"),eq(order),argThat(value->"STALE_VERSION".equals(value.path("decision").asText())));
    }

    @Test
    void expiredAndCancelledOrdersNeverReopen() {
        order.setPaymentExpiresAt(Instant.now().minusSeconds(1));
        service.decide(receipt());
        verify(compensation).compensateFailedPayment(10L, "ORD-10", "PAYMENT_EXPIRED");
        order.setStatus("CANCELLED");
        OrderStatusHistory expired = new OrderStatusHistory();
        expired.setChangedRole("SYSTEM_SAGA"); expired.setReason("PAYMENT_EXPIRED");
        when(history.findByOrderIdOrderByCreatedAtAsc(10L)).thenReturn(List.of(expired));
        service.decide(receipt());
        verify(events, times(2)).publish(eq("order.payment-resolved"), eq(order), argThat(payload -> "EXPIRED".equals(payload.path("decision").asText())));
        expired.setChangedRole("CUSTOMER");
        service.decide(receipt());
        verify(events).publish(eq("order.payment-resolved"), eq(order), argThat(payload -> "CANCELLED".equals(payload.path("decision").asText())));
        assertEquals("CANCELLED", order.getStatus());
        assertEquals("PENDING", order.getPaymentStatus());
        verify(history, never()).save(any());
    }
}
