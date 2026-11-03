package com.clucky.reviewreportservice.config;

import jakarta.validation.constraints.NotBlank;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("clucky.security.jwt")
public record JwtSettings(@JsonIgnore String secret,
                          @NotBlank String issuer, @NotBlank String audience) {
    @Override
    public String toString() { return "JwtSettings[redacted]"; }
}
