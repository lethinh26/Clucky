package com.clucky.identityservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * BE-18: address book create/update payload. Ownership (userId) always comes
 * from the verified JWT actor, never from the request body.
 */
public record AddressRequest(
        @NotBlank @Size(max = 160) String receiverName,
        @NotBlank @Size(max = 30) @Pattern(regexp = "^[0-9+()\\-\\s]{6,30}$", message = "Invalid phone number") String phone,
        @NotBlank @Size(max = 100) String province,
        @NotBlank @Size(max = 100) String district,
        @NotBlank @Size(max = 100) String ward,
        @NotBlank @Size(max = 255) String detail,
        boolean isDefault
) {}

