package com.clucky.identityservice.dto;

import java.time.Instant;

public record OtpCodeResponse(
        Long id,
        String identifier,
        String purpose,
        Instant expiresAt,
        Boolean used,
        Instant createdAt
) {}
