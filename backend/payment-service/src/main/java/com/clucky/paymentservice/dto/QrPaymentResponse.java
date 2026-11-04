package com.clucky.paymentservice.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record QrPaymentResponse(Long paymentId, String orderCode, BigDecimal amount,
        PaymentStatus status, String qrContent, Instant expiresAt) {}
