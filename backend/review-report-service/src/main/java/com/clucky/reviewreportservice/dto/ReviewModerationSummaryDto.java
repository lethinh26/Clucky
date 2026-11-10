package com.clucky.reviewreportservice.dto;

public record ReviewModerationSummaryDto(
    long totalReviews,
    long visibleCount,
    double averageRating,
    long unrepliedVisibleCount,
    long hiddenCount,
    long deletedCount
) {}
