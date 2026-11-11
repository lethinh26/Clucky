package com.clucky.identityservice.dto;

public record AdminUserResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        Role role,
        Long storeId,
        String status
) {}
