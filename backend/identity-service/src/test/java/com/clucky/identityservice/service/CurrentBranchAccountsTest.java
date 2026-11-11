package com.clucky.identityservice.service;

import com.clucky.identityservice.config.AuthProperties;
import com.clucky.identityservice.dto.BranchAccountData.Account;
import com.clucky.identityservice.dto.BranchAccountData.RequestChallenge;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CurrentBranchAccountsTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final BranchAccountService service = new BranchAccountService(jdbc, mock(OtpService.class), mock(AuthProperties.class),
            mock(PasswordEncoder.class), mock(RefreshTokenService.class), mock(IdentityAuditService.class));

    @AfterEach
    void clearActor() { SecurityContextHolder.clearContext(); }

    @Test
    void existingActivatedPairRemainsReadyWithoutInventingRecoveryEmail() {
        var token = Jwt.withTokenValue("test").header("alg", "HS256").subject("1").claim("role", "ADMIN").build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(token,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        when(jdbc.queryForList("SELECT * FROM identity_service.branch_accounts WHERE store_id=? FOR UPDATE", 7L))
                .thenReturn(List.of(Map.of("email_verified", false, "version", 0L)));
        var accounts = List.of(new Account(2L, 7L, "STORE_MANAGER", "manager@example.com", "ACTIVE", true, true),
                new Account(3L, 7L, "STAFF", "staff@example.com", "ACTIVE", true, true));
        when(jdbc.query(anyString(), org.mockito.ArgumentMatchers.<RowMapper<Account>>any(), eq(7L))).thenReturn(accounts);

        var pair = service.get(7L);
        assertEquals("READY", pair.readiness());
        assertNull(pair.recoveryEmail());
        assertFalse(pair.verified());
        assertEquals(accounts, pair.accounts());
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void selfServiceRecoveryDoesNotFallBackToOldPersonalEmail() {
        when(jdbc.queryForList(anyString(), eq("staff@example.com"), eq("staff@example.com")))
                .thenReturn(List.of(Map.of("id", 3L, "store_id", 7L, "role", "STAFF", "status", "ACTIVE",
                        "current_branch_account", true, "email_verified", true, "email", "old@example.com")));
        when(jdbc.queryForList("SELECT * FROM identity_service.branch_accounts WHERE store_id=? FOR UPDATE", 7L))
                .thenReturn(List.of(Map.of("email_verified", false, "version", 0L)));

        assertNotNull(service.request(new RequestChallenge("staff@example.com", "RESET")).challengeId());
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }
}
