package com.clucky.promotionloyaltyservice.config;

import com.clucky.promotionloyaltyservice.dto.Role;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.data.redis.core.StringRedisTemplate;

public final class AccessTokenValidator implements OAuth2TokenValidator<Jwt> {
    private final String audience;
    private final StringRedisTemplate redis;

    public AccessTokenValidator(String audience, StringRedisTemplate redis) {
        this.audience = audience;
        this.redis = redis;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
        try {
            // A refresh-purpose JWT must never authenticate a protected resource as a Bearer token.
            if ("refresh".equalsIgnoreCase(token.getClaimAsString("typ"))) {
                return invalid();
            }
            Role role = Role.valueOf(token.getClaimAsString("role"));
            Object store = token.getClaim("storeId");
            boolean needsStore = role == Role.STAFF || role == Role.STORE_MANAGER;
            if (Long.parseLong(token.getSubject()) <= 0 || token.getExpiresAt() == null
                    || token.getAudience() == null || !token.getAudience().contains(audience)
                    || (needsStore && store == null)
                    || (store != null && Long.parseLong(store.toString()) <= 0)) {
                return invalid();
            }
            String sid = token.getClaimAsString("sid");
            if (sid == null || sid.isBlank() || token.getIssuedAt() == null
                    || Boolean.TRUE.equals(redis.hasKey("auth:revoked:sid:" + sid))) {
                return invalid();
            }
            String revokedAt = redis.opsForValue().get("auth:revoked:user:" + token.getSubject());
            if (revokedAt != null && token.getIssuedAt().toEpochMilli() <= Long.parseLong(revokedAt)) {
                return invalid();
            }
            return OAuth2TokenValidatorResult.success();
        } catch (RuntimeException failure) {
            return invalid();
        }
    }

    private OAuth2TokenValidatorResult invalid() {
        return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Invalid access token", null));
    }
}
