package com.clucky.identityservice.dto.auth;

import com.clucky.identityservice.dto.Role;

public record AuthResponse(
        Long userId,
        Role role,
        Long storeId,
        String email,
        String fullName
) {}

