package com.clucky.shippingservice.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record ShipmentResponse(
        Long id,
        Long orderId,
        Long storeId,
        Long shipperId,
        String customerName,
        String phone,
        String address,
        BigDecimal fee,
        BigDecimal distanceKm,
        String status,
        BigDecimal codAmount,
        Instant createdAt,
        Instant updatedAt
) {}
