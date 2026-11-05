package com.clucky.promotionloyaltyservice.dto;

import java.time.Instant;

public record PointTransactionResponse(
        Long id,
        Long customerId,
        Long orderId,
        Integer change,
        Integer balanceAfter,
        String type,
        Instant createdAt,
        String reason
) {
    public PointTransactionResponse(Long id, Long customerId, Long orderId, Integer change, Integer balanceAfter, String type, Instant createdAt) {
        this(id, customerId, orderId, change, balanceAfter, type, createdAt, null);
    }
}
