package com.clucky.cartorderservice.mapper;

import com.clucky.cartorderservice.dto.*;
import com.clucky.cartorderservice.entity.*;

import java.util.List;

public final class DomainMapper {
    private DomainMapper() {}

    public static OrderResponse toResponse(Order entity) {
        return toResponse(entity, List.of(), List.of());
    }

    public static OrderResponse toResponse(Order entity, List<OrderItem> items) {
        return toResponse(entity, items, List.of());
    }

    public static OrderResponse toResponse(Order entity, List<OrderItem> items, List<OrderStatusHistory> history) {
        List<OrderItemResponse> itemResponses = items == null ? List.of() :
                items.stream().map(DomainMapper::toResponse).toList();
        List<OrderStatusHistoryResponse> historyResponses = history == null ? List.of() :
                history.stream().map(DomainMapper::toResponse).toList();
        return new OrderResponse(
                entity.getId(),
                entity.getOrderCode(),
                entity.getCustomerId(),
                entity.getStoreId(),
                entity.getType(),
                entity.getStatus(),
                entity.getSubtotal(),
                entity.getDiscountAmount(),
                entity.getPointsUsed(),
                entity.getPointsAmount(),
                entity.getShippingFee(),
                entity.getTotalAmount(),
                entity.getVoucherCode(),
                entity.getReceiverName(),
                entity.getReceiverPhone(),
                entity.getDeliveryAddress(),
                entity.getNote(),
                entity.getScheduledAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getPaymentMethod(),
                itemResponses,
                historyResponses,
                entity.getPaymentStatus()
        );
    }

    public static OrderItemResponse toResponse(OrderItem entity) {
        return new OrderItemResponse(
                entity.getId(),
                entity.getOrderId(),
                entity.getItemType(),
                entity.getProductId(),
                entity.getComboId(),
                entity.getItemName(),
                entity.getUnitPrice(),
                entity.getQuantity(),
                entity.getOptionsSnapshot(),
                entity.getToppingsSnapshot(),
                entity.getNote(),
                entity.getLineTotal()
        );
    }

    public static OrderStatusHistoryResponse toResponse(OrderStatusHistory entity) {
        return new OrderStatusHistoryResponse(
                entity.getId(),
                entity.getOrderId(),
                entity.getFromStatus(),
                entity.getToStatus(),
                entity.getChangedBy(),
                entity.getChangedRole(),
                entity.getReason(),
                entity.getCreatedAt()
        );
    }

    public static RefundRequestResponse toResponse(RefundRequest entity) {
        return toResponse(entity, null, java.util.List.of());
    }

    public static RefundRequestResponse toResponse(RefundRequest entity, Order order, java.util.List<com.clucky.cartorderservice.entity.RefundAttempt> attempts) {
        java.util.List<com.clucky.cartorderservice.dto.RefundAttemptResponse> attemptResponses = attempts != null
                ? attempts.stream().map(DomainMapper::toAttemptResponse).toList()
                : java.util.List.of();
        return new RefundRequestResponse(
                entity.getId(),
                entity.getOrderId(),
                order != null ? order.getOrderCode() : null,
                order != null ? order.getStoreId() : null,
                entity.getCustomerId(),
                entity.getAmount(),
                entity.getReason(),
                entity.getStatus(),
                entity.getReviewedBy(),
                entity.getReviewedAt(),
                entity.getReviewNote(),
                entity.getBankName(),
                entity.getBankAccountNo(),
                entity.getBankAccountName(),
                entity.getBankDetailsVersion(),
                entity.getAttemptCount(),
                entity.getCurrentAttemptId(),
                entity.getEvidencePublicId(),
                entity.getConfirmedAt(),
                entity.getConfirmedBy(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                attemptResponses,
                entity.getPaymentOperation(),
                entity.getPaymentError()
        );
    }

    public static com.clucky.cartorderservice.dto.RefundAttemptResponse toAttemptResponse(com.clucky.cartorderservice.entity.RefundAttempt attempt) {
        return new com.clucky.cartorderservice.dto.RefundAttemptResponse(
                attempt.getId(),
                attempt.getRefundRequestId(),
                attempt.getAttemptNumber(),
                attempt.getAttemptId(),
                attempt.getBankName(),
                attempt.getBankAccountNo(),
                attempt.getBankAccountName(),
                attempt.getAmount(),
                attempt.getStatus(),
                attempt.getFailureReason(),
                attempt.getEvidencePublicId(),
                attempt.getCreatedAt(),
                attempt.getUpdatedAt(),
                attempt.getCreatedBy()
        );
    }

    public static PartyOrderResponse toResponse(PartyOrder entity) {
        return new PartyOrderResponse(
                entity.getId(),
                entity.getCustomerId(),
                entity.getStoreId(),
                entity.getContactName(),
                entity.getPhone(),
                entity.getExpectedDate(),
                entity.getGuestCount(),
                entity.getContent(),
                entity.getStatus()
        );
    }
}
