package com.clucky.promotionloyaltyservice.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record VoucherResponse(
        Long id,
        String code,
        String type,
        BigDecimal value,
        BigDecimal minOrderAmount,
        BigDecimal maxDiscount,
        Integer totalLimit,
        Integer usedCount,
        Instant startAt,
        Instant endAt,
        String scope,
        Long storeId,
        String status
) {}
