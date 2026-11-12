package com.clucky.promotionloyaltyservice.dto;

public record BannerUploadResult(
        String secureUrl,
        String publicId,
        String format,
        long sizeBytes,
        int width,
        int height
) {}
