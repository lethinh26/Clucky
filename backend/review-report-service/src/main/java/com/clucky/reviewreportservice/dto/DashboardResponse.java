package com.clucky.reviewreportservice.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record DashboardResponse(
    String scope,
    Long storeId,
    LocalDate from,
    LocalDate to,
    BigDecimal todayRevenue,
    Integer todayOrderCount,
    BigDecimal todayCodAmount,
    BigDecimal todayTransferAmount,
    BigDecimal periodRevenue,
    Integer periodOrderCount,
    BigDecimal todayReconciledTransferAmount,
    BigDecimal todayPendingReconciliationAmount,
    BigDecimal todayExcessAmount,
    BigDecimal todayExpiredReceiptAmount,
    BigDecimal periodCodAmount,
    BigDecimal periodTransferAmount,
    BigDecimal periodReconciledTransferAmount,
    BigDecimal periodPendingReconciliationAmount,
    BigDecimal periodExcessAmount,
    BigDecimal periodExpiredReceiptAmount,
    boolean projectionActive,
    String revenueEventPolicy,
    Instant lastUpdatedAt,
    OffsetDateTime generatedAt
) {
    public DashboardResponse(
            String scope,
            Long storeId,
            LocalDate from,
            LocalDate to,
            BigDecimal todayRevenue,
            Integer todayOrderCount,
            BigDecimal todayCodAmount,
            BigDecimal todayTransferAmount,
            BigDecimal periodRevenue,
            Integer periodOrderCount,
            OffsetDateTime generatedAt
    ) {
        this(
                scope,
                storeId,
                from,
                to,
                todayRevenue,
                todayOrderCount,
                todayCodAmount,
                todayTransferAmount,
                periodRevenue,
                periodOrderCount,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                false,
                "false",
                null,
                generatedAt
        );
    }
}
