package com.clucky.identityservice.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.clucky.identityservice.config.AccessTokenValidator;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.oauth2.jwt.Jwt;

class SessionRevocationServiceTest {
    private final StringRedisTemplate redis = mock(StringRedisTemplate.class, RETURNS_DEEP_STUBS);
    private final SessionRevocationService service = new SessionRevocationService(redis);

    @Test
    void writesTheSharedRevocationKeys() {
        Duration ttl = Duration.ofDays(7).plusMinutes(31);
        Instant cutoff = Instant.ofEpochMilli(100000);
        service.revokeSession("device-a", ttl);
        service.revokeAllUserSessions(7L, cutoff, ttl);
        verify(redis.opsForValue()).set("auth:revoked:sid:device-a", "revoked", ttl);
        verify(redis.opsForValue()).set("auth:revoked:user:7", "100000", ttl);
    }

    @Test
    void redisReadFailureRejectsAccessToken() {
        when(redis.hasKey("auth:revoked:sid:device-a")).thenThrow(new IllegalStateException());
        Jwt token = Jwt.withTokenValue("test-token").header("alg", "HS256").subject("7")
                .audience(List.of("clucky-api")).issuedAt(Instant.ofEpochSecond(100))
                .expiresAt(Instant.ofEpochSecond(200)).claim("role", "CUSTOMER").claim("sid", "device-a").build();
        assertTrue(new AccessTokenValidator("clucky-api", service).validate(token).hasErrors());
    }

    @Test
    void redisWriteFailureIsReported() {
        Duration ttl = Duration.ofDays(7);
        var values = redis.opsForValue();
        doThrow(new IllegalStateException()).when(values)
                .set("auth:revoked:sid:device-a", "revoked", ttl);
        assertEquals(ErrorCode.DEPENDENCY_UNAVAILABLE,
                assertThrows(ApiException.class, () -> service.revokeSession("device-a", ttl)).getCode());
    }
}
