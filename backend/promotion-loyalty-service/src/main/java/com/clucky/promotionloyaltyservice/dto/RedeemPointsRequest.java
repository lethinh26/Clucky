package com.clucky.promotionloyaltyservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record RedeemPointsRequest(
        @NotNull Long customerId,
        @NotNull @Min(1) Integer points,
        Long orderId,
        String operationKey,
        String reason
) {}

