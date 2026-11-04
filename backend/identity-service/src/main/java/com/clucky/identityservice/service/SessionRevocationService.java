package com.clucky.identityservice.service;

import com.clucky.identityservice.config.RedisConfig;
import com.clucky.identityservice.logging.SafeLog;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

@Service
public class SessionRevocationService {
    private static final Logger LOG = LoggerFactory.getLogger(SessionRevocationService.class);

    private final StringRedisTemplate redisTemplate;

    public SessionRevocationService(@Autowired(required = false) StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void revokeSession(String sid, Duration ttl) {
        if (sid == null || sid.isBlank() || redisTemplate == null) {
            return;
        }
        try {
            String key = RedisConfig.key("auth:revoked:sid", sid);
            redisTemplate.opsForValue().set(key, "revoked", ttl);
        } catch (Exception e) {
            LOG.warn("Failed to write revoked session to Redis: {}", SafeLog.trace(e));
        }
    }

    public boolean isSessionRevoked(String sid) {
        if (sid == null || sid.isBlank() || redisTemplate == null) {
            return false;
        }
        try {
            String key = RedisConfig.key("auth:revoked:sid", sid);
            return Boolean.TRUE.equals(redisTemplate.hasKey(key));
        } catch (Exception e) {
            LOG.warn("Failed to check revoked session in Redis: {}", SafeLog.trace(e));
            return false;
        }
    }

    public void revokeAllUserSessions(Long userId, Instant revokedAt, Duration ttl) {
        if (userId == null || userId <= 0 || redisTemplate == null) {
            return;
        }
        try {
            String key = RedisConfig.key("auth:revoked:user", String.valueOf(userId));
            long timestamp = (revokedAt != null ? revokedAt : Instant.now()).toEpochMilli();
            redisTemplate.opsForValue().set(key, String.valueOf(timestamp), ttl);
        } catch (Exception e) {
            LOG.warn("Failed to write revoked user to Redis: {}", SafeLog.trace(e));
        }
    }

    public boolean isUserRevoked(Long userId, Instant tokenIssuedAt) {
        if (userId == null || userId <= 0 || tokenIssuedAt == null || redisTemplate == null) {
            return false;
        }
        try {
            String key = RedisConfig.key("auth:revoked:user", String.valueOf(userId));
            String value = redisTemplate.opsForValue().get(key);
            if (value != null && !value.isBlank()) {
                long revokedTimestamp = Long.parseLong(value);
                return tokenIssuedAt.toEpochMilli() <= revokedTimestamp;
            }
            return false;
        } catch (Exception e) {
            LOG.warn("Failed to check revoked user in Redis: {}", SafeLog.trace(e));
            return false;
        }
    }
}

