package com.clucky.promotionloyaltyservice.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record EarnPointsRequest(
        @NotNull Long customerId,
        Long orderId,
        BigDecimal orderAmount,
        Integer points,
        String operationKey,
        String reason
) {}

