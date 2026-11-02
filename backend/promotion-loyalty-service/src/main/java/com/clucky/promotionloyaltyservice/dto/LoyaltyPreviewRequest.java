package com.clucky.promotionloyaltyservice.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record LoyaltyPreviewRequest(@NotNull @Min(0) Integer pointsToRedeem,
        @NotNull @DecimalMin("0") @Digits(integer = 12, fraction = 0) BigDecimal orderAmount) {}
