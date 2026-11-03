package com.clucky.cartorderservice.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record RefundRequestResponse(
        Long id,
        Long orderId,
        Long customerId,
        BigDecimal amount,
        String reason,
        String status,
        Long reviewedBy,
        Instant reviewedAt
) {}
