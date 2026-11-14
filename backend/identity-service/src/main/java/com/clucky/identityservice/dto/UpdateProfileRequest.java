package com.clucky.identityservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * BE-18: allowlist for profile updates. Only fullName and phone can be changed;
 * role, storeId, status, email, emailVerified and passwordHash are server-owned.
 */
public record UpdateProfileRequest(
        @NotBlank @Size(max = 160) String fullName,
        @Size(max = 30) String phone
) {}

