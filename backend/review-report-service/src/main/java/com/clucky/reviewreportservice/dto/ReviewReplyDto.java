package com.clucky.reviewreportservice.dto;

import java.time.OffsetDateTime;

public record ReviewReplyDto(
    Long id,
    Long responderId,
    String responderRole,
    String content,
    OffsetDateTime createdAt
) {}
