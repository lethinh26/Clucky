package com.clucky.identityservice.dto;

import com.clucky.identityservice.dto.Role;
import java.time.Instant;

public record UserResponse(
        Long id,
        String email,
        String phone,
        String fullName,
        String avatarUrl,
        String avatarPublicId,
        Role role,
        Long storeId,
        String status,
        Boolean emailVerified,
        Boolean phoneVerified,
        Instant createdAt,
        Instant updatedAt
) {}
