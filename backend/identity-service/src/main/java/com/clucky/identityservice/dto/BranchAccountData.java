package com.clucky.identityservice.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.UUID;

public final class BranchAccountData {
    private BranchAccountData() {}
    public record Provision(@NotNull UUID requestKey, @NotBlank @Email @Size(max = 255) String recoveryEmail,
            @Positive long actorId, @NotBlank @Size(max = 160) String sessionId,
            @NotBlank @Pattern(regexp = "[A-Za-z0-9._-]{1,128}") String correlationId) {}
    public record Account(long id, Long storeId, String role, String login, String status, boolean activated, boolean current) {}
    public record Pair(long storeId, String readiness, String recoveryEmail, boolean verified, long version, List<Account> accounts) {}
    public record Challenge(UUID challengeId) {}
    public record RequestChallenge(@NotBlank @Size(max = 255) String login,
            @NotBlank @Pattern(regexp = "ACTIVATE|RESET") String purpose) {
        @JsonAnySetter public void rejectUnknown(String field, Object value) { throw new IllegalArgumentException("Unsupported field"); }
    }
    public record Finish(@NotNull UUID challengeId, @NotBlank @Pattern(regexp = "[0-9]{8}") String otp,
            @Pattern(regexp = "[0-9]{8}") String newEmailOtp,
            @Size(max = 72) String password) {
        @JsonAnySetter public void rejectUnknown(String field, Object value) { throw new IllegalArgumentException("Unsupported field"); }
        @Override public String toString() { return "Finish[redacted]"; }
    }
    public record Management(@NotBlank @Size(max = 72) String currentPassword,
            @NotBlank @Pattern(regexp = "RESET|RECOVERY") String purpose,
            @Email @Size(max = 255) String newEmail) {
        @Override public String toString() { return "Management[redacted]"; }
    }
}
