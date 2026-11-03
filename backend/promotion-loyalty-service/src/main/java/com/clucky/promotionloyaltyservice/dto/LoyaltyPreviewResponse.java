package com.clucky.promotionloyaltyservice.dto;

import java.math.BigDecimal;

public record LoyaltyPreviewResponse(int availablePoints, int pointsUsed,
        BigDecimal pointsAmount, int pointsToEarn, String tier) {}
