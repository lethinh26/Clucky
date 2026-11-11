package com.clucky.identityservice.dto;

import java.time.Instant;

/** Deliberate admin-customer allowlist; never substitute UserResponse here. */
public record CustomerAdminResponse(Long id, String fullName, String email, String phone,
        String avatarUrl, String status, Boolean emailVerified, Instant createdAt, Instant updatedAt) {}
