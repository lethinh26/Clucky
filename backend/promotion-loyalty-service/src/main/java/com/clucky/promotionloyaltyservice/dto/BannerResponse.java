package com.clucky.promotionloyaltyservice.dto;

import com.clucky.promotionloyaltyservice.entity.Banner;
import java.time.Instant;

public record BannerResponse(
        Long id,
        String title,
        String imageUrl,
        String imagePublicId,
        String linkUrl,
        String position,
        Integer displayOrder,
        Instant startAt,
        Instant endAt,
        Boolean isActive,
        Long version,
        String effectiveStatus,
        Instant createdAt,
        Instant updatedAt
) {
    public static BannerResponse fromEntity(Banner banner) {
        return fromEntity(banner, Instant.now());
    }

    public static BannerResponse fromEntity(Banner banner, Instant now) {
        String effectiveStatus = resolveEffectiveStatus(banner, now);
        return new BannerResponse(
                banner.getId(),
                banner.getTitle(),
                banner.getImageUrl(),
                banner.getImagePublicId(),
                banner.getLinkUrl(),
                banner.getPosition(),
                banner.getDisplayOrder(),
                banner.getStartAt(),
                banner.getEndAt(),
                banner.getIsActive(),
                banner.getVersion(),
                effectiveStatus,
                banner.getCreatedAt(),
                banner.getUpdatedAt()
        );
    }

    private static String resolveEffectiveStatus(Banner banner, Instant now) {
        if (!Boolean.TRUE.equals(banner.getIsActive())) {
            return "DISABLED";
        }
        if (banner.getStartAt() != null && now.isBefore(banner.getStartAt())) {
            return "UPCOMING";
        }
        if (banner.getEndAt() != null && now.isAfter(banner.getEndAt())) {
            return "EXPIRED";
        }
        return "ACTIVE";
    }
}
