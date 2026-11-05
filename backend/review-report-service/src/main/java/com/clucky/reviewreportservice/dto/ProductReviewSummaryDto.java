package com.clucky.reviewreportservice.dto;

import java.util.List;

public record ProductReviewSummaryDto(
    Long productId,
    Double averageRating,
    Long totalReviews,
    List<ReviewDto> reviews
) {}
