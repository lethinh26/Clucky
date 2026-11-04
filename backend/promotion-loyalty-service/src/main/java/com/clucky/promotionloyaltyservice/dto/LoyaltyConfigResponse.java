package com.clucky.promotionloyaltyservice.dto;

import java.math.BigDecimal;

public record LoyaltyConfigResponse(
        Long id,
        BigDecimal earnRate,
        BigDecimal redeemRate,
        Long updatedBy
) {}
