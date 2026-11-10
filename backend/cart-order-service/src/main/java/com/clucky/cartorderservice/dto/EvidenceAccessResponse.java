package com.clucky.cartorderservice.dto;

public record EvidenceAccessResponse(
        String accessUrl,
        long expiresInSeconds
) {}

