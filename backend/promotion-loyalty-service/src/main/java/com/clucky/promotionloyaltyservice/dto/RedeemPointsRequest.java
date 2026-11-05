package com.clucky.promotionloyaltyservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record RedeemPointsRequest(
        @NotNull @Positive Long customerId,
        @NotNull @Min(1) Integer points,
        @NotNull @Positive Long orderId,
        @Size(max = 64) String operationKey,
        @Size(max = 255) String reason
) {}

