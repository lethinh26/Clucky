package com.clucky.reviewreportservice.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record DailyStoreStatsResponse(
        Long id,
        Long storeId,
        LocalDate statDate,
        Integer orderCount,
        BigDecimal revenue,
        BigDecimal codAmount,
        BigDecimal transferAmount,
        BigDecimal reconciledTransferAmount,
        BigDecimal pendingReconciliationAmount,
        BigDecimal excessAmount,
        BigDecimal expiredReceiptAmount,
        Instant updatedAt
) {
    public DailyStoreStatsResponse(
            Long id,
            Long storeId,
            LocalDate statDate,
            Integer orderCount,
            BigDecimal revenue,
            BigDecimal codAmount,
            BigDecimal transferAmount
    ) {
        this(
                id,
                storeId,
                statDate,
                orderCount,
                revenue,
                codAmount,
                transferAmount,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                null
        );
    }
}
