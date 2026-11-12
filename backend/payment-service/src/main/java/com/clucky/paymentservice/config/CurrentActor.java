package com.clucky.paymentservice.config;

import com.clucky.paymentservice.dto.Role;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

public record CurrentActor(Long userId, Role role, Long storeId, String fullName) {
    public CurrentActor(Long userId, Role role, Long storeId) {
        this(userId, role, storeId, null);
    }

    public static CurrentActor require() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof JwtAuthenticationToken token) || !token.isAuthenticated()) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required");
        }
        Object store = token.getToken().getClaim("storeId");
        String name = token.getToken().getClaimAsString("fullName");
        if (name == null || name.isBlank()) {
            name = token.getToken().getClaimAsString("name");
        }
        return new CurrentActor(Long.valueOf(token.getToken().getSubject()),
                Role.valueOf(token.getToken().getClaimAsString("role")),
                store == null ? null : Long.valueOf(store.toString()),
                name);
    }
}
