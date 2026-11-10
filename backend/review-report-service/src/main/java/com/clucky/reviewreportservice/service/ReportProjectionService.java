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
import java.util.Locale;
import java.util.Set;

@Service
public class ReportProjectionService {
    public static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final BigDecimal MAX_VND = new BigDecimal("999999999999");
    private static final String EXPIRED_RECEIPT_STATUS = "EXPIRED_RECEIPT";
    private static final Set<String> RECONCILED_STATUSES = Set.of(
            "RECONCILED", "BANK_CONFIRMED", "CONFIRMED", "MATCHED", "SETTLED", "AUTO_MATCHED", "MANUAL_APPROVED");
    private static final Set<String> PENDING_RECONCILIATION_STATUSES = Set.of(
            "PENDING_RECONCILIATION", "MANUAL_ACCEPTED", "COUNTER_DECLARED", "UNRECONCILED", "PENDING");

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

        // Validate optional financial/reconciliation fields before claiming the event
        BigDecimal explicitExcess = resolveOptionalAmount(payload, "excessAmount", "overpaidAmount");
        BigDecimal explicitExpired = resolveOptionalAmount(payload, "expiredReceiptAmount");
        BigDecimal explicitOrderTotal = resolveOptionalAmount(payload, "orderTotal");
        BigDecimal explicitPaidAmount = resolveOptionalAmount(payload, "paidAmount", "receivedAmount");
        BigDecimal explicitReconciledTransfer = resolveOptionalAmount(payload, "reconciledTransferAmount");
        BigDecimal explicitPendingReconciliation = resolveOptionalAmount(payload, "pendingReconciliationAmount");
        BigDecimal explicitCash = resolveOptionalAmount(payload, "cashAmount");
        BigDecimal explicitTransfer = resolveOptionalAmount(payload, "declaredTransfer");
        boolean isExpiredOrder = payload.path("expired").asBoolean(false)
                || "EXPIRED".equalsIgnoreCase(payload.path("orderStatus").asText(""));
        String eventReconciliationStatus = resolveOptionalReconciliationStatus(event, payload, isExpiredOrder);

        BigDecimal rawAmount = authoritative ? resolveAmount(payload) : null;
        String method = authoritative ? resolvePaymentMethod(payload) : null;

        BigDecimal recognizedAmount = null;
        BigDecimal computedExcess = explicitExcess != null ? explicitExcess : BigDecimal.ZERO;
        BigDecimal computedExpired = explicitExpired != null ? explicitExpired : BigDecimal.ZERO;

        if (authoritative) {
            if (isExpiredOrder) {
                // Expired orders must not contribute to order_count or revenue; keep late receipts separated
                recognizedAmount = BigDecimal.ZERO;
                if (computedExpired.signum() == 0 && rawAmount.signum() > 0) {
                    computedExpired = rawAmount;
                }
            } else {
                BigDecimal baselineOrderTotal = explicitOrderTotal != null ? explicitOrderTotal : rawAmount;
                recognizedAmount = rawAmount.min(baselineOrderTotal);
                if (explicitExcess == null) {
                    BigDecimal paidOrRaw = explicitPaidAmount != null ? explicitPaidAmount : rawAmount;
                    if (paidOrRaw.compareTo(baselineOrderTotal) > 0) {
                        computedExcess = paidOrRaw.subtract(baselineOrderTotal);
                    }
                }
            }
        }

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
                            recognizedAmount.compareTo(tracker.getRevenueAmount()) != 0)) {
                throw new IllegalArgumentException("Report correction requires reconciliation");
            }
            tracker.setStatDate(statDate);
            tracker.setPaymentMethod(method);
            tracker.setRevenueAmount(recognizedAmount);
            tracker.setCodAmount(explicitCash != null ? explicitCash
                    : "COD".equals(method) ? recognizedAmount : BigDecimal.ZERO);
            tracker.setTransferAmount(explicitTransfer != null ? explicitTransfer
                    : "BANK_TRANSFER".equals(method) ? recognizedAmount : BigDecimal.ZERO);
            tracker.setExcessAmount(computedExcess);
            tracker.setExpiredReceiptAmount(computedExpired);
        } else if (computedExpired.signum() > 0 && nonNull(tracker.getExpiredReceiptAmount()).signum() == 0) {
            tracker.setExpiredReceiptAmount(computedExpired);
        }

        tracker.setOrderCompleted(tracker.isOrderCompleted() || "order.completed".equals(event.eventType()));
        tracker.setPaymentConfirmed(tracker.isPaymentConfirmed() || "payment.confirmed".equals(event.eventType()));
        if (eventReconciliationStatus != null && !EXPIRED_RECEIPT_STATUS.equals(tracker.getReconciliationStatus())) {
            tracker.setReconciliationStatus(eventReconciliationStatus);
        }
        tracker.setUpdatedAt(Instant.now());

        if (tracker.isContributed()) {
            return handlePostContributionReconciliation(tracker, eventReconciliationStatus);
        }

        if (tracker.getStoreId() == 0) {
            return false;
        }

        if (isExpiredOrder || EXPIRED_RECEIPT_STATUS.equals(tracker.getReconciliationStatus())) {
            tracker.setReconciliationStatus(EXPIRED_RECEIPT_STATUS);
            BigDecimal trackerExpired = nonNull(tracker.getExpiredReceiptAmount());
            if (trackerExpired.signum() > 0) {
                statsRepository.upsertReconciliationDelta(
                        tracker.getStoreId(), tracker.getStatDate(),
                        BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, trackerExpired);
            }
            tracker.setContributed(true);
            return false;
        }

        if (tracker.getPaymentMethod() == null) {
            return false;
        }

        BigDecimal reconciledTransfer = BigDecimal.ZERO;
        BigDecimal pendingReconciliation = BigDecimal.ZERO;
        if (tracker.getTransferAmount().signum() > 0) {
            if (explicitReconciledTransfer != null || explicitPendingReconciliation != null) {
                reconciledTransfer = explicitReconciledTransfer != null ? explicitReconciledTransfer : BigDecimal.ZERO;
                pendingReconciliation = explicitPendingReconciliation != null ? explicitPendingReconciliation : BigDecimal.ZERO;
            } else if (isBankReconciled(tracker)) {
                reconciledTransfer = tracker.getTransferAmount();
            } else {
                pendingReconciliation = tracker.getTransferAmount();
            }
        }
        tracker.setReconciledTransferAmount(reconciledTransfer);
        tracker.setPendingReconciliationAmount(pendingReconciliation);

        statsRepository.upsertStatsDelta(tracker.getStoreId(), tracker.getStatDate(), 1,
                tracker.getRevenueAmount(), tracker.getCodAmount(), tracker.getTransferAmount());

        BigDecimal trackerExcess = nonNull(tracker.getExcessAmount());
        BigDecimal trackerExpired = nonNull(tracker.getExpiredReceiptAmount());
        if (reconciledTransfer.signum() != 0 || pendingReconciliation.signum() != 0
                || trackerExcess.signum() != 0 || trackerExpired.signum() != 0) {
            statsRepository.upsertReconciliationDelta(
                    tracker.getStoreId(), tracker.getStatDate(),
                    reconciledTransfer, pendingReconciliation, trackerExcess, trackerExpired);
        }

        tracker.setContributed(true);
        return true;
    }

    private boolean handlePostContributionReconciliation(
            com.clucky.reviewreportservice.entity.OrderProjectionTracker tracker,
            String eventReconciliationStatus
    ) {
        if (nonNull(tracker.getPendingReconciliationAmount()).signum() > 0
                && eventReconciliationStatus != null && RECONCILED_STATUSES.contains(eventReconciliationStatus)) {
            BigDecimal settled = nonNull(tracker.getPendingReconciliationAmount());
            tracker.setReconciledTransferAmount(nonNull(tracker.getReconciledTransferAmount()).add(settled));
            tracker.setPendingReconciliationAmount(BigDecimal.ZERO);
            tracker.setReconciliationStatus("RECONCILED");
            statsRepository.upsertReconciliationDelta(
                    tracker.getStoreId(), tracker.getStatDate(),
                    settled, settled.negate(), BigDecimal.ZERO, BigDecimal.ZERO);
        }
        return false;
    }

    @Transactional
    public void handleOrderCancelled(DomainEvent event) {
        requireEnabled();
        validateEvent(event);
        if (!"order.cancelled".equals(event.eventType())) {
            throw new IllegalArgumentException("Expected cancellation event");
        }
        JsonNode payload = event.payload();
        long orderId = positiveId(payload, "orderId");
        Long storeId = payload.hasNonNull("storeId") ? positiveId(payload, "storeId") : null;
        BigDecimal explicitExpired = resolveOptionalAmount(payload, "expiredReceiptAmount");
        LocalDate statDate = resolveStatDate(event, payload);

        if (processedEventRepository.claim(event.eventId(), event.eventType(), orderId) == 0) {
            return;
        }
        // Only track explicit non-revenue expired-order transfer receipts; never mutate order_count or revenue.
        if (storeId != null && explicitExpired != null && explicitExpired.signum() > 0) {
            statsRepository.upsertReconciliationDelta(
                    storeId, statDate,
                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, explicitExpired);
        }
    }

    public LocalDate resolveStatDate(DomainEvent event, JsonNode payload) {
        String field = "order.completed".equals(event.eventType()) ? "completedAt"
                : ("order.cancelled".equals(event.eventType()) ? "cancelledAt" : "paidAt");
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
        return validateVndAmount(value.decimalValue(), "Revenue amount");
    }

    private BigDecimal resolveOptionalAmount(JsonNode payload, String... fieldNames) {
        for (String field : fieldNames) {
            if (payload.has(field) && !payload.get(field).isNull()) {
                JsonNode value = payload.get(field);
                if (!value.isNumber()) {
                    throw new IllegalArgumentException("Numeric " + field + " required");
                }
                return validateVndAmount(value.decimalValue(), field);
            }
        }
        return null;
    }

    private BigDecimal validateVndAmount(BigDecimal amount, String fieldLabel) {
        if (amount.signum() < 0 || amount.stripTrailingZeros().scale() > 0 || amount.compareTo(MAX_VND) > 0) {
            throw new IllegalArgumentException(fieldLabel + " outside supported VND range");
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

    private String resolveOptionalReconciliationStatus(DomainEvent event, JsonNode payload, boolean isExpiredOrder) {
        if (isExpiredOrder) {
            return EXPIRED_RECEIPT_STATUS;
        }
        if (payload.hasNonNull("reconciliationStatus")) {
            return payload.get("reconciliationStatus").asText().trim().toUpperCase(Locale.ROOT);
        }
        if (payload.path("reconciled").asBoolean(false) || payload.path("bankConfirmed").asBoolean(false)) {
            return "RECONCILED";
        }
        if (payload.path("manualAccepted").asBoolean(false) || payload.path("counterDeclared").asBoolean(false)
                || "COLLECTION".equals(payload.path("operationType").asText())
                || "COLLECTED".equals(payload.path("status").asText())
                || "COLLECTED".equals(payload.path("paymentStatus").asText())) {
            return "PENDING_RECONCILIATION";
        }
        if ("payment.confirmed".equals(event.eventType())) {
            return "RECONCILED";
        }
        return null;
    }

    private boolean isBankReconciled(com.clucky.reviewreportservice.entity.OrderProjectionTracker tracker) {
        String status = tracker.getReconciliationStatus();
        if (status != null) {
            if (RECONCILED_STATUSES.contains(status)) {
                return true;
            }
            if (PENDING_RECONCILIATION_STATUSES.contains(status)) {
                return false;
            }
        }
        return tracker.isPaymentConfirmed();
    }

    private BigDecimal nonNull(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
