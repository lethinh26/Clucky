package com.clucky.reviewreportservice.dto;

import java.math.BigDecimal;
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
    OffsetDateTime generatedAt
) {}
