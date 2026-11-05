package com.clucky.promotionloyaltyservice.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record UpdateLoyaltyConfigRequest(
        @NotNull @DecimalMin(value = "0.0001") BigDecimal earnRate,
        @NotNull @DecimalMin(value = "0.0001") BigDecimal redeemRate
) {}

