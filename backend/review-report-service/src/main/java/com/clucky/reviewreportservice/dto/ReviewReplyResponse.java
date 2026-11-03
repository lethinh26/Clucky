package com.clucky.reviewreportservice.dto;

import java.time.Instant;

public record ReviewReplyResponse(
        Long id,
        Long reviewId,
        Long responderId,
        String responderRole,
        String content,
        Instant createdAt
) {}
