package com.clucky.promotionloyaltyservice.dto;

import java.time.Instant;

public record VoucherUsageResponse(
        Long id,
        Long voucherId,
        Long customerId,
        Long orderId,
        Instant usedAt
) {}
