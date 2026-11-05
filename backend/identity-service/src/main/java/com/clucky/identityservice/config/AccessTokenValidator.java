package com.clucky.identityservice.config;

import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.service.SessionRevocationService;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

public final class AccessTokenValidator implements OAuth2TokenValidator<Jwt> {
    private final String audience;
    private final SessionRevocationService sessionRevocationService;

    public AccessTokenValidator(String audience) {
        this(audience, null);
    }

    public AccessTokenValidator(String audience, SessionRevocationService sessionRevocationService) {
        this.audience = audience;
        this.sessionRevocationService = sessionRevocationService;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
        try {
            String typ = token.getClaimAsString("typ");
            if ("refresh".equalsIgnoreCase(typ)) {
                return invalid();
            }

            Role role = Role.valueOf(token.getClaimAsString("role"));
            Object store = token.getClaim("storeId");
            boolean needsStore = role == Role.STAFF || role == Role.STORE_MANAGER;
            long userId = Long.parseLong(token.getSubject());
            if (userId <= 0 || token.getExpiresAt() == null
                    || token.getAudience() == null || !token.getAudience().contains(audience)
                    || (needsStore && store == null)
                    || (store != null && Long.parseLong(store.toString()) <= 0)) {
                return invalid();
            }

            if (sessionRevocationService != null) {
                String sid = token.getClaimAsString("sid");
                if (sid == null || sid.isBlank() || token.getIssuedAt() == null
                        || sessionRevocationService.isSessionRevoked(sid)) {
                    return invalid();
                }
                if (sessionRevocationService.isUserRevoked(userId, token.getIssuedAt())) {
                    return invalid();
                }
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
