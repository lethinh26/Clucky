package com.clucky.identityservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import java.time.Duration;
import java.util.List;

@ConfigurationProperties("clucky.auth")
public record AuthProperties(
        Duration accessTtl,
        Duration refreshTtl,
        Duration otpTtl,
        Cookie cookie,
        List<String> allowedOrigins
) {
    public AuthProperties {
        if (accessTtl == null) accessTtl = Duration.ofMinutes(30);
        if (refreshTtl == null) refreshTtl = Duration.ofDays(7);
        if (otpTtl == null) otpTtl = Duration.ofMinutes(5);
        if (cookie == null) cookie = new Cookie(false);
        allowedOrigins = allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
    }

    public record Cookie(boolean secure) {}
}
