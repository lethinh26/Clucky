package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.config.AccessGuard;
import com.clucky.cartorderservice.config.CurrentActor;
import com.clucky.cartorderservice.dto.*;
import com.clucky.cartorderservice.entity.Order;
import com.clucky.cartorderservice.entity.OrderStatusHistory;
import com.clucky.cartorderservice.entity.RefundAttempt;
import com.clucky.cartorderservice.entity.RefundRequest;
import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import com.clucky.cartorderservice.mapper.DomainMapper;
import com.clucky.cartorderservice.media.RefundEvidenceService;
import com.clucky.cartorderservice.repository.OrderRepository;
import com.clucky.cartorderservice.repository.OrderStatusHistoryRepository;
import com.clucky.cartorderservice.repository.RefundAttemptRepository;
import com.clucky.cartorderservice.repository.RefundRequestRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
    private static final Logger LOG = LoggerFactory.getLogger(RefundRequestService.class);

    private final RefundRequestRepository refundRequestRepository;
    private final RefundAttemptRepository refundAttemptRepository;
    private final OrderRepository orderRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final AccessGuard accessGuard;
    private final PaymentClient paymentClient;
    private final RefundEvidenceService refundEvidenceService;
    private final OrderEventPublisher orderEventPublisher;
    private final ObjectMapper objectMapper;

    public RefundRequestService(
            RefundRequestRepository refundRequestRepository,
            RefundAttemptRepository refundAttemptRepository,
            OrderRepository orderRepository,
            OrderStatusHistoryRepository orderStatusHistoryRepository,
            AccessGuard accessGuard,
            PaymentClient paymentClient,
            RefundEvidenceService refundEvidenceService,
            OrderEventPublisher orderEventPublisher,
            ObjectMapper objectMapper
    ) {
        this.refundRequestRepository = refundRequestRepository;
        this.refundAttemptRepository = refundAttemptRepository;
        this.orderRepository = orderRepository;
        this.orderStatusHistoryRepository = orderStatusHistoryRepository;
        this.accessGuard = accessGuard;
        this.paymentClient = paymentClient;
        this.refundEvidenceService = refundEvidenceService;
        this.orderEventPublisher = orderEventPublisher;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public RefundRequestResponse createRefundRequest(CreateRefundRequest request) {
        if (request == null || request.orderId() == null || request.reason() == null || request.reason().isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }

        Order order = orderRepository.findById(request.orderId())
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        CurrentActor actor = CurrentActor.require();
        if (actor.role() == Role.STAFF) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }

        if (order.getCustomerId() != null) {
            if (actor.role() == Role.CUSTOMER) {
                accessGuard.requireOwner(order.getCustomerId());
            } else if (actor.role() == Role.STORE_MANAGER) {
                accessGuard.requireStore(order.getStoreId());
            }
        } else {
            // Counter order with no customerId: must be STORE_MANAGER of store or ADMIN
            if (actor.role() != Role.STORE_MANAGER && actor.role() != Role.ADMIN) {
                throw new ApiException(ErrorCode.FORBIDDEN);
            }
            if (actor.role() == Role.STORE_MANAGER) {
                accessGuard.requireStore(order.getStoreId());
            }
        }

        // Eligibility 1: Method must be pure bank transfer
        if (!"BANK_TRANSFER".equalsIgnoreCase(order.getPaymentMethod())) {
            LOG.warn("event=refund_not_eligible reason=not_bank_transfer orderId={} method={}",
                    order.getId(), order.getPaymentMethod());
            throw new ApiException(ErrorCode.REFUND_NOT_ELIGIBLE);
        }

        // Eligibility 2: Must be cancelled
        if (!"CANCELLED".equalsIgnoreCase(order.getStatus())) {
            LOG.warn("event=refund_not_eligible reason=order_not_cancelled orderId={} status={}",
                    order.getId(), order.getStatus());
            throw new ApiException(ErrorCode.REFUND_NOT_ELIGIBLE);
        }

        // Eligibility 3: Cancellation history snapshot check
        List<OrderStatusHistory> histories = orderStatusHistoryRepository.findByOrderIdOrderByCreatedAtAsc(order.getId());
        Set<String> preparedStatuses = Set.of("PREPARING", "READY", "SHIPPING", "COMPLETED");
        boolean wasEverPrepared = histories.stream().anyMatch(h ->
                (h.getToStatus() != null && preparedStatuses.contains(h.getToStatus()))
                        || (h.getFromStatus() != null && preparedStatuses.contains(h.getFromStatus())));
        if (wasEverPrepared) {
            LOG.warn("event=refund_not_eligible reason=was_ever_prepared orderId={}", order.getId());
            throw new ApiException(ErrorCode.REFUND_NOT_ELIGIBLE);
        }

        Optional<OrderStatusHistory> cancelTransition = histories.stream()
                .filter(h -> "CANCELLED".equalsIgnoreCase(h.getToStatus()))
                .findFirst();

        if (cancelTransition.isEmpty()) {
            throw new ApiException(ErrorCode.REFUND_NOT_ELIGIBLE);
        }

        OrderStatusHistory cancelRecord = cancelTransition.get();
        Set<String> validCancelFromStatuses = Set.of("PENDING_PAYMENT", "CONFIRMED");
        if (cancelRecord.getFromStatus() == null || !validCancelFromStatuses.contains(cancelRecord.getFromStatus())) {
            LOG.warn("event=refund_not_eligible reason=invalid_cancellation_from_status orderId={} fromStatus={}",
                    order.getId(), cancelRecord.getFromStatus());
            throw new ApiException(ErrorCode.REFUND_NOT_ELIGIBLE);
        }

        // Expiry cancellation check: do not refund expired sessions
        if ("SYSTEM_SAGA".equalsIgnoreCase(cancelRecord.getChangedRole())
                || (cancelRecord.getReason() != null && (cancelRecord.getReason().toLowerCase().contains("expire")
                || cancelRecord.getReason().toLowerCase().contains("hết hạn")))) {
            LOG.warn("event=refund_not_eligible reason=expiry_cancellation orderId={}", order.getId());
            throw new ApiException(ErrorCode.REFUND_NOT_ELIGIBLE);
        }

        // Check active refund requests to prevent duplicates
        List<RefundRequest> existing = refundRequestRepository.findAllByOrderId(order.getId());
        Set<String> activeStatuses = Set.of("PENDING", "APPROVED", "PROCESSING", "WAITING_BANK_DETAILS", "REFUNDED");
        boolean hasActive = existing.stream().anyMatch(r ->
                r.getStatus() != null && activeStatuses.contains(r.getStatus().toUpperCase()));
        if (hasActive) {
            LOG.warn("event=refund_request_conflict orderId={}", order.getId());
            throw new ApiException(ErrorCode.REFUND_ALREADY_EXISTS);
        }

        // Query Payment Service for eligible received amount
        PaymentClient.EligibleRefundResponse paymentCheck = paymentClient.getEligibleRefund(order.getId(), order.getTotalAmount());
        if (!paymentCheck.eligible() || paymentCheck.refundableAmount().compareTo(BigDecimal.ZERO) <= 0) {
            LOG.warn("event=refund_not_eligible reason=payment_not_eligible orderId={} refundableAmount={}",
                    order.getId(), paymentCheck.refundableAmount());
            throw new ApiException(ErrorCode.REFUND_NOT_ELIGIBLE);
        }

        // Server calculates refundable amount (min of order total and remaining eligible received amount)
        BigDecimal refundAmount = order.getTotalAmount().min(paymentCheck.refundableAmount());

        RefundRequest refund = new RefundRequest();
        refund.setOrderId(order.getId());
        refund.setCustomerId(order.getCustomerId());
        refund.setAmount(refundAmount);
        refund.setReason(request.reason().trim());
        refund.setStatus("PENDING");
        refund.setCancellationReasonSnapshot(cancelRecord.getReason());
        refund.setCancellationStatusSnapshot(cancelRecord.getFromStatus());
        refund.setBankName(request.bankName() != null ? request.bankName().trim() : null);
        refund.setBankAccountNo(request.bankAccountNo() != null ? request.bankAccountNo().trim() : null);
        refund.setBankAccountName(request.bankAccountName() != null ? request.bankAccountName().trim() : null);
        refund.setBankDetailsVersion(1);
        refund.setAttemptCount(0);
        refund.setCreatedAt(Instant.now());
        refund.setUpdatedAt(Instant.now());
        refund = refundRequestRepository.save(refund);

        LOG.info("event=refund_requested refundId={} orderId={} customerId={} amount={}",
                refund.getId(), order.getId(), order.getCustomerId(), refund.getAmount());

        return DomainMapper.toResponse(refund, order, List.of());
    }

    @Transactional(readOnly = true)
    public PageResponse<RefundRequestResponse> getRefundRequests(Long requestedStoreId, String status, Long orderId, Pageable pageable) {
        CurrentActor actor = CurrentActor.require();
        String cleanStatus = (status != null && !status.isBlank()) ? status.trim().toUpperCase() : null;

        Page<RefundRequest> page;
        if (actor.role() == Role.CUSTOMER) {
            if (orderId != null) {
                page = refundRequestRepository.findByCustomerIdAndOrderId(actor.userId(), orderId, pageable);
            } else {
                page = refundRequestRepository.findByCustomerId(actor.userId(), pageable);
            }
        } else {
            Long effectiveStoreId = accessGuard.effectiveStore(requestedStoreId);
            page = refundRequestRepository.findRefundRequests(orderId, effectiveStoreId, cleanStatus, pageable);
        }

        return PageResponse.from(page.map(r -> {
            Order order = orderRepository.findById(r.getOrderId()).orElse(null);
            return DomainMapper.toResponse(r, order, List.of());
        }));
    }

    @Transactional(readOnly = true)
    public RefundRequestResponse getRefundRequestById(Long id) {
        RefundRequest refund = refundRequestRepository.findById(id)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        Order order = orderRepository.findById(refund.getOrderId())
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        CurrentActor actor = CurrentActor.require();
        if (actor.role() == Role.CUSTOMER) {
            accessGuard.requireOwner(order.getCustomerId());
        } else if (actor.role() == Role.STORE_MANAGER) {
            accessGuard.requireStore(order.getStoreId());
        } else if (actor.role() == Role.STAFF) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }

        List<RefundAttempt> attempts = refundAttemptRepository.findByRefundRequestIdOrderByAttemptNumberAsc(id);
        return DomainMapper.toResponse(refund, order, attempts);
    }

    @Transactional
    public RefundRequestResponse approveRefundRequest(Long refundRequestId, ReviewRefundRequest request) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.STORE_MANAGER && actor.role() != Role.ADMIN) {
            LOG.warn("event=refund_approve_forbidden actorRole={} actorId={}", actor.role(), actor.userId());
            throw new ApiException(ErrorCode.FORBIDDEN);
        }

        RefundRequest refund = refundRequestRepository.findById(refundRequestId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        if (!"PENDING".equalsIgnoreCase(refund.getStatus())) {
            LOG.warn("event=refund_invalid_state refundId={} status={}", refund.getId(), refund.getStatus());
            throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        }

        Order order = orderRepository.findById(refund.getOrderId())
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        if (actor.role() == Role.STORE_MANAGER) {
            accessGuard.requireStore(order.getStoreId());
        }

        // Atomically reserve funds in Payment Service to prevent over-refunding
        paymentClient.reserveRefund(refund.getId(), order.getId(), order.getOrderCode(), refund.getAmount());

        refund.setStatus("APPROVED");
        refund.setReviewedBy(actor.userId());
        refund.setReviewedAt(Instant.now());
        refund.setReviewNote(request != null ? request.effectiveReason() : null);
        refund.setUpdatedAt(Instant.now());
        refund = refundRequestRepository.save(refund);

        LOG.info("event=refund_approved refundId={} orderId={} byRole={} byUserId={}",
                refund.getId(), refund.getOrderId(), actor.role(), actor.userId());

        orderEventPublisher.publishRefundEvent("refund.approved", refund, order, refund.getReviewNote());

        List<RefundAttempt> attempts = refundAttemptRepository.findByRefundRequestIdOrderByAttemptNumberAsc(refund.getId());
        return DomainMapper.toResponse(refund, order, attempts);
    }

    @Transactional
    public RefundRequestResponse rejectRefundRequest(Long refundRequestId, ReviewRefundRequest request) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.STORE_MANAGER && actor.role() != Role.ADMIN) {
            LOG.warn("event=refund_reject_forbidden actorRole={} actorId={}", actor.role(), actor.userId());
            throw new ApiException(ErrorCode.FORBIDDEN);
        }

        // Spec D1: Reject requires mandatory business reason
        String reason = request != null ? request.effectiveReason() : null;
        if (reason == null || reason.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }

        RefundRequest refund = refundRequestRepository.findById(refundRequestId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        if (!"PENDING".equalsIgnoreCase(refund.getStatus())) {
            LOG.warn("event=refund_invalid_state refundId={} status={}", refund.getId(), refund.getStatus());
            throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        }

        Order order = orderRepository.findById(refund.getOrderId())
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        if (actor.role() == Role.STORE_MANAGER) {
            accessGuard.requireStore(order.getStoreId());
        }

        // Release any held reservation in Payment Service
        paymentClient.releaseRefund(refund.getId());

        refund.setStatus("REJECTED");
        refund.setReviewedBy(actor.userId());
        refund.setReviewedAt(Instant.now());
        refund.setReviewNote(reason.trim());
        refund.setUpdatedAt(Instant.now());
        refund = refundRequestRepository.save(refund);

        LOG.info("event=refund_rejected refundId={} orderId={} byRole={} reason={}",
                refund.getId(), refund.getOrderId(), actor.role(), reason);

        orderEventPublisher.publishRefundEvent("refund.rejected", refund, order, reason.trim());

        List<RefundAttempt> attempts = refundAttemptRepository.findByRefundRequestIdOrderByAttemptNumberAsc(refund.getId());
        return DomainMapper.toResponse(refund, order, attempts);
    }

    @Transactional
    public RefundRequestResponse claimProcessing(Long refundRequestId) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.STORE_MANAGER && actor.role() != Role.ADMIN) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }

        RefundRequest refund = refundRequestRepository.findById(refundRequestId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        if (!"APPROVED".equalsIgnoreCase(refund.getStatus())) {
            throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        }

        Order order = orderRepository.findById(refund.getOrderId())
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        if (actor.role() == Role.STORE_MANAGER) {
            accessGuard.requireStore(order.getStoreId());
        }

        if (refund.getBankAccountNo() == null || refund.getBankAccountNo().isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }

        int nextAttemptNumber = refund.getAttemptCount() + 1;
        String attemptId = UUID.randomUUID().toString();

        Map<String, Object> snapshotMap = new HashMap<>();
        snapshotMap.put("bankName", refund.getBankName());
        snapshotMap.put("bankAccountNo", refund.getBankAccountNo());
        snapshotMap.put("bankAccountName", refund.getBankAccountName());
        snapshotMap.put("amount", refund.getAmount());
        snapshotMap.put("attemptNumber", nextAttemptNumber);
        snapshotMap.put("claimedAt", Instant.now().toString());

        String snapshotJson;
        try {
            snapshotJson = objectMapper.writeValueAsString(snapshotMap);
        } catch (Exception ex) {
            snapshotJson = "{}";
        }

        RefundAttempt attempt = new RefundAttempt();
        attempt.setRefundRequestId(refund.getId());
        attempt.setAttemptNumber(nextAttemptNumber);
        attempt.setAttemptId(attemptId);
        attempt.setBankName(refund.getBankName());
        attempt.setBankAccountNo(refund.getBankAccountNo());
        attempt.setBankAccountName(refund.getBankAccountName());
        attempt.setAmount(refund.getAmount());
        attempt.setStatus("PROCESSING");
        attempt.setCreatedAt(Instant.now());
        attempt.setUpdatedAt(Instant.now());
        attempt.setCreatedBy(actor.userId());
        refundAttemptRepository.save(attempt);

        refund.setStatus("PROCESSING");
        refund.setAttemptCount(nextAttemptNumber);
        refund.setCurrentAttemptId(attemptId);
        refund.setCurrentAttemptBankSnapshot(snapshotJson);
        refund.setUpdatedAt(Instant.now());
        refund = refundRequestRepository.save(refund);

        LOG.info("event=refund_processing_claimed refundId={} attemptId={} attemptNumber={}",
                refund.getId(), attemptId, nextAttemptNumber);

        List<RefundAttempt> attempts = refundAttemptRepository.findByRefundRequestIdOrderByAttemptNumberAsc(refund.getId());
        return DomainMapper.toResponse(refund, order, attempts);
    }

    @Transactional
    public RefundRequestResponse requestBankDetails(Long refundRequestId, BankDetailsInvalidRequest request) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.STORE_MANAGER && actor.role() != Role.ADMIN) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }

        if (request == null || request.reason() == null || request.reason().isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }

        RefundRequest refund = refundRequestRepository.findById(refundRequestId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        if (refund.getStatus() == null || !Set.of("APPROVED", "PROCESSING").contains(refund.getStatus().toUpperCase())) {
            throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        }

        Order order = orderRepository.findById(refund.getOrderId())
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        if (actor.role() == Role.STORE_MANAGER) {
            accessGuard.requireStore(order.getStoreId());
        }

        // If an attempt was in progress, stop it cleanly
        if ("PROCESSING".equalsIgnoreCase(refund.getStatus()) && refund.getCurrentAttemptId() != null) {
            refundAttemptRepository.findByAttemptId(refund.getCurrentAttemptId()).ifPresent(att -> {
                att.setStatus("FAILED_BANK_DETAILS");
                att.setFailureReason(request.reason().trim());
                att.setUpdatedAt(Instant.now());
                refundAttemptRepository.save(att);
            });
        }

        refund.setStatus("WAITING_BANK_DETAILS");
        refund.setReviewNote(request.reason().trim());
        refund.setUpdatedAt(Instant.now());
        refund = refundRequestRepository.save(refund);

        LOG.info("event=refund_waiting_bank_details refundId={} reason={}", refund.getId(), request.reason());

        orderEventPublisher.publishRefundEvent("refund.waiting-bank-details", refund, order, request.reason().trim());

        List<RefundAttempt> attempts = refundAttemptRepository.findByRefundRequestIdOrderByAttemptNumberAsc(refund.getId());
        return DomainMapper.toResponse(refund, order, attempts);
    }

    @Transactional
    public RefundRequestResponse updateBankDetails(Long refundRequestId, UpdateBankDetailsRequest request) {
        if (request == null || request.bankName() == null || request.bankName().isBlank()
                || request.bankAccountNo() == null || request.bankAccountNo().isBlank()
                || request.bankAccountName() == null || request.bankAccountName().isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }

        RefundRequest refund = refundRequestRepository.findById(refundRequestId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        Order order = orderRepository.findById(refund.getOrderId())
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        CurrentActor actor = CurrentActor.require();
        if (actor.role() == Role.STAFF) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }

        if (order.getCustomerId() != null) {
            if (actor.role() == Role.CUSTOMER) {
                accessGuard.requireOwner(order.getCustomerId());
            } else if (actor.role() == Role.STORE_MANAGER) {
                accessGuard.requireStore(order.getStoreId());
            }
        } else {
            // Counter order: manager of store or admin
            if (actor.role() != Role.STORE_MANAGER && actor.role() != Role.ADMIN) {
                throw new ApiException(ErrorCode.FORBIDDEN);
            }
            if (actor.role() == Role.STORE_MANAGER) {
                accessGuard.requireStore(order.getStoreId());
            }
        }

        // Only allowed in WAITING_BANK_DETAILS
        if (!"WAITING_BANK_DETAILS".equalsIgnoreCase(refund.getStatus())) {
            LOG.warn("event=refund_update_bank_details_invalid_state refundId={} status={}", refund.getId(), refund.getStatus());
            throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        }

        refund.setBankName(request.bankName().trim());
        refund.setBankAccountNo(request.bankAccountNo().trim());
        refund.setBankAccountName(request.bankAccountName().trim());
        refund.setBankDetailsVersion(refund.getBankDetailsVersion() + 1);
        refund.setStatus("APPROVED"); // Return to APPROVED for new attempt
        refund.setUpdatedAt(Instant.now());
        refund = refundRequestRepository.save(refund);

        LOG.info("event=refund_bank_details_updated refundId={} newVersion={}", refund.getId(), refund.getBankDetailsVersion());

        List<RefundAttempt> attempts = refundAttemptRepository.findByRefundRequestIdOrderByAttemptNumberAsc(refund.getId());
        return DomainMapper.toResponse(refund, order, attempts);
    }

    @Transactional
    public RefundRequestResponse uploadEvidence(Long refundRequestId, MultipartFile file) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.STORE_MANAGER && actor.role() != Role.ADMIN) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }

        RefundRequest refund = refundRequestRepository.findById(refundRequestId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        if (!"PROCESSING".equalsIgnoreCase(refund.getStatus())) {
            throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        }

        Order order = orderRepository.findById(refund.getOrderId())
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        if (actor.role() == Role.STORE_MANAGER) {
            accessGuard.requireStore(order.getStoreId());
        }

        RefundEvidenceService.UploadResult uploadResult = refundEvidenceService.uploadEvidence(
                order.getStoreId(), refund.getId(), refund.getCurrentAttemptId(), file);

        refund.setEvidencePublicId(uploadResult.publicId());
        refund.setEvidenceUrl(uploadResult.secureUrl());
        refund.setEvidenceRegisteredAt(Instant.now());
        refund.setEvidenceRegisteredBy(actor.userId());
        refund.setUpdatedAt(Instant.now());
        refund = refundRequestRepository.save(refund);

        if (refund.getCurrentAttemptId() != null) {
            refundAttemptRepository.findByAttemptId(refund.getCurrentAttemptId()).ifPresent(att -> {
                att.setEvidencePublicId(uploadResult.publicId());
                att.setEvidenceUrl(uploadResult.secureUrl());
                att.setUpdatedAt(Instant.now());
                refundAttemptRepository.save(att);
            });
        }

        LOG.info("event=refund_evidence_registered refundId={} publicId={}", refund.getId(), uploadResult.publicId());

        List<RefundAttempt> attempts = refundAttemptRepository.findByRefundRequestIdOrderByAttemptNumberAsc(refund.getId());
        return DomainMapper.toResponse(refund, order, attempts);
    }

    @Transactional(readOnly = true)
    public EvidenceAccessResponse getEvidenceAccess(Long refundRequestId) {
        RefundRequest refund = refundRequestRepository.findById(refundRequestId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        Order order = orderRepository.findById(refund.getOrderId())
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        CurrentActor actor = CurrentActor.require();
        if (actor.role() == Role.CUSTOMER) {
            accessGuard.requireOwner(order.getCustomerId());
        } else if (actor.role() == Role.STORE_MANAGER) {
            accessGuard.requireStore(order.getStoreId());
        } else if (actor.role() != Role.ADMIN) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }

        if (refund.getEvidencePublicId() == null || refund.getEvidencePublicId().isBlank()) {
            throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND);
        }

        String signedUrl = refundEvidenceService.generatePrivateDeliveryUrl(refund.getEvidencePublicId());
        return new EvidenceAccessResponse(signedUrl, 600L);
    }

    @Transactional
    public RefundRequestResponse confirmRefund(Long refundRequestId) {
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.STORE_MANAGER && actor.role() != Role.ADMIN) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }

        RefundRequest refund = refundRequestRepository.findById(refundRequestId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        if (!"PROCESSING".equalsIgnoreCase(refund.getStatus())) {
            throw new ApiException(ErrorCode.INVALID_REFUND_STATE);
        }

        if (refund.getEvidencePublicId() == null || refund.getEvidencePublicId().isBlank()) {
            throw new ApiException(ErrorCode.EVIDENCE_REQUIRED);
        }

        Order order = orderRepository.findById(refund.getOrderId())
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        if (actor.role() == Role.STORE_MANAGER) {
            accessGuard.requireStore(order.getStoreId());
        }

        // Confirm reservation in Payment Service
        paymentClient.confirmRefund(refund.getId());

        // Update attempt to REFUNDED
        if (refund.getCurrentAttemptId() != null) {
            refundAttemptRepository.findByAttemptId(refund.getCurrentAttemptId()).ifPresent(att -> {
                att.setStatus("REFUNDED");
                att.setUpdatedAt(Instant.now());
                refundAttemptRepository.save(att);
            });
        }

        refund.setStatus("REFUNDED");
        refund.setConfirmedAt(Instant.now());
        refund.setConfirmedBy(actor.userId());
        refund.setUpdatedAt(Instant.now());
        refund = refundRequestRepository.save(refund);

        // Update Order paymentStatus to REFUNDED
        order.setPaymentStatus("REFUNDED");
        orderRepository.save(order);

        LOG.info("event=refund_confirmed refundId={} orderId={} amount={}",
                refund.getId(), order.getId(), refund.getAmount());

        orderEventPublisher.publishRefundEvent("refund.confirmed", refund, order, null);

        List<RefundAttempt> attempts = refundAttemptRepository.findByRefundRequestIdOrderByAttemptNumberAsc(refund.getId());
        return DomainMapper.toResponse(refund, order, attempts);
    }
}
