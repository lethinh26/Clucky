package com.clucky.reviewreportservice.service;

import com.clucky.reviewreportservice.dto.DomainEvent;
import com.clucky.reviewreportservice.entity.DailyStoreStats;
import com.clucky.reviewreportservice.entity.OrderProjectionTracker;
import com.clucky.reviewreportservice.entity.ProcessedEvent;
import com.clucky.reviewreportservice.repository.DailyStoreStatsRepository;
import com.clucky.reviewreportservice.repository.OrderProjectionTrackerRepository;
import com.clucky.reviewreportservice.repository.ProcessedEventRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;

@Service
public class ReportProjectionService {

    private static final Logger log = LoggerFactory.getLogger(ReportProjectionService.class);

    public static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final DailyStoreStatsRepository statsRepository;
    private final OrderProjectionTrackerRepository trackerRepository;
    private final ProcessedEventRepository processedEventRepository;

    public ReportProjectionService(
            DailyStoreStatsRepository statsRepository,
            OrderProjectionTrackerRepository trackerRepository,
            ProcessedEventRepository processedEventRepository
    ) {
        this.statsRepository = statsRepository;
        this.trackerRepository = trackerRepository;
        this.processedEventRepository = processedEventRepository;
    }

    /**
     * Processes order.completed and payment.confirmed projection events idempotently.
     * Prevents double-counting revenue and handles event replays and out-of-order execution.
     *
     * @param event Validated domain event
     * @return true if order revenue contributed to daily_store_stats; false if already contributed or skipped
     */
    @Transactional
    public boolean processProjectionEvent(DomainEvent event) {
        if (event == null || event.eventId() == null || event.payload() == null) {
            log.warn("Discarding malformed projection event");
            return false;
        }

        // 1. Idempotency check at Kafka event level
        if (processedEventRepository.existsByEventId(event.eventId())) {
            log.info("event=kafka_event_already_processed eventId={} eventType={}",
                    event.eventId(), event.eventType());
            return false;
        }

        JsonNode payload = event.payload();
        Long orderId = payload.hasNonNull("orderId") ? payload.get("orderId").asLong() : null;
        if (orderId == null) {
            log.warn("Event {} missing orderId in payload, skipping projection", event.eventId());
            processedEventRepository.save(new ProcessedEvent(event.eventId(), event.eventType(), null));
            return false;
        }

        String orderCode = payload.hasNonNull("orderCode") ? payload.get("orderCode").asText() : null;
        Long storeId = payload.hasNonNull("storeId") ? payload.get("storeId").asLong() : null;
        BigDecimal amount = resolveAmount(payload);
        String paymentMethod = resolvePaymentMethod(payload);
        LocalDate statDate = resolveStatDate(event, payload);

        boolean isOrderCompletedEvent = "order.completed".equalsIgnoreCase(event.eventType());
        boolean isPaymentConfirmedEvent = "payment.confirmed".equalsIgnoreCase(event.eventType());

        // 2. Check existing order contribution tracker
        Optional<OrderProjectionTracker> existingTrackerOpt = trackerRepository.findByOrderId(orderId);
        if (existingTrackerOpt.isPresent()) {
            OrderProjectionTracker tracker = existingTrackerOpt.get();

            if (isOrderCompletedEvent) {
                tracker.setOrderCompleted(true);
            }
            if (isPaymentConfirmedEvent) {
                tracker.setPaymentConfirmed(true);
            }
            if (storeId != null && tracker.getStoreId() == null) {
                tracker.setStoreId(storeId);
            }
            tracker.setUpdatedAt(Instant.now());
            trackerRepository.save(tracker);

            // Record processed event
            processedEventRepository.save(new ProcessedEvent(event.eventId(), event.eventType(), orderId));

            log.info("event=order_already_contributed orderId={} eventId={} eventType={} storeId={}",
                    orderId, event.eventId(), event.eventType(), tracker.getStoreId());
            return false;
        }

        // If storeId is missing and no existing tracker, we cannot attribute to daily_store_stats
        if (storeId == null) {
            log.warn("Order {} missing storeId and has no prior tracker; recording pending tracker", orderId);
            OrderProjectionTracker pendingTracker = new OrderProjectionTracker(
                    orderId, orderCode, 0L, statDate, paymentMethod, amount,
                    BigDecimal.ZERO, BigDecimal.ZERO, isOrderCompletedEvent, isPaymentConfirmedEvent, false
            );
            trackerRepository.save(pendingTracker);
            processedEventRepository.save(new ProcessedEvent(event.eventId(), event.eventType(), orderId));
            return false;
        }

        // 3. Atomically record new contribution tracker
        boolean isCod = isCodMethod(paymentMethod);
        BigDecimal codAmount = isCod ? amount : BigDecimal.ZERO;
        BigDecimal transferAmount = isCod ? BigDecimal.ZERO : amount;

        OrderProjectionTracker tracker = new OrderProjectionTracker(
                orderId, orderCode, storeId, statDate, paymentMethod, amount,
                codAmount, transferAmount, isOrderCompletedEvent, isPaymentConfirmedEvent, true
        );

        try {
            trackerRepository.saveAndFlush(tracker);
        } catch (DataIntegrityViolationException ex) {
            // Concurrent event for same order won the insert race
            log.warn("Concurrent contribution race for orderId={}, updating flags only", orderId);
            OrderProjectionTracker concurrentTracker = trackerRepository.findByOrderId(orderId).orElse(null);
            if (concurrentTracker != null) {
                if (isOrderCompletedEvent) {
                    concurrentTracker.setOrderCompleted(true);
                }
                if (isPaymentConfirmedEvent) {
                    concurrentTracker.setPaymentConfirmed(true);
                }
                concurrentTracker.setUpdatedAt(Instant.now());
                trackerRepository.save(concurrentTracker);
            }
            processedEventRepository.save(new ProcessedEvent(event.eventId(), event.eventType(), orderId));
            return false;
        }

        // 4. Update daily_store_stats projection atomically
        try {
            statsRepository.upsertStatsDelta(storeId, statDate, 1, amount, codAmount, transferAmount);
        } catch (Exception ex) {
            log.debug("Native upsert stats delta fallback to JPA save: {}", ex.getMessage());
            DailyStoreStats stats = statsRepository.findByStoreIdAndStatDate(storeId, statDate)
                    .orElseGet(() -> new DailyStoreStats(storeId, statDate));
            stats.setOrderCount(stats.getOrderCount() + 1);
            stats.setRevenue(stats.getRevenue().add(amount));
            stats.setCodAmount(stats.getCodAmount().add(codAmount));
            stats.setTransferAmount(stats.getTransferAmount().add(transferAmount));
            statsRepository.save(stats);
        }

        // 5. Record processed event
        processedEventRepository.save(new ProcessedEvent(event.eventId(), event.eventType(), orderId));

        log.info("event=daily_store_stats_projected orderId={} storeId={} statDate={} revenue={} method={}",
                orderId, storeId, statDate, amount, paymentMethod);
        return true;
    }

    /**
     * Safely handles order.cancelled events according to policy rules.
     */
    @Transactional
    public void handleOrderCancelled(DomainEvent event) {
        if (event == null || event.eventId() == null) {
            return;
        }
        if (processedEventRepository.existsByEventId(event.eventId())) {
            return;
        }

        Long orderId = event.payload() != null && event.payload().hasNonNull("orderId")
                ? event.payload().get("orderId").asLong() : null;

        log.info("event=order_cancelled_received orderId={} eventId={}", orderId, event.eventId());
        // INT-45 policy note: refund/cancellation adjustment policy is pending cross-team contract.
        // We do not wipe or arbitrarily deduct production stats without approved policy.
        processedEventRepository.save(new ProcessedEvent(event.eventId(), event.eventType(), orderId));
    }

    public LocalDate resolveStatDate(DomainEvent event, JsonNode payload) {
        if (payload != null && payload.hasNonNull("completedAt")) {
            try {
                return Instant.parse(payload.get("completedAt").asText()).atZone(VIETNAM_ZONE).toLocalDate();
            } catch (Exception ignored) {
            }
        }
        if (payload != null && payload.hasNonNull("paidAt")) {
            try {
                return Instant.parse(payload.get("paidAt").asText()).atZone(VIETNAM_ZONE).toLocalDate();
            } catch (Exception ignored) {
            }
        }
        if (event != null && event.occurredAt() != null) {
            return event.occurredAt().atZone(VIETNAM_ZONE).toLocalDate();
        }
        return LocalDate.now(VIETNAM_ZONE);
    }

    private BigDecimal resolveAmount(JsonNode payload) {
        if (payload.hasNonNull("totalAmount")) {
            return new BigDecimal(payload.get("totalAmount").asText());
        }
        if (payload.hasNonNull("amount")) {
            return new BigDecimal(payload.get("amount").asText());
        }
        return BigDecimal.ZERO;
    }

    private String resolvePaymentMethod(JsonNode payload) {
        if (payload.hasNonNull("paymentMethod")) {
            return payload.get("paymentMethod").asText().trim().toUpperCase();
        }
        if (payload.hasNonNull("method")) {
            return payload.get("method").asText().trim().toUpperCase();
        }
        return "COD";
    }

    private boolean isCodMethod(String method) {
        return "COD".equalsIgnoreCase(method);
    }
}
