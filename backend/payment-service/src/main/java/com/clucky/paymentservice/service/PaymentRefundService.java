package com.clucky.paymentservice.service;

import com.clucky.paymentservice.dto.EligibleRefundQueryResponse;
import com.clucky.paymentservice.dto.PaymentMethod;
import com.clucky.paymentservice.dto.PaymentStatus;
import com.clucky.paymentservice.dto.ReserveRefundRequest;
import com.clucky.paymentservice.dto.ReserveRefundResponse;
import com.clucky.paymentservice.entity.BankTransaction;
import com.clucky.paymentservice.entity.Payment;
import com.clucky.paymentservice.entity.RefundReservation;
import com.clucky.paymentservice.exception.ApiException;
import com.clucky.paymentservice.exception.ErrorCode;
import com.clucky.paymentservice.repository.BankTransactionRepository;
import com.clucky.paymentservice.repository.PaymentRepository;
import com.clucky.paymentservice.repository.RefundReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class PaymentRefundService {
    private static final Logger LOG = LoggerFactory.getLogger(PaymentRefundService.class);

    private final PaymentRepository paymentRepository;
    private final BankTransactionRepository bankTransactionRepository;
    private final RefundReservationRepository refundReservationRepository;

    public PaymentRefundService(
            PaymentRepository paymentRepository,
            BankTransactionRepository bankTransactionRepository,
            RefundReservationRepository refundReservationRepository
    ) {
        this.paymentRepository = paymentRepository;
        this.bankTransactionRepository = bankTransactionRepository;
        this.refundReservationRepository = refundReservationRepository;
    }

    @Transactional(readOnly = true)
    public EligibleRefundQueryResponse getEligibleRefund(Long orderId, BigDecimal orderTotalAmount) {
        if (orderId == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }

        List<Payment> payments = paymentRepository.findByOrderIdOrderByIdDesc(orderId);
        if (payments.isEmpty()) {
            return new EligibleRefundQueryResponse(false, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, "No payment record found for order");
        }

        Payment payment = payments.get(0);
        if (payment.getMethod() != PaymentMethod.BANK_TRANSFER) {
            return new EligibleRefundQueryResponse(false, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, "Order payment method is not BANK_TRANSFER");
        }

        if (payment.getStatus() != PaymentStatus.PAID) {
            return new EligibleRefundQueryResponse(false, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, "Payment is not in PAID status");
        }

        // Determine actual received amount from payment or matched bank transaction
        BigDecimal receivedAmount = payment.getAmount();
        if (payment.getOrderCode() != null) {
            Optional<BankTransaction> tx = bankTransactionRepository.findByMatchedOrderCode(payment.getOrderCode());
            if (tx.isPresent() && tx.get().getAmount() != null) {
                receivedAmount = tx.get().getAmount();
            }
        }

        BigDecimal targetOrderAmount = (orderTotalAmount != null && orderTotalAmount.compareTo(BigDecimal.ZERO) > 0)
                ? orderTotalAmount
                : payment.getAmount();

        // Basic refund eligibility only covers up to the order amount; excess is excluded
        BigDecimal eligibleAmount = receivedAmount.min(targetOrderAmount);

        List<RefundReservation> activeReservations = refundReservationRepository.findActiveByOrderId(orderId);
        BigDecimal heldAmount = activeReservations.stream()
                .map(RefundReservation::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal refundableAmount = eligibleAmount.subtract(heldAmount).max(BigDecimal.ZERO);
        boolean eligible = refundableAmount.compareTo(BigDecimal.ZERO) > 0;

        return new EligibleRefundQueryResponse(eligible, receivedAmount, eligibleAmount, heldAmount, refundableAmount,
                eligible ? "Eligible" : "No remaining refundable balance");
    }

    @Transactional
    public synchronized ReserveRefundResponse reserveRefund(ReserveRefundRequest request) {
        if (request == null || request.refundRequestId() == null || request.orderId() == null || request.amount() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }

        // Idempotency check: if reservation already exists for this refund request
        Optional<RefundReservation> existingOpt = refundReservationRepository.findByRefundRequestId(request.refundRequestId());
        if (existingOpt.isPresent()) {
            RefundReservation existing = existingOpt.get();
            if (existing.getAmount().compareTo(request.amount()) == 0) {
                return new ReserveRefundResponse(existing.getId(), existing.getRefundRequestId(), existing.getOrderId(), existing.getAmount(), existing.getStatus());
            } else {
                throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            }
        }

        EligibleRefundQueryResponse eligibility = getEligibleRefund(request.orderId(), null);
        if (!eligibility.eligible() || request.amount().compareTo(eligibility.refundableAmount()) > 0) {
            LOG.warn("event=refund_reserve_exceeded orderId={} requested={} available={}",
                    request.orderId(), request.amount(), eligibility.refundableAmount());
            throw new ApiException(ErrorCode.REFUND_AMOUNT_EXCEEDED);
        }

        RefundReservation reservation = new RefundReservation();
        reservation.setRefundRequestId(request.refundRequestId());
        reservation.setOrderId(request.orderId());
        reservation.setOrderCode(request.orderCode() != null ? request.orderCode() : "N/A");
        reservation.setAmount(request.amount());
        reservation.setStatus("HELD");
        reservation.setCreatedAt(Instant.now());
        reservation = refundReservationRepository.save(reservation);

        LOG.info("event=refund_reserved reservationId={} refundRequestId={} orderId={} amount={}",
                reservation.getId(), reservation.getRefundRequestId(), reservation.getOrderId(), reservation.getAmount());

        return new ReserveRefundResponse(reservation.getId(), reservation.getRefundRequestId(), reservation.getOrderId(), reservation.getAmount(), reservation.getStatus());
    }

    @Transactional
    public void confirmRefund(Long refundRequestId) {
        RefundReservation reservation = refundReservationRepository.findByRefundRequestId(refundRequestId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        if ("CONFIRMED".equalsIgnoreCase(reservation.getStatus())) {
            return; // Idempotent
        }

        if (!"HELD".equalsIgnoreCase(reservation.getStatus())) {
            throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        }

        reservation.setStatus("CONFIRMED");
        reservation.setConfirmedAt(Instant.now());
        refundReservationRepository.save(reservation);

        LOG.info("event=refund_reservation_confirmed refundRequestId={} amount={}",
                reservation.getRefundRequestId(), reservation.getAmount());
    }

    @Transactional
    public void releaseRefund(Long refundRequestId) {
        Optional<RefundReservation> reservationOpt = refundReservationRepository.findByRefundRequestId(refundRequestId);
        if (reservationOpt.isPresent()) {
            RefundReservation reservation = reservationOpt.get();
            if ("HELD".equalsIgnoreCase(reservation.getStatus())) {
                reservation.setStatus("RELEASED");
                reservation.setReleasedAt(Instant.now());
                refundReservationRepository.save(reservation);
                LOG.info("event=refund_reservation_released refundRequestId={}", refundRequestId);
            }
        }
    }
}

