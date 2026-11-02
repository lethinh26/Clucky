package com.clucky.identityservice.dto;

import java.time.Instant;

public record RefreshTokenResponse(
        Long id,
        Long userId,
        Instant expiresAt,
        Boolean revoked,
        Instant createdAt
) {}
