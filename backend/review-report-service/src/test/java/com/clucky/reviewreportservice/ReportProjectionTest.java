package com.clucky.reviewreportservice;

import com.clucky.reviewreportservice.dto.DomainEvent;
import com.clucky.reviewreportservice.entity.DailyStoreStats;
import com.clucky.reviewreportservice.entity.OrderProjectionTracker;
import com.clucky.reviewreportservice.entity.ProcessedEvent;
import com.clucky.reviewreportservice.mapper.EventMapper;
import com.clucky.reviewreportservice.repository.DailyStoreStatsRepository;
import com.clucky.reviewreportservice.repository.OrderProjectionTrackerRepository;
import com.clucky.reviewreportservice.repository.ProcessedEventRepository;
import com.clucky.reviewreportservice.service.ReportEventConsumer;
import com.clucky.reviewreportservice.service.ReportProjectionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.kafka.support.Acknowledgment;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ReportProjectionTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    private DailyStoreStatsRepository statsRepository;
    private OrderProjectionTrackerRepository trackerRepository;
    private ProcessedEventRepository processedEventRepository;
    private ReportProjectionService projectionService;

    // In-memory simulation of daily_store_stats table for atomic upsert behavior
    private Map<String, DailyStoreStats> inMemoryStats;
    private Map<Long, OrderProjectionTracker> inMemoryTrackers;
    private Map<String, ProcessedEvent> inMemoryProcessedEvents;

    @BeforeEach
    void setUp() {
        statsRepository = mock(DailyStoreStatsRepository.class);
        trackerRepository = mock(OrderProjectionTrackerRepository.class);
        processedEventRepository = mock(ProcessedEventRepository.class);

        inMemoryStats = new HashMap<>();
        inMemoryTrackers = new HashMap<>();
        inMemoryProcessedEvents = new HashMap<>();

        // Wire mock trackerRepository to inMemoryTrackers
        when(trackerRepository.findByOrderId(any(Long.class))).thenAnswer(invocation -> {
            Long orderId = invocation.getArgument(0);
            return Optional.ofNullable(inMemoryTrackers.get(orderId));
        });
        when(trackerRepository.save(any(OrderProjectionTracker.class))).thenAnswer(invocation -> {
            OrderProjectionTracker t = invocation.getArgument(0);
            inMemoryTrackers.put(t.getOrderId(), t);
            return t;
        });
        when(trackerRepository.saveAndFlush(any(OrderProjectionTracker.class))).thenAnswer(invocation -> {
            OrderProjectionTracker t = invocation.getArgument(0);
            inMemoryTrackers.put(t.getOrderId(), t);
            return t;
        });

        // Wire mock processedEventRepository to inMemoryProcessedEvents
        when(processedEventRepository.existsByEventId(any(String.class))).thenAnswer(invocation -> {
            String eventId = invocation.getArgument(0);
            return inMemoryProcessedEvents.containsKey(eventId);
        });
        when(processedEventRepository.save(any(ProcessedEvent.class))).thenAnswer(invocation -> {
            ProcessedEvent p = invocation.getArgument(0);
            inMemoryProcessedEvents.put(p.getEventId(), p);
            return p;
        });

        // Wire mock statsRepository to inMemoryStats
        when(statsRepository.findByStoreIdAndStatDate(any(Long.class), any(LocalDate.class))).thenAnswer(invocation -> {
            Long storeId = invocation.getArgument(0);
            LocalDate statDate = invocation.getArgument(1);
            String key = storeId + "_" + statDate;
            return Optional.ofNullable(inMemoryStats.get(key));
        });
        when(statsRepository.save(any(DailyStoreStats.class))).thenAnswer(invocation -> {
            DailyStoreStats s = invocation.getArgument(0);
            String key = s.getStoreId() + "_" + s.getStatDate();
            inMemoryStats.put(key, s);
            return s;
        });
        doAnswer(invocation -> {
            Long storeId = invocation.getArgument(0);
            LocalDate statDate = invocation.getArgument(1);
            int orderCountDelta = invocation.getArgument(2);
            BigDecimal revenueDelta = invocation.getArgument(3);
            BigDecimal codDelta = invocation.getArgument(4);
            BigDecimal transferDelta = invocation.getArgument(5);

            String key = storeId + "_" + statDate;
            DailyStoreStats current = inMemoryStats.computeIfAbsent(key, k -> new DailyStoreStats(storeId, statDate));
            current.setOrderCount(current.getOrderCount() + orderCountDelta);
            current.setRevenue(current.getRevenue().add(revenueDelta));
            current.setCodAmount(current.getCodAmount().add(codDelta));
            current.setTransferAmount(current.getTransferAmount().add(transferDelta));
            return 1;
        }).when(statsRepository).upsertStatsDelta(any(), any(), anyInt(), any(), any(), any());

        projectionService = new ReportProjectionService(statsRepository, trackerRepository, processedEventRepository);
    }

    private DomainEvent createEvent(String eventId, String eventType, Instant occurredAt, ObjectNode payload) {
        return new DomainEvent(
                eventId,
                "CORR-" + eventId,
                eventType,
                "test-service",
                occurredAt != null ? occurredAt : Instant.now(),
                payload
        );
    }

    /**
     * AC-01: Cùng order phát confirmed và completed, sau đó đọc daily stats
     * Kết quả mong đợi: Chỉ ghi doanh thu theo một rule đã duyệt, không double count
     */
    @Test
    void ac01_sameOrderPaymentConfirmedThenOrderCompleted_doesNotDoubleCount() {
        LocalDate date = LocalDate.of(2026, 11, 4);
        Instant occurred = date.atStartOfDay(ReportProjectionService.VIETNAM_ZONE).toInstant().plusSeconds(3600);

        // 1. payment.confirmed arrives first
        ObjectNode payPayload = objectMapper.createObjectNode();
        payPayload.put("orderId", 101L);
        payPayload.put("orderCode", "ORD-101");
        payPayload.put("storeId", 1L);
        payPayload.put("amount", 150000);
        payPayload.put("method", "BANK_TRANSFER");
        DomainEvent payEvent = createEvent("PAY-EV-101", "payment.confirmed", occurred, payPayload);

        boolean contributed1 = projectionService.processProjectionEvent(payEvent);
        assertTrue(contributed1);

        DailyStoreStats statsAfterPay = inMemoryStats.get("1_" + date);
        assertNotNull(statsAfterPay);
        assertEquals(1, statsAfterPay.getOrderCount());
        assertEquals(new BigDecimal(150000), statsAfterPay.getRevenue());
        assertEquals(new BigDecimal(150000), statsAfterPay.getTransferAmount());
        assertEquals(BigDecimal.ZERO, statsAfterPay.getCodAmount());

        // 2. order.completed arrives later for the same order
        ObjectNode ordPayload = objectMapper.createObjectNode();
        ordPayload.put("orderId", 101L);
        ordPayload.put("orderCode", "ORD-101");
        ordPayload.put("storeId", 1L);
        ordPayload.put("totalAmount", 150000);
        ordPayload.put("paymentMethod", "BANK_TRANSFER");
        DomainEvent ordEvent = createEvent("ORD-EV-101", "order.completed", occurred.plusSeconds(300), ordPayload);

        boolean contributed2 = projectionService.processProjectionEvent(ordEvent);
        assertFalse(contributed2, "Second event must not contribute again");

        DailyStoreStats statsAfterOrd = inMemoryStats.get("1_" + date);
        assertEquals(1, statsAfterOrd.getOrderCount(), "Order count must remain 1");
        assertEquals(new BigDecimal(150000), statsAfterOrd.getRevenue(), "Revenue must not double count");
        assertEquals(new BigDecimal(150000), statsAfterOrd.getTransferAmount());
    }

    /**
     * AC-02: Cùng đơn có cả order.completed và payment.confirmed (thứ tự ngược lại)
     * Kết quả mong đợi: Không cộng double revenue
     */
    @Test
    void ac02_sameOrderOrderCompletedThenPaymentConfirmed_doesNotDoubleRevenue() {
        LocalDate date = LocalDate.of(2026, 11, 4);
        Instant occurred = date.atStartOfDay(ReportProjectionService.VIETNAM_ZONE).toInstant().plusSeconds(7200);

        // 1. order.completed arrives first (e.g. COD order)
        ObjectNode ordPayload = objectMapper.createObjectNode();
        ordPayload.put("orderId", 202L);
        ordPayload.put("orderCode", "ORD-202");
        ordPayload.put("storeId", 2L);
        ordPayload.put("totalAmount", 250000);
        ordPayload.put("paymentMethod", "COD");
        DomainEvent ordEvent = createEvent("ORD-EV-202", "order.completed", occurred, ordPayload);

        boolean contributed1 = projectionService.processProjectionEvent(ordEvent);
        assertTrue(contributed1);

        DailyStoreStats statsAfterOrd = inMemoryStats.get("2_" + date);
        assertNotNull(statsAfterOrd);
        assertEquals(1, statsAfterOrd.getOrderCount());
        assertEquals(new BigDecimal(250000), statsAfterOrd.getRevenue());
        assertEquals(new BigDecimal(250000), statsAfterOrd.getCodAmount());
        assertEquals(BigDecimal.ZERO, statsAfterOrd.getTransferAmount());

        // 2. payment.confirmed arrives second
        ObjectNode payPayload = objectMapper.createObjectNode();
        payPayload.put("orderId", 202L);
        payPayload.put("orderCode", "ORD-202");
        payPayload.put("storeId", 2L);
        payPayload.put("amount", 250000);
        payPayload.put("method", "COD");
        DomainEvent payEvent = createEvent("PAY-EV-202", "payment.confirmed", occurred.plusSeconds(60), payPayload);

        boolean contributed2 = projectionService.processProjectionEvent(payEvent);
        assertFalse(contributed2, "Payment confirmed must not duplicate revenue");

        DailyStoreStats statsAfterPay = inMemoryStats.get("2_" + date);
        assertEquals(1, statsAfterPay.getOrderCount());
        assertEquals(new BigDecimal(250000), statsAfterPay.getRevenue());
        assertEquals(new BigDecimal(250000), statsAfterPay.getCodAmount());
    }

    /**
     * AC-03: Event replay / out-of-order
     * Kết quả mong đợi: Projection vẫn đúng rule duyệt
     */
    @Test
    void ac03_eventReplayAndOutOfOrder_maintainsCorrectProjection() {
        LocalDate date = LocalDate.of(2026, 11, 4);
        Instant occurred = date.atStartOfDay(ReportProjectionService.VIETNAM_ZONE).toInstant().plusSeconds(5000);

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("orderId", 303L);
        payload.put("storeId", 1L);
        payload.put("totalAmount", 80000);
        payload.put("paymentMethod", "COD");

        DomainEvent event = createEvent("REPLAY-EV-303", "order.completed", occurred, payload);

        // First delivery
        boolean firstRun = projectionService.processProjectionEvent(event);
        assertTrue(firstRun);
        assertEquals(1, inMemoryStats.get("1_" + date).getOrderCount());
        assertEquals(new BigDecimal(80000), inMemoryStats.get("1_" + date).getRevenue());

        // Replay of exact same event
        boolean replayRun = projectionService.processProjectionEvent(event);
        assertFalse(replayRun, "Replayed event must be ignored by processed events repository");
        assertEquals(1, inMemoryStats.get("1_" + date).getOrderCount(), "Order count must remain 1 after replay");
        assertEquals(new BigDecimal(80000), inMemoryStats.get("1_" + date).getRevenue(), "Revenue must remain unchanged after replay");
    }

    /**
     * AC-04: Hai store cùng ngày
     * Kết quả mong đợi: Không trộn tổng
     */
    @Test
    void ac04_twoStoresSameDay_remainSeparated() {
        LocalDate date = LocalDate.of(2026, 11, 4);
        Instant occurred = date.atStartOfDay(ReportProjectionService.VIETNAM_ZONE).toInstant().plusSeconds(3600);

        // Store 1: 1 order of 100,000 VND
        ObjectNode p1 = objectMapper.createObjectNode();
        p1.put("orderId", 401L);
        p1.put("storeId", 1L);
        p1.put("totalAmount", 100000);
        p1.put("paymentMethod", "BANK_TRANSFER");
        projectionService.processProjectionEvent(createEvent("EV-STORE1", "order.completed", occurred, p1));

        // Store 2: 1 order of 300,000 VND
        ObjectNode p2 = objectMapper.createObjectNode();
        p2.put("orderId", 402L);
        p2.put("storeId", 2L);
        p2.put("totalAmount", 300000);
        p2.put("paymentMethod", "COD");
        projectionService.processProjectionEvent(createEvent("EV-STORE2", "order.completed", occurred, p2));

        DailyStoreStats s1 = inMemoryStats.get("1_" + date);
        DailyStoreStats s2 = inMemoryStats.get("2_" + date);

        assertNotNull(s1);
        assertNotNull(s2);
        assertEquals(1, s1.getOrderCount());
        assertEquals(new BigDecimal(100000), s1.getRevenue());
        assertEquals(new BigDecimal(100000), s1.getTransferAmount());

        assertEquals(1, s2.getOrderCount());
        assertEquals(new BigDecimal(300000), s2.getRevenue());
        assertEquals(new BigDecimal(300000), s2.getCodAmount());
    }

    /**
     * AC-05: Replay / đổi thứ tự event và xử lý đồng thời hai order
     * Kết quả mong đợi: Kết quả cuối khớp expected, không mất increment hoặc cộng lại contribution
     */
    @Test
    void ac05_reorderedEventsAndMultipleOrders_finalTotalsMatchExpected() {
        LocalDate date = LocalDate.of(2026, 11, 4);
        Instant occurred = date.atStartOfDay(ReportProjectionService.VIETNAM_ZONE).toInstant().plusSeconds(7200);

        // Order A (501): payment.confirmed then order.completed (Transfer 120,000)
        ObjectNode aPay = objectMapper.createObjectNode().put("orderId", 501L).put("storeId", 3L).put("amount", 120000).put("method", "BANK_TRANSFER");
        ObjectNode aOrd = objectMapper.createObjectNode().put("orderId", 501L).put("storeId", 3L).put("totalAmount", 120000).put("paymentMethod", "BANK_TRANSFER");

        // Order B (502): order.completed then payment.confirmed (COD 80,000)
        ObjectNode bOrd = objectMapper.createObjectNode().put("orderId", 502L).put("storeId", 3L).put("totalAmount", 80000).put("paymentMethod", "COD");
        ObjectNode bPay = objectMapper.createObjectNode().put("orderId", 502L).put("storeId", 3L).put("amount", 80000).put("method", "COD");

        // Interleaved arrival
        projectionService.processProjectionEvent(createEvent("EV-A-PAY", "payment.confirmed", occurred, aPay));
        projectionService.processProjectionEvent(createEvent("EV-B-ORD", "order.completed", occurred.plusSeconds(10), bOrd));
        projectionService.processProjectionEvent(createEvent("EV-A-ORD", "order.completed", occurred.plusSeconds(20), aOrd));
        projectionService.processProjectionEvent(createEvent("EV-B-PAY", "payment.confirmed", occurred.plusSeconds(30), bPay));

        // Replay of EV-A-PAY and EV-B-ORD
        projectionService.processProjectionEvent(createEvent("EV-A-PAY", "payment.confirmed", occurred, aPay));
        projectionService.processProjectionEvent(createEvent("EV-B-ORD", "order.completed", occurred.plusSeconds(10), bOrd));

        DailyStoreStats stats = inMemoryStats.get("3_" + date);
        assertNotNull(stats);
        assertEquals(2, stats.getOrderCount(), "Expected exactly 2 orders for store 3");
        assertEquals(new BigDecimal(200000), stats.getRevenue(), "Expected 120k + 80k = 200k");
        assertEquals(new BigDecimal(120000), stats.getTransferAmount());
        assertEquals(new BigDecimal(80000), stats.getCodAmount());
    }

    /**
     * AC-06: Hai store và event quanh biên ngày/timezone (Asia/Ho_Chi_Minh UTC+7)
     * Kết quả mong đợi: Stats tách đúng store/ngày, report/export dùng cùng kỳ
     */
    @Test
    void ac06_timezoneEdgeEvents_partitionToCorrectBusinessDates() {
        // In UTC+7 (Asia/Ho_Chi_Minh):
        // 2026-11-04T16:59:00Z -> 2026-11-04 23:59:00 (Day Nov 4)
        // 2026-11-04T17:01:00Z -> 2026-11-05 00:01:00 (Day Nov 5)
        Instant beforeMidnightUtc = Instant.parse("2026-11-04T16:59:00Z");
        Instant afterMidnightUtc = Instant.parse("2026-11-04T17:01:00Z");

        ObjectNode p1 = objectMapper.createObjectNode().put("orderId", 601L).put("storeId", 1L).put("totalAmount", 110000).put("paymentMethod", "COD");
        ObjectNode p2 = objectMapper.createObjectNode().put("orderId", 602L).put("storeId", 1L).put("totalAmount", 220000).put("paymentMethod", "BANK_TRANSFER");

        projectionService.processProjectionEvent(createEvent("EV-EDGE-1", "order.completed", beforeMidnightUtc, p1));
        projectionService.processProjectionEvent(createEvent("EV-EDGE-2", "order.completed", afterMidnightUtc, p2));

        LocalDate dateNov4 = LocalDate.of(2026, 11, 4);
        LocalDate dateNov5 = LocalDate.of(2026, 11, 5);

        DailyStoreStats statsNov4 = inMemoryStats.get("1_" + dateNov4);
        DailyStoreStats statsNov5 = inMemoryStats.get("1_" + dateNov5);

        assertNotNull(statsNov4, "Stats for 2026-11-04 must exist");
        assertEquals(1, statsNov4.getOrderCount());
        assertEquals(new BigDecimal(110000), statsNov4.getRevenue());
        assertEquals(new BigDecimal(110000), statsNov4.getCodAmount());

        assertNotNull(statsNov5, "Stats for 2026-11-05 must exist");
        assertEquals(1, statsNov5.getOrderCount());
        assertEquals(new BigDecimal(220000), statsNov5.getRevenue());
        assertEquals(new BigDecimal(220000), statsNov5.getTransferAmount());
    }

    /**
     * Kafka Consumer Acknowledgment and error handling verification
     */
    @Test
    void consumerAcknowledgesOnlyAfterSuccessfulProcessing() {
        EventMapper eventMapper = mock(EventMapper.class);
        ReportEventConsumer consumer = new ReportEventConsumer(projectionService, eventMapper);
        Acknowledgment ack = mock(Acknowledgment.class);

        DomainEvent event = createEvent("ACK-EV-1", "order.completed", Instant.now(),
                objectMapper.createObjectNode().put("orderId", 701L).put("storeId", 1L).put("totalAmount", 50000));

        when(eventMapper.fromJson(any(), any())).thenReturn(event);

        ConsumerRecord<String, String> record = new ConsumerRecord<>("order.completed", 0, 100L, "key", "valid-json");
        consumer.onEvent(record, ack);

        verify(ack).acknowledge();
        verifyNoMoreInteractions(ack);
    }
}
