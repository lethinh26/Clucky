package com.clucky.identityservice.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class GoogleAuthDto {
    private GoogleAuthDto() {}

    public record SignIn(@NotBlank @Size(max = 16384) String idToken) {
        @com.fasterxml.jackson.annotation.JsonAnySetter
        public void rejectUnknown(String field, Object value) { throw new IllegalArgumentException("Unsupported field"); }
    }

    public record Complete(
            @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{43}") String pendingToken,
            @NotBlank @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,72}$") String password
    ) {
        @com.fasterxml.jackson.annotation.JsonAnySetter
        public void rejectUnknown(String field, Object value) { throw new IllegalArgumentException("Unsupported field"); }
    }

    public record Pending(String status, String pendingToken) {}
}
