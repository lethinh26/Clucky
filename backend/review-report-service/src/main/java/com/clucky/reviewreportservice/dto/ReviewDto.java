package com.clucky.reviewreportservice.dto;

import com.clucky.reviewreportservice.entity.ReviewStatus;

import java.time.OffsetDateTime;
import java.util.List;

public record ReviewDto(
    Long id,
    Long customerId,
    Long productId,
    Long orderId,
    Integer rating,
    String comment,
    ReviewStatus status,
    OffsetDateTime createdAt,
    List<ReviewReplyDto> replies
) {}
