package com.clucky.identityservice.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** INT-69: request to resend the register OTP. */
public record ResendOtpRequest(
        @Email(message = "Invalid email format")
        @Size(max = 255, message = "Email cannot exceed 255 characters")
        String email,
        String phone
) {
    public ResendOtpRequest(String email) { this(email, null); }
}

