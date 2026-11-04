package com.clucky.identityservice.dto.event;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Map;

public record EmailMessage(
        @NotBlank @Size(max = 160) String messageId,
        @NotBlank @Size(max = 160) String eventId,
        @NotBlank @Pattern(regexp = "[A-Za-z0-9._-]{1,128}") String correlationId,
        @NotBlank @Email @Size(max = 255) String recipient,
        @NotBlank @Size(max = 100) String template,
        @NotNull @Size(max = 100) Map<@NotBlank @Size(max = 100) String, @NotNull @Size(max = 10000) String> variables
) {
    public EmailMessage {
        variables = variables == null ? Map.of() : Map.copyOf(variables);
    }

    @Override
    public String toString() {
        return "EmailMessage[recipient and variables redacted]";
    }
}

