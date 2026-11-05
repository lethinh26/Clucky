package com.clucky.promotionloyaltyservice.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record EarnPointsRequest(
        @NotNull @Positive Long customerId,
        @Positive Long orderId,
        @PositiveOrZero BigDecimal orderAmount,
        @PositiveOrZero Integer points,
        @Size(max = 64) String operationKey,
        @Size(max = 255) String reason
) {}

