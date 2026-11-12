package com.clucky.catalogstoreservice.service;

import com.clucky.catalogstoreservice.exception.ApiException;
import com.clucky.catalogstoreservice.exception.ErrorCode;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class InventoryVersionTest {
    @Test
    void requiresCurrentAdminVersionWithoutChangingLegacyBranchPayloads() {
        try {
            authenticate("ADMIN");
            assertEquals(ErrorCode.VALIDATION_ERROR, assertThrows(ApiException.class,
                    () -> InventoryService.checkAdminVersion(2L, null)).getCode());
            assertEquals(ErrorCode.RESOURCE_CONFLICT, assertThrows(ApiException.class,
                    () -> InventoryService.checkAdminVersion(2L, 1L)).getCode());
            assertDoesNotThrow(() -> InventoryService.checkAdminVersion(2L, 2L));
            authenticate("STAFF");
            assertDoesNotThrow(() -> InventoryService.checkAdminVersion(2L, null));
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private void authenticate(String role) {
        var token = Jwt.withTokenValue("self-check").header("alg", "HS256").subject("7").claim("role", role).build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(token, List.of()));
    }
}
