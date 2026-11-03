package com.clucky.cartorderservice.dto;

import java.time.Instant;

public record OrderStatusHistoryResponse(
        Long id,
        Long orderId,
        String fromStatus,
        String toStatus,
        Long changedBy,
        String changedRole,
        String reason,
        Instant createdAt
) {}
