package com.clucky.reviewreportservice.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DailyStoreStatsResponse(
        Long id,
        Long storeId,
        LocalDate statDate,
        Integer orderCount,
        BigDecimal revenue,
        BigDecimal codAmount,
        BigDecimal transferAmount
) {}
