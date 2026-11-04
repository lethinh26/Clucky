package com.clucky.promotionloyaltyservice.dto;

import java.time.Instant;

public record BannerResponse(
        Long id,
        String title,
        String imageUrl,
        String imagePublicId,
        String linkUrl,
        String position,
        Instant startAt,
        Instant endAt,
        Boolean isActive
) {}
