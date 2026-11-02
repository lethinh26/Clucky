package com.clucky.paymentservice.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record PaymentResponse(
        Long id,
        Long orderId,
        String orderCode,
        PaymentMethod method,
        BigDecimal amount,
        PaymentStatus status,
        String qrContent,
        Instant expiresAt,
        Instant paidAt
) {}
