package com.clucky.identityservice.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record VerifyOtpRequest(
        @Email(message = "Invalid email format")
        @Size(max = 255, message = "Email cannot exceed 255 characters")
        String email,

        @NotBlank(message = "OTP is required")
        @Pattern(regexp = "^[0-9]{4,10}$", message = "Invalid OTP format")
        String otp,
        String phone,
        String challengeId
) {
    public VerifyOtpRequest(String email, String otp) { this(email, otp, null, null); }
}

