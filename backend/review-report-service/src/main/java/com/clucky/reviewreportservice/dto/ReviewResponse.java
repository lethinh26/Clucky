package com.clucky.reviewreportservice.dto;

import java.time.Instant;

public record ReviewResponse(
        Long id,
        Long customerId,
        Long productId,
        Long orderId,
        Integer rating,
        String comment,
        String status,
        Instant createdAt
) {}
