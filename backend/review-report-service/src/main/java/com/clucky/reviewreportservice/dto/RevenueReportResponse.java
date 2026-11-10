package com.clucky.reviewreportservice.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record RevenueReportResponse(
    Long storeId,
    LocalDate from,
    LocalDate to,
    BigDecimal totalRevenue,
    Integer totalOrderCount,
    BigDecimal totalCodAmount,
    BigDecimal totalTransferAmount,
    BigDecimal totalReconciledTransferAmount,
    BigDecimal totalPendingReconciliationAmount,
    BigDecimal totalExcessAmount,
    BigDecimal totalExpiredReceiptAmount,
    boolean projectionActive,
    String revenueEventPolicy,
    Instant lastUpdatedAt,
    List<DailyStoreStatsResponse> items
) {
    public RevenueReportResponse(
            Long storeId,
            LocalDate from,
            LocalDate to,
            BigDecimal totalRevenue,
            Integer totalOrderCount,
            BigDecimal totalCodAmount,
            BigDecimal totalTransferAmount,
            List<DailyStoreStatsResponse> items
    ) {
        this(
                storeId,
                from,
                to,
                totalRevenue,
                totalOrderCount,
                totalCodAmount,
                totalTransferAmount,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                false,
                "false",
                null,
                items
        );
    }
}
