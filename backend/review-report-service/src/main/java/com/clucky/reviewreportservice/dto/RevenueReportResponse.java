package com.clucky.reviewreportservice.dto;

import java.math.BigDecimal;
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
    List<DailyStoreStatsResponse> items
) {}
