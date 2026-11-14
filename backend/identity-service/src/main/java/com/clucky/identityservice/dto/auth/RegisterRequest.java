package com.clucky.identityservice.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Full name is required")
        @Size(max = 160, message = "Full name cannot exceed 160 characters")
        String fullName,

        @Email(message = "Invalid email format")
        @Size(max = 255, message = "Email cannot exceed 255 characters")
        String email,

        @NotBlank(message = "Phone is required")
        @Pattern(regexp = "^(?:0[0-9]{9}|\\+[1-9][0-9]{7,14})$", message = "Invalid phone number")
        String phone,

        @NotBlank(message = "Password is required")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,72}$",
                message = "Password must be 8-72 characters long and include at least one uppercase letter, one lowercase letter, and one number"
        )
        String password
) {
    public RegisterRequest(String fullName, String phone, String password) {
        this(fullName, null, phone, password);
    }
    @com.fasterxml.jackson.annotation.JsonAnySetter
    public void rejectUnknown(String field, Object value) { throw new IllegalArgumentException("Unsupported field"); }
}

