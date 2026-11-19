package com.clucky.identityservice.service;

import com.clucky.identityservice.config.AuthProperties;
import com.clucky.identityservice.config.CurrentActor;
import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.entity.User;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.clucky.identityservice.repository.RefreshTokenRepository;
import com.clucky.identityservice.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AuthSessionServiceTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final UserRepository users = mock(UserRepository.class);
    private final RefreshTokenRepository tokens = mock(RefreshTokenRepository.class);
    private final SessionRevocationService redis = mock(SessionRevocationService.class);
    private final IdentityAuditService audit = mock(IdentityAuditService.class);
    private AuthSessionService sessions;

    @BeforeEach
    void setup() {
        sessions = new AuthSessionService(jdbc, users, tokens, redis,
                new AuthProperties(Duration.ofMinutes(30), Duration.ofDays(7),
                        Duration.ofMinutes(5), null, List.of()), audit);
    }

    private User user(long id, Role role, Long storeId, boolean current) {
        User user = new User();
        user.setId(id);
        user.setRole(role);
        user.setStoreId(storeId);
        user.setStatus("ACTIVE");
        org.springframework.test.util.ReflectionTestUtils.setField(user, "currentBranchAccount", current);
        return user;
    }

    private void capacity(long userId, int current, int limit) {
        when(jdbc.queryForObject(startsWith("SELECT COUNT(*)"), eq(Integer.class), eq(userId)))
                .thenReturn(current);
        when(jdbc.queryForObject(startsWith("SELECT max_active_sessions"), eq(Integer.class), eq(userId)))
                .thenReturn(limit);
    }

    @Test
    void loginAtCapacityIsConflictAndDoesNotEvictAnySession() {
        capacity(5, 3, 3);
        ApiException error = assertThrows(ApiException.class, () -> sessions.issue(
                user(5, Role.STAFF, 2L, true), "sid", Instant.now().plusSeconds(500), "Chrome"));
        assertEquals(ErrorCode.RESOURCE_CONFLICT, error.getCode());
        assertEquals("REACHED", error.getFieldErrors().get("sessionLimit"));
        verifyNoInteractions(tokens, redis);
    }

    @Test
    void reducingLimitBelowCurrentCountIsRejected() {
        User admin = user(1, Role.ADMIN, null, false);
        when(users.findById(1L)).thenReturn(Optional.of(admin));
        when(users.findByIdForUpdate(1L)).thenReturn(Optional.of(admin));
        capacity(1, 3, 3);
        ApiException error = assertThrows(ApiException.class, () -> sessions.setLimit(
                new CurrentActor(1L, Role.ADMIN, null), 1, 2, "current"));
        assertEquals(ErrorCode.RESOURCE_CONFLICT, error.getCode());
        assertEquals("BELOW_ACTIVE_COUNT", error.getFieldErrors().get("sessionLimit"));
        verifyNoInteractions(audit);
    }

    @Test
    void staffCannotUseOwnOrBranchSessionManagement() {
        CurrentActor staff = new CurrentActor(2L, Role.STAFF, 8L);
        assertEquals(ErrorCode.FORBIDDEN, assertThrows(ApiException.class,
                () -> sessions.list(staff, 2L, "sid")).getCode());
        assertEquals(ErrorCode.FORBIDDEN, assertThrows(ApiException.class,
                () -> sessions.revokeAllManaged(staff, 2L, "sid")).getCode());
    }

    @Test
    void managerCannotManageStaffFromAnotherStoreOrOtherManager() {
        User manager = user(1, Role.STORE_MANAGER, 8L, true);
        when(users.findById(1L)).thenReturn(Optional.of(manager));
        when(users.findById(2L)).thenReturn(Optional.of(user(2, Role.STAFF, 9L, true)));
        when(users.findById(3L)).thenReturn(Optional.of(user(3, Role.STORE_MANAGER, 8L, true)));
        CurrentActor actor = new CurrentActor(1L, Role.STORE_MANAGER, 8L);
        assertEquals(ErrorCode.FORBIDDEN, assertThrows(ApiException.class,
                () -> sessions.list(actor, 2L, "sid")).getCode());
        assertEquals(ErrorCode.FORBIDDEN, assertThrows(ApiException.class,
                () -> sessions.list(actor, 3L, "sid")).getCode());
    }

    @Test
    void revokeWritesSharedRedisSidBeforeDatabaseChanges() {
        when(jdbc.queryForList(startsWith("SELECT session_id"), eq(String.class), eq(5L), eq("sid")))
                .thenReturn(List.of("sid"));
        sessions.revoke(5L, "sid", 1L, "MANUAL");
        var order = inOrder(redis, jdbc, tokens);
        order.verify(redis).revokeSession(eq("sid"), any(Duration.class));
        order.verify(jdbc).update(startsWith("UPDATE identity_service.auth_sessions"),
                eq("MANUAL"), eq(1L), eq(5L), eq("sid"));
        order.verify(tokens).revokeAllForSession("sid");
    }
}
