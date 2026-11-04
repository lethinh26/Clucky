package com.clucky.apigateway.config;

import com.clucky.apigateway.dto.Role;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import reactor.core.publisher.Mono;

public final class AccessTokenValidator implements OAuth2TokenValidator<Jwt> {
    private final String audience;

    public AccessTokenValidator(String audience) { this.audience = audience; }

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
            return OAuth2TokenValidatorResult.success();
        } catch (RuntimeException failure) {
            return invalid();
        }
    }

    Mono<Jwt> validateSession(Jwt token, ReactiveStringRedisTemplate redis) {
        String sid = token.getClaimAsString("sid");
        if (sid == null || sid.isBlank() || token.getIssuedAt() == null) {
            return Mono.error(new JwtException("Missing session claims"));
        }
        return Mono.zip(redis.hasKey("auth:revoked:sid:" + sid),
                redis.opsForValue().get("auth:revoked:user:" + token.getSubject()).defaultIfEmpty("0"))
                .flatMap(state -> state.getT1() || token.getIssuedAt().toEpochMilli() <= Long.parseLong(state.getT2())
                        ? Mono.<Jwt>error(new JwtException("Revoked session")) : Mono.just(token))
                .onErrorMap(failure -> new JwtException("Session validation failed", failure));
    }

    private OAuth2TokenValidatorResult invalid() {
        return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Invalid access token", null));
    }
}
