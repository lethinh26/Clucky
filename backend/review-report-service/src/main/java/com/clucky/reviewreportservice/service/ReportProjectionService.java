package com.clucky.reviewreportservice.service;

import com.clucky.reviewreportservice.dto.DomainEvent;
import com.clucky.reviewreportservice.repository.DailyStoreStatsRepository;
import com.clucky.reviewreportservice.repository.OrderProjectionTrackerRepository;
import com.clucky.reviewreportservice.repository.ProcessedEventRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.Set;

@Service
public class ReportProjectionService {
    public static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final DailyStoreStatsRepository statsRepository;
    private final OrderProjectionTrackerRepository trackerRepository;
    private final ProcessedEventRepository processedEventRepository;
    private final String revenueEvent;

    public ReportProjectionService(DailyStoreStatsRepository statsRepository,
            OrderProjectionTrackerRepository trackerRepository, ProcessedEventRepository processedEventRepository,
            @Value("${clucky.reports.revenue-event:false}") String revenueEvent) {
        if (!Set.of("false", "order.completed", "payment.confirmed").contains(revenueEvent)) {
            throw new IllegalArgumentException("Unsupported report revenue policy");
        }
        this.statsRepository = statsRepository;
        this.trackerRepository = trackerRepository;
        this.processedEventRepository = processedEventRepository;
        this.revenueEvent = revenueEvent;
    }

    @Transactional
    public boolean processProjectionEvent(DomainEvent event) {
        requireEnabled();
        validateEvent(event);
        if (!Set.of("order.completed", "payment.confirmed").contains(event.eventType())) {
            throw new IllegalArgumentException("Unsupported projection event");
        }
        JsonNode payload = event.payload();
        long orderId = positiveId(payload, "orderId");
        Long storeId = payload.hasNonNull("storeId") ? positiveId(payload, "storeId") : null;
        boolean authoritative = revenueEvent.equals(event.eventType());
        LocalDate statDate = resolveStatDate(event, payload);
        BigDecimal amount = authoritative ? resolveAmount(payload) : null;
        String method = authoritative ? resolvePaymentMethod(payload) : null;
        if (processedEventRepository.claim(event.eventId(), event.eventType(), orderId) == 0) {
            return false;
        }
        trackerRepository.initialize(orderId, statDate);
        var tracker = trackerRepository.findByOrderId(orderId).orElseThrow();
        if (storeId != null) {
            if (tracker.getStoreId() != 0 && !storeId.equals(tracker.getStoreId())) {
                throw new IllegalArgumentException("Conflicting store for report order");
            }
            tracker.setStoreId(storeId);
        }
        if (authoritative) {
            if (tracker.getPaymentMethod() != null &&
                    (!method.equals(tracker.getPaymentMethod()) || !statDate.equals(tracker.getStatDate()) ||
                            amount.compareTo(tracker.getRevenueAmount()) != 0)) {
                throw new IllegalArgumentException("Report correction requires reconciliation");
            }
            tracker.setStatDate(statDate);
            tracker.setPaymentMethod(method);
            tracker.setRevenueAmount(amount);
            BigDecimal cash = payload.hasNonNull("cashAmount") ? collectionMoney(payload,"cashAmount")
                    : "COD".equals(method) ? amount : BigDecimal.ZERO;
            BigDecimal transfer = payload.hasNonNull("declaredTransfer") ? collectionMoney(payload,"declaredTransfer")
                    : "BANK_TRANSFER".equals(method) ? amount : BigDecimal.ZERO;
            tracker.setCodAmount(cash);
            tracker.setTransferAmount(transfer);
        }
        tracker.setOrderCompleted(tracker.isOrderCompleted() || "order.completed".equals(event.eventType()));
        tracker.setPaymentConfirmed(tracker.isPaymentConfirmed() || "payment.confirmed".equals(event.eventType()));
        tracker.setUpdatedAt(Instant.now());
        if (tracker.isContributed() || tracker.getStoreId() == 0 || tracker.getPaymentMethod() == null) {
            return false;
        }
        statsRepository.upsertStatsDelta(tracker.getStoreId(), tracker.getStatDate(), 1,
                tracker.getRevenueAmount(), tracker.getCodAmount(), tracker.getTransferAmount());
        tracker.setContributed(true);
        return true;
    }

    @Transactional
    public void handleOrderCancelled(DomainEvent event) {
        requireEnabled();
        validateEvent(event);
        if (!"order.cancelled".equals(event.eventType())) {
            throw new IllegalArgumentException("Expected cancellation event");
        }
        // ponytail: refund policy is unapproved; record only until an approved adjustment contract exists.
        processedEventRepository.claim(event.eventId(), event.eventType(), positiveId(event.payload(), "orderId"));
    }

    public LocalDate resolveStatDate(DomainEvent event, JsonNode payload) {
        String field = "order.completed".equals(event.eventType()) ? "completedAt" : "paidAt";
        Instant timestamp = event.occurredAt();
        if (payload.hasNonNull(field)) {
            try {
                timestamp = Instant.parse(payload.get(field).asText());
            } catch (DateTimeParseException failure) {
                throw new IllegalArgumentException("Invalid business timestamp");
            }
        }
        if (timestamp == null) {
            throw new IllegalArgumentException("Business timestamp required");
        }
        return timestamp.atZone(VIETNAM_ZONE).toLocalDate();
    }

    private void requireEnabled() {
        if ("false".equals(revenueEvent)) {
            throw new IllegalStateException("Report revenue policy requires approval before enabling projection");
        }
    }

    private void validateEvent(DomainEvent event) {
        if (event == null || event.eventId() == null || event.eventId().isBlank() || event.eventId().length() > 160 ||
                event.eventType() == null || event.occurredAt() == null || event.payload() == null || !event.payload().isObject()) {
            throw new IllegalArgumentException("Invalid report event");
        }
        String source = "payment.confirmed".equals(event.eventType()) ? "payment-service" : "cart-order-service";
        if (!source.equals(event.sourceService())) {
            throw new IllegalArgumentException("Unexpected report event source");
        }
    }

    private long positiveId(JsonNode payload, String field) {
        JsonNode value = payload.get(field);
        if (value == null || !value.isIntegralNumber() || !value.canConvertToLong() || value.longValue() <= 0) {
            throw new IllegalArgumentException("Positive numeric " + field + " required");
        }
        return value.longValue();
    }

    private BigDecimal resolveAmount(JsonNode payload) {
        String field = "order.completed".equals(revenueEvent) ? "totalAmount" : "amount";
        JsonNode value = payload.get(field);
        if (value == null || !value.isNumber()) {
            throw new IllegalArgumentException("Numeric revenue amount required");
        }
        BigDecimal amount = value.decimalValue();
        if (amount.signum() < 0 || amount.stripTrailingZeros().scale() > 0 || amount.compareTo(new BigDecimal("999999999999")) > 0) {
            throw new IllegalArgumentException("Revenue amount outside supported VND range");
        }
        return amount;
    }

    private String resolvePaymentMethod(JsonNode payload) {
        String field = "order.completed".equals(revenueEvent) ? "paymentMethod" : "method";
        String method = payload.path(field).asText(payload.path("paymentMethod").asText());
        if (!Set.of("COD", "BANK_TRANSFER", "CASH", "MIXED", "UNVERIFIED").contains(method)) {
            throw new IllegalArgumentException("Supported payment method required");
        }
        return method;
    }

    private BigDecimal collectionMoney(JsonNode payload,String field) {
        var value=payload.get(field);
        if(value==null||!value.isNumber()||value.decimalValue().signum()<0||value.decimalValue().stripTrailingZeros().scale()>0
                ||value.decimalValue().compareTo(new BigDecimal("999999999999"))>0)throw new IllegalArgumentException("Invalid collection amount");
        return value.decimalValue();
    }
}
