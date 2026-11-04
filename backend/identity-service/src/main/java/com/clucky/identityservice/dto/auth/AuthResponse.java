package com.clucky.identityservice.dto.auth;

import com.clucky.identityservice.dto.Role;

public record AuthResponse(
        String accessToken,
        Role role,
        Long storeId,
        String email,
        String fullName
) {}

