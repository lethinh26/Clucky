package com.clucky.reviewreportservice.dto;

import com.clucky.reviewreportservice.entity.ReviewStatus;

import java.time.OffsetDateTime;
import java.util.List;

public record ReviewDto(
    Long id,
    Long customerId,
    Long productId,
    Long orderId,
    Long storeId,
    Integer rating,
    String comment,
    ReviewStatus status,
    Long version,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    OffsetDateTime deletedAt,
    List<ReviewReplyDto> replies
) {
    public ReviewDto(
        Long id,
        Long customerId,
        Long productId,
        Long orderId,
        Integer rating,
        String comment,
        ReviewStatus status,
        OffsetDateTime createdAt,
        List<ReviewReplyDto> replies
    ) {
        this(id, customerId, productId, orderId, null, rating, comment, status, 0L, createdAt, null, null, replies);
    }
}
