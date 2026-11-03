package com.clucky.cartorderservice.dto;

import java.math.BigDecimal;
import java.time.Instant;

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
        Instant updatedAt
) {}
