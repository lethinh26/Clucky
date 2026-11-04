package com.clucky.notificationservice.config;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties("mail-sender")
@Validated
public record MailSenderProperties(boolean enabled, String host, int port, @Email @Size(max = 255) String username,
        @JsonIgnore String appPassword, String fromName, int timeoutMs, int maxRetries) {
    public MailSenderProperties {
        if (timeoutMs < 1 || maxRetries < 0) {
            throw new IllegalArgumentException("Invalid mail timeout/retry settings");
        }
        if (enabled && (!"smtp.gmail.com".equals(host) || port != 587 || username == null
                || username.isBlank() || appPassword == null || appPassword.isBlank()
                || fromName == null || fromName.isBlank() || fromName.contains("\r") || fromName.contains("\n"))) {
            throw new IllegalArgumentException("Enabled Gmail sender requires configured sender credentials on port 587");
        }
    }

    public boolean startTlsRequired() { return true; }

    @Override
    public String toString() { return "MailSenderProperties[credentials redacted]"; }
}
