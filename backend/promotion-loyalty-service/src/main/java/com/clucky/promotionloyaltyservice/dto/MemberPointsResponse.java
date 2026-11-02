package com.clucky.promotionloyaltyservice.dto;

import java.time.Instant;

public record MemberPointsResponse(
        Long id,
        Long customerId,
        Integer totalPoints,
        String tier,
        Instant updatedAt
) {}
