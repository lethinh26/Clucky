package com.clucky.paymentservice.service;

import com.clucky.paymentservice.dto.*;
import com.clucky.paymentservice.entity.RefundReservation;
import com.clucky.paymentservice.exception.ApiException;
import com.clucky.paymentservice.exception.ErrorCode;
import com.clucky.paymentservice.repository.RefundReservationRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;

@Service
public class PaymentRefundService {
    private final JdbcTemplate jdbc;
    private final RefundReservationRepository reservations;

    public PaymentRefundService(JdbcTemplate jdbc, RefundReservationRepository reservations) {
        this.jdbc = jdbc;
        this.reservations = reservations;
    }

    @Transactional(readOnly = true)
    public EligibleRefundQueryResponse getEligibleRefund(Long orderId, BigDecimal orderAmount) {
        if (orderId == null || orderId <= 0) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        var payments = jdbc.queryForList("SELECT id,amount,method,status,closed_reason,order_code FROM payment_service.payments WHERE order_id=?", orderId);
        if (payments.isEmpty()) return unavailable("No payment ledger");
        BigDecimal total = (BigDecimal) payments.getFirst().get("amount");
        if (total == null || total.signum() <= 0 || orderAmount != null && total.compareTo(orderAmount) != 0
                || payments.stream().anyMatch(payment -> !"BANK_TRANSFER".equals(payment.get("method"))
                || "EXPIRED".equals(payment.get("status")) || "REFUNDED".equals(payment.get("status")) || "EXPIRED".equals(payment.get("closed_reason"))
                || total.compareTo((BigDecimal) payment.get("amount")) != 0)) return unavailable("Payment scope is not eligible");
        Boolean deferred = jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM payment_service.collections WHERE order_id=? "
                + "AND (status='PENDING' OR (status='ACCEPTED' AND cash_amount>0)))", Boolean.class, orderId);
        if (Boolean.TRUE.equals(deferred)) return unavailable("Cash, mixed or unsettled collection is deferred");
        BigDecimal received = jdbc.queryForObject("""
                SELECT coalesce(sum(receipt.amount),0) FROM payment_service.bank_transactions receipt
                WHERE receipt.transfer_direction='in' AND receipt.webhook_fingerprint IS NOT NULL
                  AND (receipt.conflict_count=0 OR receipt.conflict_reviewed) AND receipt.status='MATCHED'
                  AND (receipt.payment_id IN (SELECT id FROM payment_service.payments WHERE order_id=?)
                    OR receipt.collection_id IN (SELECT id FROM payment_service.collections
                       WHERE order_id=? AND status='ACCEPTED' AND cash_amount=0))
                  AND (receipt.payment_id IS NULL OR receipt.payment_id IN (SELECT id FROM payment_service.payments WHERE order_id=?))
                  AND (receipt.collection_id IS NULL OR receipt.collection_id IN (SELECT id FROM payment_service.collections
                       WHERE order_id=? AND status='ACCEPTED' AND cash_amount=0))
                """, BigDecimal.class, orderId, orderId, orderId, orderId);
        BigDecimal held = reservations.findActiveByOrderId(orderId).stream().map(RefundReservation::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal eligible = received.compareTo(total) >= 0 ? total : BigDecimal.ZERO;
        BigDecimal remaining = eligible.subtract(held).max(BigDecimal.ZERO);
        return new EligibleRefundQueryResponse(remaining.signum() > 0, received, eligible, held, remaining,
                remaining.signum() > 0 ? "Eligible allocated bank receipts; excess excluded" : "No eligible unreserved receipts");
    }

    private EligibleRefundQueryResponse unavailable(String reason) {
        return new EligibleRefundQueryResponse(false, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, reason);
    }

    private void lockRequest(Long refundId) {
        if (refundId == null || refundId <= 0) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?,0))", Object.class, "refund-request:" + refundId);
    }

    private void lockOrder(Long orderId) {
        jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?,0))", Object.class, "payment-order:" + orderId);
        jdbc.queryForList("SELECT id FROM payment_service.payments WHERE order_id=? ORDER BY id FOR UPDATE", orderId);
        jdbc.queryForList("SELECT id FROM payment_service.collections WHERE order_id=? ORDER BY id FOR UPDATE", orderId);
        jdbc.queryForList("SELECT id FROM payment_service.bank_transactions WHERE payment_id IN (SELECT id FROM payment_service.payments WHERE order_id=?) "
                + "OR collection_id IN (SELECT id FROM payment_service.collections WHERE order_id=?) ORDER BY id FOR UPDATE", orderId, orderId);
    }

    @Transactional
    public ReserveRefundResponse reserveRefund(ReserveRefundRequest request) {
        if (request == null || request.orderId() == null || request.orderId() <= 0 || request.amount() == null
                || request.amount().signum() <= 0 || request.amount().stripTrailingZeros().scale() > 0
                || request.orderCode() == null || request.orderCode().isBlank()) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        lockRequest(request.refundRequestId());
        if (Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM payment_service.refund_releases WHERE refund_request_id=?)", Boolean.class, request.refundRequestId())))
            throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        lockOrder(request.orderId());
        var existing = reservations.findByRefundRequestId(request.refundRequestId());
        if (existing.isPresent()) {
            var reservation = existing.get();
            if (!Objects.equals(reservation.getOrderId(), request.orderId()) || !Objects.equals(reservation.getOrderCode(), request.orderCode())
                    || reservation.getAmount().compareTo(request.amount()) != 0) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            if ("RELEASED".equals(reservation.getStatus())) throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
            if ("HELD".equals(reservation.getStatus())) {
                var eligibility = getEligibleRefund(request.orderId(), null);
                if (eligibility.eligibleAmount().compareTo(reservation.getAmount()) < 0
                        || eligibility.heldAmount().compareTo(eligibility.eligibleAmount()) > 0)
                    throw new ApiException(ErrorCode.REFUND_AMOUNT_EXCEEDED);
            }
            return response(reservation);
        }
        if (!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM payment_service.payments WHERE order_id=? AND order_code=?)",
                Boolean.class, request.orderId(), request.orderCode()))) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        var eligibility = getEligibleRefund(request.orderId(), null);
        if (!eligibility.eligible() || request.amount().compareTo(eligibility.eligibleAmount()) != 0
                || request.amount().compareTo(eligibility.refundableAmount()) > 0) throw new ApiException(ErrorCode.REFUND_AMOUNT_EXCEEDED);
        var reservation = existing.orElseGet(RefundReservation::new);
        reservation.setRefundRequestId(request.refundRequestId());
        reservation.setOrderId(request.orderId());
        reservation.setOrderCode(request.orderCode());
        reservation.setAmount(request.amount());
        reservation.setStatus("HELD");
        reservation.setReleasedAt(null);
        if (reservation.getCreatedAt() == null) reservation.setCreatedAt(Instant.now());
        return response(reservations.saveAndFlush(reservation));
    }

    private ReserveRefundResponse response(RefundReservation reservation) {
        return new ReserveRefundResponse(reservation.getId(), reservation.getRefundRequestId(), reservation.getOrderId(), reservation.getAmount(), reservation.getStatus());
    }

    @Transactional(readOnly = true)
    public ReserveRefundResponse reservation(Long refundId) {
        if (refundId == null || refundId <= 0) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        return response(reservations.findByRefundRequestId(refundId).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND)));
    }

    @Transactional
    public void confirmRefund(Long refundId, ConfirmRefundRequest request) {
        lockRequest(refundId);
        var reservation = reservations.findByRefundRequestId(refundId).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        lockOrder(reservation.getOrderId());
        if (request == null || !Objects.equals(request.orderId(), reservation.getOrderId()) || request.amount() == null
                || request.amount().compareTo(reservation.getAmount()) != 0 || request.attemptId() == null
                || !request.attemptId().matches("[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}") || request.evidenceReference() == null
                || !request.evidenceReference().matches("[a-f0-9]{64}")) throw new ApiException(ErrorCode.EVIDENCE_REQUIRED);
        if ("CONFIRMED".equals(reservation.getStatus())) {
            var stored = jdbc.queryForMap("SELECT attempt_id,evidence_reference FROM payment_service.refund_reservations WHERE id=?", reservation.getId());
            if (!Objects.equals(request.attemptId(), stored.get("attempt_id")) || !Objects.equals(request.evidenceReference(), stored.get("evidence_reference"))) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            return;
        }
        if (!"HELD".equals(reservation.getStatus())) throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        var eligibility = getEligibleRefund(reservation.getOrderId(), null);
        if (eligibility.heldAmount().compareTo(eligibility.eligibleAmount()) > 0 || eligibility.eligibleAmount().signum() <= 0) throw new ApiException(ErrorCode.REFUND_AMOUNT_EXCEEDED);
        jdbc.update("UPDATE payment_service.refund_reservations SET status='CONFIRMED',confirmed_at=now(),attempt_id=?,evidence_reference=? WHERE id=?",
                request.attemptId(), request.evidenceReference(), reservation.getId());
        jdbc.update("UPDATE payment_service.payments SET status='REFUNDED' WHERE order_id=?", reservation.getOrderId());
    }

    @Transactional
    public void releaseRefund(Long refundId) {
        lockRequest(refundId);
        jdbc.update("INSERT INTO payment_service.refund_releases(refund_request_id) VALUES (?) ON CONFLICT DO NOTHING", refundId);
        var existing = reservations.findByRefundRequestId(refundId);
        if (existing.isEmpty()) return;
        var reservation = existing.get();
        lockOrder(reservation.getOrderId());
        if ("CONFIRMED".equals(reservation.getStatus())) throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        if ("HELD".equals(reservation.getStatus())) {
            reservation.setStatus("RELEASED");
            reservation.setReleasedAt(Instant.now());
            reservations.saveAndFlush(reservation);
        }
    }
}
