package com.clucky.promotionloyaltyservice.dto;

import java.time.Instant;

public record PointTransactionResponse(
        Long id,
        Long customerId,
        Long orderId,
        Integer change,
        Integer balanceAfter,
        String type,
        Instant createdAt
) {}
