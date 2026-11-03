package com.clucky.cartorderservice.mapper;

import com.clucky.cartorderservice.dto.*;
import com.clucky.cartorderservice.entity.*;

public final class DomainMapper {
    private DomainMapper() {}

    public static OrderResponse toResponse(Order entity) {
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
                entity.getUpdatedAt()
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
        return new RefundRequestResponse(
                entity.getId(),
                entity.getOrderId(),
                entity.getCustomerId(),
                entity.getAmount(),
                entity.getReason(),
                entity.getStatus(),
                entity.getReviewedBy(),
                entity.getReviewedAt()
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
