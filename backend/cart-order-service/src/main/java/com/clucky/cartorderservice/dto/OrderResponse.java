package com.clucky.cartorderservice.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderResponse(
        Long id,
        String orderCode,
        Long customerId,
        Long storeId,
        String type,
        String status,
        BigDecimal subtotal,
        BigDecimal discountAmount,
        Integer pointsUsed,
        BigDecimal pointsAmount,
        BigDecimal shippingFee,
        BigDecimal totalAmount,
        String voucherCode,
        String receiverName,
        String receiverPhone,
        String deliveryAddress,
        String note,
        Instant scheduledAt,
        Instant createdAt,
        Instant updatedAt,
        String paymentMethod,
        List<OrderItemResponse> items,
        List<OrderStatusHistoryResponse> timeline,
        String paymentStatus,
        String orderSource,
        String diningOption,
        Integer queueNumber,
        Long version
) {
    public OrderResponse(
            Long id,
            String orderCode,
            Long customerId,
            Long storeId,
            String type,
            String status,
            BigDecimal subtotal,
            BigDecimal discountAmount,
            Integer pointsUsed,
            BigDecimal pointsAmount,
            BigDecimal shippingFee,
            BigDecimal totalAmount,
            String voucherCode,
            String receiverName,
            String receiverPhone,
            String deliveryAddress,
            String note,
            Instant scheduledAt,
            Instant createdAt,
            Instant updatedAt,
            String paymentMethod,
            List<OrderItemResponse> items,
            List<OrderStatusHistoryResponse> timeline,
            String paymentStatus,
            String orderSource,
            String diningOption,
            Integer queueNumber
    ) {
        this(id, orderCode, customerId, storeId, type, status, subtotal, discountAmount,
                pointsUsed, pointsAmount, shippingFee, totalAmount, voucherCode, receiverName,
                receiverPhone, deliveryAddress, note, scheduledAt, createdAt, updatedAt,
                paymentMethod, items, timeline, paymentStatus, orderSource, diningOption, queueNumber, 0L);
    }

    public OrderResponse(
            Long id,
            String orderCode,
            Long customerId,
            Long storeId,
            String type,
            String status,
            BigDecimal subtotal,
            BigDecimal discountAmount,
            Integer pointsUsed,
            BigDecimal pointsAmount,
            BigDecimal shippingFee,
            BigDecimal totalAmount,
            String voucherCode,
            String receiverName,
            String receiverPhone,
            String deliveryAddress,
            String note,
            Instant scheduledAt,
            Instant createdAt,
            Instant updatedAt,
            String paymentMethod,
            List<OrderItemResponse> items,
            List<OrderStatusHistoryResponse> timeline,
            String paymentStatus
    ) {
        this(id, orderCode, customerId, storeId, type, status, subtotal, discountAmount,
                pointsUsed, pointsAmount, shippingFee, totalAmount, voucherCode, receiverName,
                receiverPhone, deliveryAddress, note, scheduledAt, createdAt, updatedAt,
                paymentMethod, items, timeline, paymentStatus, "WEB", "TAKE_AWAY", null, 0L);
    }

    public OrderResponse(
            Long id,
            String orderCode,
            Long customerId,
            Long storeId,
            String type,
            String status,
            BigDecimal subtotal,
            BigDecimal discountAmount,
            Integer pointsUsed,
            BigDecimal pointsAmount,
            BigDecimal shippingFee,
            BigDecimal totalAmount,
            String voucherCode,
            String receiverName,
            String receiverPhone,
            String deliveryAddress,
            String note,
            Instant scheduledAt,
            Instant createdAt,
            Instant updatedAt,
            String paymentMethod
    ) {
        this(id, orderCode, customerId, storeId, type, status, subtotal, discountAmount,
                pointsUsed, pointsAmount, shippingFee, totalAmount, voucherCode, receiverName,
                receiverPhone, deliveryAddress, note, scheduledAt, createdAt, updatedAt,
                paymentMethod, List.of(), List.of(), "PENDING", "WEB", "TAKE_AWAY", null, 0L);
    }

    public OrderResponse(
            Long id,
            String orderCode,
            Long customerId,
            Long storeId,
            String type,
            String status,
            BigDecimal subtotal,
            BigDecimal discountAmount,
            Integer pointsUsed,
            BigDecimal pointsAmount,
            BigDecimal shippingFee,
            BigDecimal totalAmount,
            String voucherCode,
            String receiverName,
            String receiverPhone,
            String deliveryAddress,
            String note,
            Instant scheduledAt,
            Instant createdAt,
            Instant updatedAt
    ) {
        this(id, orderCode, customerId, storeId, type, status, subtotal, discountAmount,
                pointsUsed, pointsAmount, shippingFee, totalAmount, voucherCode, receiverName,
                receiverPhone, deliveryAddress, note, scheduledAt, createdAt, updatedAt,
                "COD", List.of(), List.of(), "PENDING", "WEB", "TAKE_AWAY", null, 0L);
    }
}
