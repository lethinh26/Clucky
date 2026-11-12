package com.clucky.promotionloyaltyservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record BannerRequest(
        @NotBlank(message = "Banner title is required")
        @Size(max = 180, message = "Banner title must be at most 180 characters")
        String title,
        @Size(max = 1024, message = "Link URL must be at most 1024 characters")
        String linkUrl,
        @Size(max = 50, message = "Position must be at most 50 characters")
        String position,
        @Min(value = 0, message = "Display order must be non-negative")
        Integer displayOrder,
        Instant startAt,
        Instant endAt,
        Boolean isActive,
        Long expectedVersion,
        Long version,
        String imageUrl,
        String imagePublicId
) {
    public Long resolvedVersion() {
        return expectedVersion != null ? expectedVersion : version;
    }
}
