package com.clucky.reviewreportservice;

import com.clucky.reviewreportservice.dto.DomainEvent;
import com.clucky.reviewreportservice.entity.OrderProjectionTracker;
import com.clucky.reviewreportservice.mapper.EventMapper;
import com.clucky.reviewreportservice.repository.*;
import com.clucky.reviewreportservice.service.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.kafka.support.Acknowledgment;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ReportProjectionTest {
    private final DailyStoreStatsRepository stats = mock(DailyStoreStatsRepository.class);
    private final OrderProjectionTrackerRepository trackers = mock(OrderProjectionTrackerRepository.class);
    private final ProcessedEventRepository events = mock(ProcessedEventRepository.class);
    private final ReportProjectionService service = new ReportProjectionService(stats, trackers, events, "order.completed");

    static DomainEvent event(String id, String type, long order, Long store, String timestamp) {
        ObjectNode payload = new ObjectMapper().createObjectNode().put("orderId", order)
                .put("totalAmount", 120000).put("amount", 120000).put("paymentMethod", "COD").put("method", "COD");
        if (store != null) { payload.put("storeId", store); }
        return new DomainEvent(id, "report-test", type,
                "payment.confirmed".equals(type) ? "payment-service" : "cart-order-service", Instant.parse(timestamp), payload);
    }

    private DomainEvent valid() {
        return event("event-1", "order.completed", 1, 2L, "2026-11-04T17:01:00Z");
    }

    @Test
    void projectionRemainsDisabledUntilPolicyApproval() {
        var disabled = new ReportProjectionService(stats, trackers, events, "false");
        assertThrows(IllegalStateException.class, () -> disabled.processProjectionEvent(valid()));
        assertThrows(IllegalArgumentException.class, () -> new ReportProjectionService(stats, trackers, events, "first-arrival"));
        verifyNoInteractions(stats, trackers, events);
        var context = new ApplicationContextRunner().withBean(ReportProjectionService.class, () -> service)
                .withBean(EventMapper.class, () -> mock(EventMapper.class)).withUserConfiguration(ReportEventConsumer.class);
        context.run(app -> assertTrue(app.getBeansOfType(ReportEventConsumer.class).isEmpty()));
        context.withPropertyValues("clucky.reports.revenue-event=false")
                .run(app -> assertTrue(app.getBeansOfType(ReportEventConsumer.class).isEmpty()));
        context.withPropertyValues("clucky.reports.revenue-event=order.completed")
                .run(app -> assertEquals(1, app.getBeansOfType(ReportEventConsumer.class).size()));
    }

    @Test
    void rejectsMalformedFactsBeforeClaimingEvent() {
        for (String json : new String[] {"{\"orderId\":\"1\"}", "{\"orderId\":0}", "{\"orderId\":1.5}",
                "{\"orderId\":9223372036854775808}"}) {
            assertDoesNotThrow(() -> {
                DomainEvent original = valid();
                var invalid = new DomainEvent(original.eventId(), original.correlationId(), original.eventType(),
                        original.sourceService(), original.occurredAt(), new ObjectMapper().readTree(json));
                assertThrows(IllegalArgumentException.class, () -> service.processProjectionEvent(invalid));
            });
        }
        for (String field : new String[] {"totalAmount", "paymentMethod"}) {
            var missing = valid();
            ((ObjectNode) missing.payload()).remove(field);
            assertThrows(IllegalArgumentException.class, () -> service.processProjectionEvent(missing));
        }
        for (BigDecimal amount : new BigDecimal[] {new BigDecimal("-1"), new BigDecimal("0.5"), new BigDecimal("1000000000000")}) {
            var invalid = valid();
            ((ObjectNode) invalid.payload()).put("totalAmount", amount);
            assertThrows(IllegalArgumentException.class, () -> service.processProjectionEvent(invalid));
            var badExcess = valid();
            ((ObjectNode) badExcess.payload()).put("excessAmount", amount);
            assertThrows(IllegalArgumentException.class, () -> service.processProjectionEvent(badExcess));
        }
        var badDate = valid();
        ((ObjectNode) badDate.payload()).put("completedAt", "not-a-date");
        assertThrows(IllegalArgumentException.class, () -> service.processProjectionEvent(badDate));
        verifyNoInteractions(stats, trackers, events);
    }

    @Test
    void usesOnlyMatchingTimestampAndVietnamBusinessDate() {
        var original = valid();
        ((ObjectNode) original.payload()).put("paidAt", "2026-11-01T00:00:00Z");
        assertEquals(LocalDate.of(2026, 11, 5), service.resolveStatDate(original, original.payload()));
        ((ObjectNode) original.payload()).put("completedAt", "2026-11-04T16:59:00Z");
        assertEquals(LocalDate.of(2026, 11, 4), service.resolveStatDate(original, original.payload()));
    }

    @Test
    void duplicateEventDoesNotTouchProjection() {
        assertFalse(service.processProjectionEvent(valid()));
        verifyNoInteractions(stats, trackers);
    }

    @Test
    void sqlFailurePropagatesWithoutJpaFallback() {
        var tracker = new OrderProjectionTracker(1L, null, 0L, LocalDate.of(2026, 11, 5), null,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, false, false, false);
        when(events.claim("event-1", "order.completed", 1L)).thenReturn(1);
        when(trackers.findByOrderId(1L)).thenReturn(Optional.of(tracker));
        when(stats.upsertStatsDelta(anyLong(), any(), anyInt(), any(), any(), any())).thenThrow(new IllegalStateException("database failure"));
        assertThrows(IllegalStateException.class, () -> service.processProjectionEvent(valid()));
        assertFalse(tracker.isContributed());
        verify(stats, never()).save(any());
    }

    @Test
    void separatesExcessAndPendingReconciliationFromRevenueAndSettlesUponBankConfirmation() {
        var tracker = new OrderProjectionTracker(10L, null, 0L, LocalDate.of(2026, 11, 5), null,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, false, false, false);
        var transferOrder = event("evt-xfer-1", "order.completed", 10L, 2L, "2026-11-04T17:01:00Z");
        ((ObjectNode) transferOrder.payload())
                .put("paymentMethod", "BANK_TRANSFER")
                .put("orderTotal", 100000)
                .put("totalAmount", 125000)
                .put("manualAccepted", true);
        when(events.claim("evt-xfer-1", "order.completed", 10L)).thenReturn(1);
        when(trackers.findByOrderId(10L)).thenReturn(Optional.of(tracker));

        assertTrue(service.processProjectionEvent(transferOrder));

        verify(stats).upsertStatsDelta(2L, LocalDate.of(2026, 11, 5), 1,
                new BigDecimal("100000"), BigDecimal.ZERO, new BigDecimal("100000"));
        verify(stats).upsertReconciliationDelta(2L, LocalDate.of(2026, 11, 5),
                BigDecimal.ZERO, new BigDecimal("100000"), new BigDecimal("25000"), BigDecimal.ZERO);

        var bankConfirmed = event("evt-bank-1", "payment.confirmed", 10L, 2L, "2026-11-04T17:10:00Z");
        ((ObjectNode) bankConfirmed.payload()).put("method", "BANK_TRANSFER").put("amount", 100000);
        when(events.claim("evt-bank-1", "payment.confirmed", 10L)).thenReturn(1);

        assertFalse(service.processProjectionEvent(bankConfirmed));

        verify(stats).upsertReconciliationDelta(2L, LocalDate.of(2026, 11, 5),
                new BigDecimal("100000"), new BigDecimal("-100000"), BigDecimal.ZERO, BigDecimal.ZERO);
        verifyNoMoreInteractions(stats);
    }

    @Test
    void expiredOrderReceiptsNeverIncrementOrderCountOrRevenue() {
        var tracker = new OrderProjectionTracker(11L, null, 0L, LocalDate.of(2026, 11, 5), null,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, false, false, false);
        var expiredOrder = event("evt-exp-1", "order.completed", 11L, 2L, "2026-11-04T17:01:00Z");
        ((ObjectNode) expiredOrder.payload())
                .put("paymentMethod", "BANK_TRANSFER")
                .put("totalAmount", 85000)
                .put("expired", true);
        when(events.claim("evt-exp-1", "order.completed", 11L)).thenReturn(1);
        when(trackers.findByOrderId(11L)).thenReturn(Optional.of(tracker));

        assertFalse(service.processProjectionEvent(expiredOrder));

        verify(stats, never()).upsertStatsDelta(anyLong(), any(), anyInt(), any(), any(), any());
        verify(stats).upsertReconciliationDelta(2L, LocalDate.of(2026, 11, 5),
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("85000"));
    }

    @Test
    void acknowledgmentFollowsSuccessfulTransactionReturnOnly() {
        var mapper = mock(EventMapper.class);
        var projection = mock(ReportProjectionService.class);
        var consumer = new ReportEventConsumer(projection, mapper);
        var record = new ConsumerRecord<String, String>("order.completed", 0, 1L, "1", "payload");
        var acknowledgment = mock(Acknowledgment.class);
        var event = valid();
        when(mapper.fromJson("payload", "order.completed")).thenReturn(event);
        consumer.onEvent(record, acknowledgment);
        var ordered = inOrder(projection, acknowledgment);
        ordered.verify(projection).processProjectionEvent(event);
        ordered.verify(acknowledgment).acknowledge();
        reset(acknowledgment);
        when(projection.processProjectionEvent(event)).thenThrow(new IllegalStateException("commit failed"));
        assertThrows(IllegalStateException.class, () -> consumer.onEvent(record, acknowledgment));
        when(mapper.fromJson("payload", "order.completed")).thenThrow(new IllegalArgumentException("invalid event"));
        assertThrows(IllegalArgumentException.class, () -> consumer.onEvent(record, acknowledgment));
        verifyNoInteractions(acknowledgment);
    }
}
