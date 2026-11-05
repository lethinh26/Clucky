package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.config.AccessGuard;
import com.clucky.cartorderservice.config.CurrentActor;
import com.clucky.cartorderservice.dto.CreateRefundRequest;
import com.clucky.cartorderservice.dto.PageResponse;
import com.clucky.cartorderservice.dto.RefundRequestResponse;
import com.clucky.cartorderservice.dto.Role;
import com.clucky.cartorderservice.entity.Order;
import com.clucky.cartorderservice.entity.RefundRequest;
import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import com.clucky.cartorderservice.mapper.DomainMapper;
import com.clucky.cartorderservice.repository.OrderRepository;
import com.clucky.cartorderservice.repository.RefundRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class RefundRequestService {
    private static final Logger LOG = LoggerFactory.getLogger(RefundRequestService.class);

    private final RefundRequestRepository refundRequestRepository;
    private final OrderRepository orderRepository;
    private final AccessGuard accessGuard;

    public RefundRequestService(
            RefundRequestRepository refundRequestRepository,
            OrderRepository orderRepository,
            AccessGuard accessGuard
    ) {
        this.refundRequestRepository = refundRequestRepository;
        this.orderRepository = orderRepository;
        this.accessGuard = accessGuard;
    }

    @Transactional
    public RefundRequestResponse createRefundRequest(CreateRefundRequest request) {
        if (request == null || request.orderId() == null || request.reason() == null || request.reason().isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }

        Order order = orderRepository.findById(request.orderId())
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        accessGuard.requireOwner(order.getCustomerId());

        List<RefundRequest> existing = refundRequestRepository.findAllByOrderId(order.getId());
        boolean hasActive = existing.stream().anyMatch(r ->
                "PENDING".equalsIgnoreCase(r.getStatus()) || "APPROVED".equalsIgnoreCase(r.getStatus()));
        if (hasActive) {
            LOG.warn("event=refund_request_conflict orderId={} customerId={}", order.getId(), order.getCustomerId());
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }

        RefundRequest refund = new RefundRequest();
        refund.setOrderId(order.getId());
        refund.setCustomerId(order.getCustomerId());
        refund.setAmount(order.getTotalAmount());
        refund.setReason(request.reason().trim());
        refund.setStatus("PENDING");
        refund = refundRequestRepository.save(refund);

        LOG.info("event=refund_requested refundId={} orderId={} customerId={} amount={}",
                refund.getId(), order.getId(), order.getCustomerId(), order.getTotalAmount());

        return DomainMapper.toResponse(refund);
    }

    public PageResponse<RefundRequestResponse> getRefundRequests(Long requestedStoreId, String status, Pageable pageable) {
        CurrentActor actor = CurrentActor.require();
        String cleanStatus = (status != null && !status.isBlank()) ? status.trim().toUpperCase() : null;

        Page<RefundRequest> page;
        if (actor.role() == Role.CUSTOMER) {
            page = refundRequestRepository.findByCustomerId(actor.userId(), pageable);
        } else {
            Long effectiveStoreId = accessGuard.effectiveStore(requestedStoreId);
            page = refundRequestRepository.findRefundRequests(effectiveStoreId, cleanStatus, pageable);
        }

        return PageResponse.from(page.map(DomainMapper::toResponse));
    }

    @Transactional
    public RefundRequestResponse approveRefundRequest(Long refundRequestId) {
        // Enforce P1-03: ONLY Store Manager or Admin can approve refunds
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.STORE_MANAGER && actor.role() != Role.ADMIN) {
            LOG.warn("event=refund_approve_forbidden actorRole={} actorId={}", actor.role(), actor.userId());
            throw new ApiException(ErrorCode.FORBIDDEN);
        }

        // P0.2: Find strictly by refundRequestId - no ambiguous fallback to orderId
        RefundRequest refund = refundRequestRepository.findById(refundRequestId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        if (!"PENDING".equalsIgnoreCase(refund.getStatus())) {
            LOG.warn("event=refund_already_reviewed refundId={} currentStatus={}", refund.getId(), refund.getStatus());
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }

        Order order = orderRepository.findById(refund.getOrderId())
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        // Enforce Store scope for Store Manager
        if (actor.role() == Role.STORE_MANAGER) {
            if (actor.storeId() == null || !actor.storeId().equals(order.getStoreId())) {
                LOG.warn("event=refund_store_mismatch actorStoreId={} orderStoreId={}", actor.storeId(), order.getStoreId());
                throw new ApiException(ErrorCode.FORBIDDEN);
            }
        }

        refund.setStatus("APPROVED");
        refund.setReviewedBy(actor.userId());
        refund.setReviewedAt(Instant.now());
        refund = refundRequestRepository.save(refund);

        LOG.info("event=refund_approved refundId={} orderId={} byRole={} byUserId={}",
                refund.getId(), refund.getOrderId(), actor.role(), actor.userId());
        return DomainMapper.toResponse(refund);
    }

    @Transactional
    public RefundRequestResponse rejectRefundRequest(Long refundRequestId) {
        // Enforce P1-03: ONLY Store Manager or Admin can reject refunds
        CurrentActor actor = CurrentActor.require();
        if (actor.role() != Role.STORE_MANAGER && actor.role() != Role.ADMIN) {
            LOG.warn("event=refund_reject_forbidden actorRole={} actorId={}", actor.role(), actor.userId());
            throw new ApiException(ErrorCode.FORBIDDEN);
        }

        // P0.2: Find strictly by refundRequestId - no ambiguous fallback to orderId
        RefundRequest refund = refundRequestRepository.findById(refundRequestId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        if (!"PENDING".equalsIgnoreCase(refund.getStatus())) {
            LOG.warn("event=refund_already_reviewed refundId={} currentStatus={}", refund.getId(), refund.getStatus());
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }

        Order order = orderRepository.findById(refund.getOrderId())
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));

        // Enforce Store scope for Store Manager
        if (actor.role() == Role.STORE_MANAGER) {
            if (actor.storeId() == null || !actor.storeId().equals(order.getStoreId())) {
                LOG.warn("event=refund_store_mismatch actorStoreId={} orderStoreId={}", actor.storeId(), order.getStoreId());
                throw new ApiException(ErrorCode.FORBIDDEN);
            }
        }

        refund.setStatus("REJECTED");
        refund.setReviewedBy(actor.userId());
        refund.setReviewedAt(Instant.now());
        refund = refundRequestRepository.save(refund);

        LOG.info("event=refund_rejected refundId={} orderId={} byRole={} byUserId={}",
                refund.getId(), refund.getOrderId(), actor.role(), actor.userId());
        return DomainMapper.toResponse(refund);
    }
}
