package com.clucky.reviewreportservice.config;

import com.clucky.reviewreportservice.dto.Role;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

public record CurrentActor(Long userId, Role role, Long storeId) {
    public static CurrentActor require() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof JwtAuthenticationToken token) || !token.isAuthenticated()) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required");
        }
        Object store = token.getToken().getClaim("storeId");
        return new CurrentActor(Long.valueOf(token.getToken().getSubject()),
                Role.valueOf(token.getToken().getClaimAsString("role")),
                store == null ? null : Long.valueOf(store.toString()));
    }
}
