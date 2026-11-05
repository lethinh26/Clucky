package com.clucky.catalogstoreservice.config;

import com.clucky.catalogstoreservice.dto.Role;
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
            if ("refresh".equalsIgnoreCase(token.getClaimAsString("typ"))) {
                return invalid();
            }
            String role = token.getClaimAsString("role");
            if (!"INTERNAL_SERVICE".equals(role)) {
                Role.valueOf(role);
            }
            Object store = token.getClaim("storeId");
            boolean needsStore = "STAFF".equals(role) || "STORE_MANAGER".equals(role);
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
