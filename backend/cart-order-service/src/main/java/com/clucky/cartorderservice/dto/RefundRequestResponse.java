package com.clucky.cartorderservice.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record RefundRequestResponse(
        Long id,
        Long orderId,
        String orderCode,
        Long storeId,
        Long customerId,
        BigDecimal amount,
        String reason,
        String status,
        Long reviewedBy,
        Instant reviewedAt,
        String reviewNote,
        String bankName,
        String bankBin,
        String bankAccountNo,
        String bankAccountName,
        Integer bankDetailsVersion,
        Integer attemptCount,
        String currentAttemptId,
        String evidencePublicId,
        Instant confirmedAt,
        Long confirmedBy,
        Instant createdAt,
        Instant updatedAt,
        List<RefundAttemptResponse> attempts,
        String paymentOperation,
        String paymentError
) {
    public RefundRequestResponse(
            Long id,
            Long orderId,
            Long customerId,
            BigDecimal amount,
            String reason,
            String status,
            Long reviewedBy,
            Instant reviewedAt
    ) {
        this(id, orderId, null, null, customerId, amount, reason, status, reviewedBy, reviewedAt,
                null, null, null, null, null, 1, 0, null, null, null, null, null, null, List.of(), null, null);
    }
}
