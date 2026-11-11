package com.clucky.cartorderservice.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record RefundAttemptResponse(
        Long id,
        Long refundRequestId,
        Integer attemptNumber,
        String attemptId,
        String bankName,
        String bankAccountNo,
        String bankAccountName,
        BigDecimal amount,
        String status,
        String failureReason,
        String evidencePublicId,
        Instant createdAt,
        Instant updatedAt,
        Long createdBy
) {}

