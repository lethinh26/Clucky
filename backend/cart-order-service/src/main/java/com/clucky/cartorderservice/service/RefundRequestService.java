package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.config.AccessGuard;
import com.clucky.cartorderservice.config.CurrentActor;
import com.clucky.cartorderservice.dto.*;
import com.clucky.cartorderservice.entity.*;
import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import com.clucky.cartorderservice.mapper.DomainMapper;
import com.clucky.cartorderservice.media.RefundEvidenceService;
import com.clucky.cartorderservice.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
public class RefundRequestService {
    private final RefundRequestRepository refunds;
    private final RefundAttemptRepository attempts;
    private final OrderRepository orders;
    private final OrderStatusHistoryRepository histories;
    private final AccessGuard access;
    private final PaymentClient payments;
    private final RefundEvidenceService evidence;
    private final OrderEventPublisher events;
    private final ObjectMapper mapper;
    private final CustomerProfileClient profiles;

    public RefundRequestService(RefundRequestRepository refunds, RefundAttemptRepository attempts, OrderRepository orders,
            OrderStatusHistoryRepository histories, AccessGuard access, PaymentClient payments,
            RefundEvidenceService evidence, OrderEventPublisher events, ObjectMapper mapper, CustomerProfileClient profiles) {
        this.refunds = refunds; this.attempts = attempts; this.orders = orders; this.histories = histories;
        this.access = access; this.payments = payments; this.evidence = evidence; this.events = events; this.mapper = mapper;
        this.profiles = profiles;
    }

    private CurrentActor role(boolean customerAllowed) {
        var actor = CurrentActor.require();
        if (actor.role() != Role.ADMIN && actor.role() != Role.STORE_MANAGER
                && !(customerAllowed && actor.role() == Role.CUSTOMER)) throw new ApiException(ErrorCode.FORBIDDEN);
        return actor;
    }

    private void scope(Order order, boolean customerAllowed) {
        var actor = role(customerAllowed);
        if (actor.role() == Role.CUSTOMER) access.requireOwner(order.getCustomerId());
        else access.requireStore(order.getStoreId());
    }

    private Order order(RefundRequest refund) {
        var order = orders.findById(refund.getOrderId()).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        if (!Objects.equals(refund.getCustomerId(), order.getCustomerId())) throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        return order;
    }

    private RefundRequest locked(Long id, boolean customerAllowed) {
        role(customerAllowed);
        var refund = refunds.lockById(id).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        scope(order(refund), customerAllowed);
        return refund;
    }

    private void state(RefundRequest refund, String... allowed) {
        if (refund.getPaymentOperation() != null || refund.getConfirmationRequestedAt() != null || !Arrays.asList(allowed).contains(refund.getStatus()))
            throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
    }

    private RefundRequestResponse response(RefundRequest refund, Order order) {
        return DomainMapper.toResponse(refund, order, attempts.findByRefundRequestIdOrderByAttemptNumberAsc(refund.getId()));
    }

    private void audit(RefundRequest refund, Order order, String action) {
        var actor = CurrentActor.require();
        events.auditRefund(order, refund, action, actor.userId(), actor.role().name());
    }

    private OrderStatusHistory cancellation(Order order) {
        if ("DELIVERY_FAILED".equals(order.getStatus())
                && "DELIVERY".equals(order.getType())
                && "BANK_TRANSFER".equals(order.getPaymentMethod())
                && "PAID".equals(order.getPaymentStatus())) {
            // Only a terminal outcome from the Shipping Service makes a paid failed delivery refundable.
            return histories.findByOrderIdOrderByCreatedAtAsc(order.getId()).stream()
                    .filter(entry -> "DELIVERY_FAILED".equals(entry.getToStatus())
                            && "SHIPPING".equals(entry.getFromStatus())
                            && "SHIPPING_SIMULATOR".equals(entry.getChangedRole()))
                    .findFirst().orElseThrow(() -> new ApiException(ErrorCode.REFUND_NOT_ELIGIBLE));
        }
        if (!"CANCELLED".equals(order.getStatus()) || !"BANK_TRANSFER".equals(order.getPaymentMethod())
                || order.getCollectionMethod() != null && !"BANK_TRANSFER".equals(order.getCollectionMethod()))
            throw new ApiException(ErrorCode.REFUND_NOT_ELIGIBLE);
        var history = histories.findByOrderIdOrderByCreatedAtAsc(order.getId());
        var prepared = Set.of("PREPARING", "READY", "SHIPPING", "COMPLETED");
        if (history.stream().anyMatch(entry -> entry.getFromStatus() != null && prepared.contains(entry.getFromStatus())
                || entry.getToStatus() != null && prepared.contains(entry.getToStatus()))) throw new ApiException(ErrorCode.REFUND_NOT_ELIGIBLE);
        var cancelled = history.stream().filter(entry -> "CANCELLED".equals(entry.getToStatus())).findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.REFUND_NOT_ELIGIBLE));
        if (cancelled.getFromStatus() == null || !List.of("PENDING_PAYMENT", "CONFIRMED").contains(cancelled.getFromStatus())
                || cancelled.getChangedRole() == null || !Set.of("CUSTOMER", "ADMIN", "STORE_MANAGER", "STAFF").contains(cancelled.getChangedRole()))
            throw new ApiException(ErrorCode.REFUND_NOT_ELIGIBLE);
        return cancelled;
    }

    private RefundAttempt processingAttempt(RefundRequest refund) {
        if (refund.getCurrentAttemptId() == null) throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        var attempt = attempts.findByAttemptId(refund.getCurrentAttemptId()).orElseThrow(() -> new ApiException(ErrorCode.INVALID_REFUND_STATE));
        if (!Objects.equals(attempt.getRefundRequestId(), refund.getId()) || !"PROCESSING".equals(attempt.getStatus())
                || attempt.getAmount() == null || attempt.getAmount().compareTo(refund.getAmount()) != 0
                || !Objects.equals(attempt.getAttemptNumber(), refund.getAttemptCount())
                || !Objects.equals(attempt.getBankName(), refund.getBankName())
                || !Objects.equals(attempt.getBankBin(), refund.getBankBin())
                || !Objects.equals(attempt.getBankAccountNo(), refund.getBankAccountNo())
                || !Objects.equals(attempt.getBankAccountName(), refund.getBankAccountName())) throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        try {
            var snapshot = mapper.readTree(refund.getCurrentAttemptBankSnapshot());
            if (snapshot.path("bankDetailsVersion").asInt(-1) != refund.getBankDetailsVersion()
                    || refund.getBankBin() != null && !Objects.equals(snapshot.path("bankBin").asText(null), refund.getBankBin()))
                throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        } catch (Exception failure) { throw new ApiException(ErrorCode.INVALID_REFUND_STATE); }
        return attempt;
    }

    public record CreatedRefund(RefundRequestResponse refund, boolean created) {}

    @Transactional
    public CreatedRefund createRefundRequest(CreateRefundRequest request) {
        if (CurrentActor.require().role() != Role.CUSTOMER) throw new ApiException(ErrorCode.FORBIDDEN);
        if (request == null || request.orderId() == null || request.orderId() <= 0 || request.reason() == null || request.reason().isBlank())
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        var order = orders.lockById(request.orderId()).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        scope(order, true);
        if (!order.isCustomerEmailVerified() && CurrentActor.require().role() == Role.CUSTOMER) {
            order.setCustomerEmail(profiles.currentCustomerEmail(order.getCustomerId()));
            order.setCustomerEmailVerified(true);
        }
        var cancelled = cancellation(order);
        var existing = refunds.findAllByOrderId(order.getId()).stream().filter(refund -> !"REJECTED".equals(refund.getStatus())).findFirst();
        if (existing.isPresent()) {
            RefundRequest refund = existing.get();
            boolean hasIncomingBankDetails = request.bankBin() != null && !request.bankBin().isBlank()
                    && request.bankAccountNo() != null && !request.bankAccountNo().isBlank()
                    && request.bankAccountName() != null && !request.bankAccountName().trim().isBlank();

            if (hasIncomingBankDetails && Set.of("PENDING", "WAITING_BANK_DETAILS").contains(refund.getStatus())) {
                if (!request.bankBin().matches("\\d{6}") || !request.bankAccountNo().matches("\\d{1,80}")) {
                    throw new ApiException(ErrorCode.VALIDATION_ERROR);
                }
                String bankName = request.bankName() != null && !request.bankName().isBlank()
                        ? request.bankName().trim()
                        : request.bankBin();
                if (request.reason() != null && !request.reason().isBlank()) {
                    refund.setReason(request.reason().trim());
                }
                refund.setBankName(bankName);
                refund.setBankBin(request.bankBin());
                refund.setBankAccountNo(request.bankAccountNo().trim());
                refund.setBankAccountName(request.bankAccountName().trim().toUpperCase(Locale.ROOT));
                if ("WAITING_BANK_DETAILS".equals(refund.getStatus())) {
                    refund.setStatus("APPROVED");
                }
                if (refund.getBankDetailsVersion() == null) {
                    refund.setBankDetailsVersion(1);
                } else {
                    refund.setBankDetailsVersion(refund.getBankDetailsVersion() + 1);
                }
                if (refund.getCreatedAt() == null) {
                    refund.setCreatedAt(Instant.now());
                }
                refund.setUpdatedAt(Instant.now());
                refund = refunds.saveAndFlush(refund);
                audit(refund, order, "REFUND_REQUESTED");
                return new CreatedRefund(response(refund, order), true);
            }
            return new CreatedRefund(response(refund, order), false);
        }
        if (request.bankBin() == null || !request.bankBin().matches("\\d{6}")
                || request.bankAccountNo() == null || !request.bankAccountNo().matches("\\d{1,80}")
                || request.bankAccountName() == null || request.bankAccountName().trim().isBlank())
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        var eligible = payments.getEligibleRefund(order.getId(), order.getTotalAmount());
        if (eligible == null || !eligible.eligible() || eligible.refundableAmount() == null || order.getTotalAmount().signum() <= 0
                || eligible.refundableAmount().compareTo(order.getTotalAmount()) < 0)
            throw new ApiException(ErrorCode.REFUND_NOT_ELIGIBLE);
        String bankName = request.bankName() != null && !request.bankName().isBlank()
                ? request.bankName().trim()
                : request.bankBin();
        var refund = new RefundRequest();
        refund.setOrderId(order.getId()); refund.setCustomerId(order.getCustomerId());
        refund.setAmount(order.getTotalAmount()); refund.setReason(request.reason().trim());
        refund.setStatus("PENDING"); refund.setCancellationReasonSnapshot(cancelled.getReason());
        refund.setCancellationStatusSnapshot(cancelled.getFromStatus());
        refund.setBankName(bankName);
        refund.setBankBin(request.bankBin());
        refund.setBankAccountNo(request.bankAccountNo().trim());
        refund.setBankAccountName(request.bankAccountName().trim().toUpperCase(Locale.ROOT));
        refund.setBankDetailsVersion(1); refund.setAttemptCount(0); refund.setCreatedAt(Instant.now()); refund.setUpdatedAt(Instant.now());
        refund = refunds.saveAndFlush(refund);
        audit(refund, order, "REFUND_REQUESTED");
        return new CreatedRefund(response(refund, order), true);
    }

    @Transactional(readOnly = true)
    public PageResponse<RefundRequestResponse> getRefundRequests(Long customerId, Long requestedStoreId, String status, Long orderId, Pageable pageable) {
        var actor = role(true);
        if (customerId != null && actor.role() != Role.ADMIN) throw new ApiException(ErrorCode.FORBIDDEN);
        if (customerId != null && customerId <= 0 || requestedStoreId != null && requestedStoreId <= 0 || orderId != null && orderId <= 0)
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        String cleanStatus = status == null || status.isBlank() ? null : status.trim().toUpperCase(Locale.ROOT);
        if (cleanStatus != null && !Set.of("PENDING","APPROVED","PROCESSING","WAITING_BANK_DETAILS","REJECTED","REFUNDED").contains(cleanStatus))
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        Page<RefundRequest> page = refunds.findRefundRequests(actor.role() == Role.CUSTOMER ? actor.userId() : customerId,
                orderId, actor.role() == Role.CUSTOMER ? requestedStoreId : access.effectiveStore(requestedStoreId), cleanStatus, pageable);
        return PageResponse.from(page.map(refund -> DomainMapper.toResponse(refund, order(refund), List.of())));
    }

    @Transactional(readOnly = true)
    public RefundRequestResponse getRefundRequestById(Long id) {
        role(true);
        var refund = refunds.findById(id).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        var order = order(refund); scope(order, true);
        return response(refund, order);
    }

    @Transactional
    public RefundRequestResponse approveRefundRequest(Long id, ReviewRefundRequest request) {
        var refund = locked(id, false); var order = order(refund);
        if ("APPROVED".equals(refund.getStatus()) || "RESERVE".equals(refund.getPaymentOperation())) return response(refund, order);
        if (refund.getPaymentError() != null) throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        state(refund, "PENDING"); cancellation(order);
        refund.setReviewedBy(CurrentActor.require().userId()); refund.setReviewedAt(Instant.now());
        refund.setReviewRole(CurrentActor.require().role().name()); enqueue(refund, "RESERVE");
        refund.setReviewNote(request == null ? null : request.effectiveReason()); refund.setUpdatedAt(Instant.now()); refunds.save(refund);
        audit(refund, order, "REFUND_APPROVAL_REQUESTED");
        return response(refund, order);
    }

    @Transactional
    public RefundRequestResponse rejectRefundRequest(Long id, ReviewRefundRequest request) {
        var refund = locked(id, false); var order = order(refund);
        String reason = request == null ? null : request.effectiveReason();
        if (reason == null || reason.isBlank()) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        if ("REJECTED".equals(refund.getStatus())) return response(refund, order);
        if (ErrorCode.REFUND_ALREADY_EXISTS.name().equals(refund.getPaymentError())) throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        if (!"PENDING".equals(refund.getStatus()) || refund.getConfirmationRequestedAt() != null) throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        enqueue(refund, "RELEASE");
        refund.setStatus("REJECTED"); refund.setReviewNote(reason); refund.setReviewedBy(CurrentActor.require().userId());
        refund.setReviewedAt(Instant.now()); refund.setUpdatedAt(Instant.now()); refunds.save(refund);
        events.publishRefundEvent("refund.rejected", refund, order, reason); audit(refund, order, "REFUND_REJECTED");
        return response(refund, order);
    }

    @Transactional
    public RefundRequestResponse claimProcessing(Long id) {
        var refund = locked(id, false); var order = order(refund);
        if ("PROCESSING".equals(refund.getStatus())) {
            if (!Objects.equals(processingAttempt(refund).getCreatedBy(), CurrentActor.require().userId()))
                throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
            return response(refund, order);
        }
        state(refund, "APPROVED"); cancellation(order);
        var held = payments.reserveRefund(id, order.getId(), order.getOrderCode(), refund.getAmount());
        if (held == null || !"HELD".equals(held.status()) || !Objects.equals(held.refundRequestId(), id)
                || !Objects.equals(held.orderId(), order.getId()) || held.amount() == null || held.amount().compareTo(refund.getAmount()) != 0)
            throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        if (refund.getBankBin() == null || refund.getBankBin().isBlank()
                || refund.getBankName() == null || refund.getBankName().isBlank() || refund.getBankAccountNo() == null
                || refund.getBankAccountNo().isBlank() || refund.getBankAccountName() == null || refund.getBankAccountName().isBlank())
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        var attempt = new RefundAttempt();
        attempt.setRefundRequestId(id); attempt.setAttemptNumber(refund.getAttemptCount() + 1); attempt.setAttemptId(UUID.randomUUID().toString());
        attempt.setBankName(refund.getBankName()); attempt.setBankBin(refund.getBankBin());
        attempt.setBankAccountNo(refund.getBankAccountNo()); attempt.setBankAccountName(refund.getBankAccountName());
        attempt.setAmount(refund.getAmount()); attempt.setStatus("PROCESSING"); attempt.setCreatedAt(Instant.now()); attempt.setUpdatedAt(Instant.now());
        attempt.setCreatedBy(CurrentActor.require().userId()); attempts.save(attempt);
        String snapshot;
        try { snapshot = mapper.writeValueAsString(Map.of("bankName", refund.getBankName(), "bankBin", refund.getBankBin(), "bankAccountNo", refund.getBankAccountNo(),
                "bankAccountName", refund.getBankAccountName(), "amount", refund.getAmount(), "bankDetailsVersion", refund.getBankDetailsVersion()));
        } catch (Exception failure) { throw new ApiException(ErrorCode.INTERNAL_ERROR); }
        refund.setStatus("PROCESSING"); refund.setAttemptCount(attempt.getAttemptNumber()); refund.setCurrentAttemptId(attempt.getAttemptId());
        refund.setCurrentAttemptBankSnapshot(snapshot); refund.setEvidencePublicId(null); refund.setEvidenceUrl(null);
        refund.setEvidenceRegisteredAt(null); refund.setEvidenceRegisteredBy(null); refund.setUpdatedAt(Instant.now()); refunds.save(refund);
        audit(refund, order, "REFUND_PROCESSING_CLAIMED"); return response(refund, order);
    }

    @Transactional
    public RefundRequestResponse requestBankDetails(Long id, BankDetailsInvalidRequest request) {
        var refund = locked(id, false); var order = order(refund);
        state(refund, "APPROVED", "PROCESSING");
        if (request == null || request.reason() == null || request.reason().isBlank()) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        if ("PROCESSING".equals(refund.getStatus())) {
            if (!Boolean.TRUE.equals(request.transferNotCompleted()) || refund.getEvidencePublicId() != null) throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
            var attempt = processingAttempt(refund);
            if (!Objects.equals(attempt.getCreatedBy(), CurrentActor.require().userId())) throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
            attempt.setStatus("FAILED_BANK_DETAILS"); attempt.setFailureReason(request.reason().trim());
            attempt.setUpdatedAt(Instant.now()); attempts.save(attempt);
        }
        refund.setStatus("WAITING_BANK_DETAILS"); refund.setReviewNote(request.reason().trim()); refund.setUpdatedAt(Instant.now()); refunds.save(refund);
        events.publishRefundEvent("refund.waiting-bank-details", refund, order, request.reason().trim()); audit(refund, order, "REFUND_BANK_DETAILS_REQUESTED");
        return response(refund, order);
    }

    @Transactional
    public RefundRequestResponse updateBankDetails(Long id, UpdateBankDetailsRequest request) {
        var refund = locked(id, true); var order = order(refund);
        state(refund, "PENDING", "WAITING_BANK_DETAILS");
        if (request == null || request.bankBin() == null || !request.bankBin().matches("\\d{6}")
                || request.bankAccountNo() == null || !request.bankAccountNo().matches("\\d{1,80}")
                || request.bankAccountName() == null || request.bankAccountName().trim().isBlank())
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        if (CurrentActor.require().role() == Role.ADMIN && request.expectedBankDetailsVersion() == null)
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        if (request.expectedBankDetailsVersion() != null && !request.expectedBankDetailsVersion().equals(refund.getBankDetailsVersion()))
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        String bankName = request.bankName() != null && !request.bankName().isBlank()
                ? request.bankName().trim()
                : (refund.getBankName() != null ? refund.getBankName() : request.bankBin());
        refund.setBankName(bankName);
        refund.setBankBin(request.bankBin());
        refund.setBankAccountNo(request.bankAccountNo().trim());
        refund.setBankAccountName(request.bankAccountName().trim().toUpperCase(Locale.ROOT));
        refund.setBankDetailsVersion(refund.getBankDetailsVersion() + 1);
        if ("WAITING_BANK_DETAILS".equals(refund.getStatus())) refund.setStatus("APPROVED");
        if (!order.isCustomerEmailVerified() && CurrentActor.require().role() == Role.CUSTOMER) {
            order.setCustomerEmail(profiles.currentCustomerEmail(order.getCustomerId()));
            order.setCustomerEmailVerified(true);
        }
        refund.setUpdatedAt(Instant.now()); refunds.save(refund);
        audit(refund, order, "REFUND_BANK_DETAILS_UPDATED"); return response(refund, order);
    }

    @Transactional
    public RefundRequestResponse uploadEvidence(Long id, MultipartFile file) {
        var refund = locked(id, false); var order = order(refund);
        state(refund, "PROCESSING"); cancellation(order); var attempt = processingAttempt(refund);
        if (!Objects.equals(attempt.getCreatedBy(), CurrentActor.require().userId())) throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        var uploaded = evidence.uploadEvidence(order.getStoreId(), id, attempt.getAttemptId(), file);
        if (uploaded == null || uploaded.publicId() == null) throw new ApiException(ErrorCode.EVIDENCE_REQUIRED);
        attempt.setEvidencePublicId(uploaded.publicId()); attempt.setEvidenceUrl(null); attempt.setUpdatedAt(Instant.now()); attempts.save(attempt);
        refund.setEvidencePublicId(uploaded.publicId()); refund.setEvidenceUrl(null); refund.setEvidenceRegisteredAt(Instant.now());
        refund.setEvidenceRegisteredBy(CurrentActor.require().userId()); refund.setUpdatedAt(Instant.now()); refunds.save(refund);
        audit(refund, order, "REFUND_EVIDENCE_REGISTERED"); return response(refund, order);
    }

    @Transactional(readOnly = true)
    public EvidenceAccessResponse getEvidenceAccess(Long id) {
        role(true); var refund = refunds.findById(id).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        var order = order(refund); scope(order, true);
        if (!List.of("PROCESSING", "REFUNDED").contains(refund.getStatus())) throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        evidence.verifyEvidence(refund.getEvidencePublicId(), order.getStoreId(), id, refund.getCurrentAttemptId());
        return new EvidenceAccessResponse(evidence.generatePrivateDeliveryUrl(refund.getEvidencePublicId()), 600L);
    }

    @Transactional
    public RefundRequestResponse confirmRefund(Long id) {
        var refund = locked(id, false); var order = order(refund);
        if ("REFUNDED".equals(refund.getStatus()) || refund.getConfirmationRequestedAt() != null) return response(refund, order);
        state(refund, "PROCESSING"); cancellation(order); validateEvidence(refund, order);
        var actor = CurrentActor.require();
        if (!Objects.equals(processingAttempt(refund).getCreatedBy(), actor.userId())) throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        refund.setConfirmationRequestedAt(Instant.now()); refund.setConfirmationRequestedBy(actor.userId());
        enqueue(refund, "CONFIRM");
        refund.setConfirmationRequestedRole(actor.role().name()); refund.setUpdatedAt(Instant.now()); refunds.save(refund);
        audit(refund, order, "REFUND_CONFIRMATION_REQUESTED"); return response(refund, order);
    }

    private void validateEvidence(RefundRequest refund, Order order) {
        var attempt = processingAttempt(refund);
        if (refund.getEvidenceRegisteredAt() == null || refund.getEvidenceRegisteredBy() == null || refund.getEvidencePublicId() == null
                || !Objects.equals(refund.getEvidencePublicId(), attempt.getEvidencePublicId())) throw new ApiException(ErrorCode.EVIDENCE_REQUIRED);
        evidence.verifyEvidence(refund.getEvidencePublicId(), order.getStoreId(), refund.getId(), attempt.getAttemptId());
    }

    @Transactional
    public void completeConfirmation(Long id) {
        var refund = refunds.lockById(id).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        if ("REFUNDED".equals(refund.getStatus())) return;
        if (!"PROCESSING".equals(refund.getStatus()) || refund.getConfirmationRequestedAt() == null
                || refund.getConfirmationRequestedBy() == null || refund.getConfirmationRequestedRole() == null
                || !List.of("ADMIN", "STORE_MANAGER").contains(refund.getConfirmationRequestedRole()))
            throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        var order = orders.lockById(refund.getOrderId()).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        cancellation(order); processingAttempt(refund);
        if (refund.getEvidenceRegisteredAt() == null || refund.getEvidenceRegisteredBy() == null || refund.getEvidencePublicId() == null
                || !Objects.equals(refund.getEvidencePublicId(), processingAttempt(refund).getEvidencePublicId())) throw new ApiException(ErrorCode.EVIDENCE_REQUIRED);
        String reference;
        try { reference = HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                .digest(refund.getEvidencePublicId().getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException failure) { throw new IllegalStateException(failure); }
        payments.confirmRefund(id, new PaymentClient.ConfirmRefundRequest(order.getId(), refund.getAmount(), refund.getCurrentAttemptId(), reference));
        var attempt = processingAttempt(refund); attempt.setStatus("REFUNDED"); attempt.setUpdatedAt(Instant.now()); attempts.save(attempt);
        refund.setStatus("REFUNDED"); refund.setConfirmedAt(Instant.now()); refund.setConfirmedBy(refund.getConfirmationRequestedBy());
        enqueue(refund, null);
        refund.setUpdatedAt(Instant.now()); refunds.save(refund); order.setPaymentStatus("REFUNDED"); orders.save(order);
        events.publishRefundEvent("refund.processed", refund, order, null);
        events.auditRefund(order, refund, "REFUND_CONFIRMED", refund.getConfirmationRequestedBy(), refund.getConfirmationRequestedRole());
    }

    private void enqueue(RefundRequest refund, String operation) {
        refund.setPaymentOperation(operation); refund.setPaymentError(null); refund.setPaymentRetryAt(operation == null ? null : Instant.now());
    }

    @Transactional
    public void recoverPayment(Long id) {
        var refund = refunds.lockById(id).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        if (refund.getPaymentOperation() == null) return;
        if ("CONFIRM".equals(refund.getPaymentOperation())) { completeConfirmation(id); return; }
        if ("RELEASE".equals(refund.getPaymentOperation())) {
            if (!Set.of("PENDING", "REJECTED").contains(refund.getStatus())) throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
            payments.releaseRefund(id); enqueue(refund, null);
            if ("PENDING".equals(refund.getStatus())) refund.setPaymentError(ErrorCode.INVALID_REFUND_STATE.name());
            refunds.save(refund); return;
        }
        if (!"PENDING".equals(refund.getStatus()) || refund.getReviewedBy() == null || refund.getReviewRole() == null
                || !Set.of("ADMIN","STORE_MANAGER").contains(refund.getReviewRole())) throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        var order = order(refund); cancellation(order);
        var reserved = payments.reserveRefund(id, order.getId(), order.getOrderCode(), refund.getAmount());
        if (reserved == null || !"HELD".equals(reserved.status()) || !Objects.equals(reserved.refundRequestId(), id)
                || !Objects.equals(reserved.orderId(), order.getId()) || reserved.amount() == null
                || reserved.amount().compareTo(refund.getAmount()) != 0) throw new ApiException(ErrorCode.UPSTREAM_ERROR);
        refund.setStatus("APPROVED"); enqueue(refund, null); refund.setUpdatedAt(Instant.now()); refunds.save(refund);
        events.publishRefundEvent("refund.approved", refund, order, refund.getReviewNote());
        events.auditRefund(order, refund, "REFUND_APPROVED", refund.getReviewedBy(), refund.getReviewRole());
    }

    @Transactional
    public void deferPayment(Long id, RuntimeException failure) {
        var refund = refunds.lockById(id).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        if (refund.getPaymentOperation() == null) return;
        refund.setPaymentError(failure instanceof ApiException api ? api.getCode().name() : ErrorCode.DEPENDENCY_UNAVAILABLE.name());
        refund.setPaymentRetryAt(Instant.now().plusSeconds(60)); refunds.save(refund);
    }

    @Transactional
    public void recoverUntrackedReservation(Long id) {
        var refund = refunds.lockById(id).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        if (!"PENDING".equals(refund.getStatus()) || refund.getPaymentOperation() != null || refund.getPaymentError() != null) return;
        refund.setPaymentRetryAt(Instant.now().plusSeconds(300));
        var held = payments.reservation(id);
        if (held == null) return;
        if (!Objects.equals(held.refundRequestId(), id) || !Objects.equals(held.orderId(), refund.getOrderId())
                || held.amount() == null || held.amount().compareTo(refund.getAmount()) != 0) throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        if ("HELD".equals(held.status())) enqueue(refund, "RELEASE");
        else refund.setPaymentError("CONFIRMED".equals(held.status()) ? ErrorCode.REFUND_ALREADY_EXISTS.name() : ErrorCode.INVALID_REFUND_STATE.name());
        refunds.save(refund);
    }

    @Transactional
    public boolean automaticRefund(Long orderId) {
        var order = orders.lockById(orderId).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        OrderStatusHistory cancelled;
        try { cancelled = cancellation(order); }
        catch (ApiException failure) { if (failure.getCode() == ErrorCode.REFUND_NOT_ELIGIBLE) return true; throw failure; }
        if (!refunds.findAllByOrderId(orderId).isEmpty()) return true;
        var eligible = payments.getEligibleRefund(orderId, order.getTotalAmount());
        if (eligible == null || !eligible.eligible() || eligible.refundableAmount() == null
                || order.getTotalAmount().signum() <= 0 || eligible.refundableAmount().compareTo(order.getTotalAmount()) < 0) return false;
        var refund = new RefundRequest(); refund.setOrderId(orderId); refund.setCustomerId(order.getCustomerId());
        refund.setAmount(order.getTotalAmount()); refund.setReason(cancelled.getReason());
        refund.setCancellationReasonSnapshot(cancelled.getReason()); refund.setCancellationStatusSnapshot(cancelled.getFromStatus());
        refund.setStatus("WAITING_BANK_DETAILS");
        refund.setCreatedAt(Instant.now()); refund.setUpdatedAt(Instant.now());
        refund.setBankDetailsVersion(1); refund.setAttemptCount(0);
        refund = refunds.saveAndFlush(refund);
        events.publishRefundEvent("refund.waiting-bank-details", refund, order, cancelled.getReason());
        events.auditRefund(order, refund, "REFUND_REQUESTED", cancelled.getChangedBy(), cancelled.getChangedRole());
        return true;
    }
}
