package com.clucky.catalogstoreservice.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.oauth2.jwt.Jwt;

class AccessTokenValidatorTest {
    private final StringRedisTemplate redis = mock(StringRedisTemplate.class, RETURNS_DEEP_STUBS);
    private final AccessTokenValidator validator = new AccessTokenValidator("clucky-api", redis);
    private final Jwt token = Jwt.withTokenValue("test-token").header("alg", "HS256").subject("7")
            .audience(List.of("clucky-api")).issuedAt(Instant.ofEpochSecond(100))
            .expiresAt(Instant.ofEpochSecond(200)).claim("role", "CUSTOMER").claim("sid", "device-a").build();

    @Test
    void activeSessionIsAccepted() {
        assertFalse(validator.validate(token).hasErrors());
    }

    @Test
    void loggedOutSessionIsRejected() {
        when(redis.hasKey("auth:revoked:sid:device-a")).thenReturn(true);
        assertTrue(validator.validate(token).hasErrors());
    }

    @Test
    void passwordResetRejectsOldTokensButNotNewerTokens() {
        when(redis.opsForValue().get("auth:revoked:user:7")).thenReturn("100000");
        assertTrue(validator.validate(token).hasErrors());
        when(redis.opsForValue().get("auth:revoked:user:7")).thenReturn("99000");
        assertFalse(validator.validate(token).hasErrors());
    }

    @Test
    void redisFailureDoesNotAllowAccess() {
        when(redis.hasKey("auth:revoked:sid:device-a")).thenThrow(new IllegalStateException());
        assertTrue(validator.validate(token).hasErrors());
    }
}
