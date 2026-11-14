package com.clucky.identityservice.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.clucky.identityservice.config.AuthProperties;
import com.clucky.identityservice.config.JwtSettings;
import com.clucky.identityservice.config.RedisConfig;
import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.dto.auth.LoginRequest;
import com.clucky.identityservice.dto.auth.RegisterRequest;
import com.clucky.identityservice.entity.User;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.clucky.identityservice.repository.UserRepository;
import com.clucky.identityservice.security.JwtIssuer;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class GoogleAuthServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final FirebaseIdentityVerifier verifier = mock(FirebaseIdentityVerifier.class);
    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    private final ValueOperations<String, String> values = mock(ValueOperations.class);
    private final Map<String, String> pending = new HashMap<>();
    private final Map<String, User> storedUsers = new HashMap<>();
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder(4);
    private final RefreshTokenService refresh = mock(RefreshTokenService.class);
    private final EmailEventPublisher email = mock(EmailEventPublisher.class);
    private final OtpService otp = mock(OtpService.class);
    private AuthService auth;
    private GoogleAuthService google;

    @BeforeEach
    void setUp() {
        when(verifier.verify("google-token")).thenReturn(
                new FirebaseIdentityVerifier.Identity("firebase-uid", "customer@example.com", "Google Name"));
        when(users.findByFirebaseUid(anyString())).thenAnswer(call -> storedUsers.values().stream()
                .filter(user -> call.getArgument(0).equals(user.getFirebaseUid())).findFirst());
        when(users.findByEmailForGoogle(anyString())).thenAnswer(call -> Optional.ofNullable(storedUsers.get(call.getArgument(0))));
        when(users.findByEmail(anyString())).thenAnswer(call -> Optional.ofNullable(storedUsers.get(call.getArgument(0))));
        when(users.findByLogin(anyString())).thenAnswer(call -> Optional.ofNullable(storedUsers.get(call.getArgument(0))));
        when(users.existsByEmail(anyString())).thenAnswer(call -> storedUsers.containsKey(call.getArgument(0)));
        when(users.saveAndFlush(any(User.class))).thenAnswer(call -> {
            User user = call.getArgument(0);
            if (user.getId() == null) user.setId(1L);
            storedUsers.put(user.getEmail(), user);
            return user;
        });
        when(redis.opsForValue()).thenReturn(values);
        when(redis.execute(org.mockito.ArgumentMatchers.<RedisScript<Long>>any(), anyList())).thenReturn(1L);
        doAnswer(call -> {
            assertEquals(Duration.ofMinutes(10), call.getArgument(2));
            pending.put(call.getArgument(0), call.getArgument(1));
            return null;
        }).when(values).set(anyString(), anyString(), any(Duration.class));
        when(values.getAndDelete(anyString())).thenAnswer(call -> pending.remove(call.getArgument(0)));
        AuthProperties properties = new AuthProperties(null, null, null, null, null);
        JwtIssuer issuer = new JwtIssuer(new JwtSettings("test-only-secret-at-least-thirty-two-bytes-long",
                "clucky-identity", "clucky-api"), properties);
        auth = new AuthService(users, passwords, issuer, otp, refresh, email, properties);
        google = new GoogleAuthService(verifier, users, auth, passwords, redis, new ObjectMapper(),
                new RedisConfig.Policy(Map.of("google-pending", Duration.ofMinutes(10))));
    }

    @Test
    void googleFirstCreatesOneAccountAndBothLoginMethodsUseIt() {
        var initial = google.login("google-token");
        assertNull(initial.session());
        assertTrue(initial.pendingToken().matches("[A-Za-z0-9_-]{43}"));
        assertTrue(storedUsers.isEmpty());
        assertFalse(pending.keySet().iterator().next().contains(initial.pendingToken()));
        verifyNoInteractions(refresh, email);
        var completed = google.complete(initial.pendingToken(), "Password123");
        User user = completed.user();
        assertEquals(Role.CUSTOMER, user.getRole());
        assertEquals("ACTIVE", user.getStatus());
        assertTrue(user.getEmailVerified());
        assertNull(user.getStoreId());
        assertTrue(passwords.matches("Password123", user.getPasswordHash()));
        assertEquals("firebase-uid", user.getFirebaseUid());
        assertNotNull(completed.accessToken());
        assertNotNull(completed.refreshToken());
        var googleAgain = google.login("google-token");
        assertNull(googleAgain.pendingToken());
        assertSame(user, googleAgain.session().user());
        assertSame(user, auth.login(new LoginRequest(" Customer@Example.COM ", "Password123")).user());
        assertEquals(1, storedUsers.size());
        assertEquals(ErrorCode.INVALID_CREDENTIALS, assertThrows(ApiException.class,
                () -> auth.login(new LoginRequest(user.getEmail(), "WrongPassword1"))).getCode());
        assertEquals(ErrorCode.VALIDATION_ERROR, assertThrows(ApiException.class,
                () -> auth.register(new RegisterRequest("Other Name", user.getEmail(), "0901234567", "Different123"))).getCode(),
                "Email cannot be supplied at phone-first registration");
        verifyNoInteractions(email);
    }

    @Test
    void emailFirstLinksWithoutChangingPasswordOrProfile() {
        User existing = existingCustomer();
        String originalHash = existing.getPasswordHash();
        var result = google.login("google-token");
        assertNull(result.pendingToken());
        assertSame(existing, result.session().user());
        assertEquals(originalHash, existing.getPasswordHash());
        assertEquals("Existing Name", existing.getFullName());
        assertEquals("https://example.com/existing.png", existing.getAvatarUrl());
        assertEquals("firebase-uid", existing.getFirebaseUid());
        assertSame(existing, auth.login(new LoginRequest(existing.getEmail(), "Existing123")).user());
        assertTrue(pending.isEmpty());
    }

    @Test
    void pendingTokenCannotBeReplayedOrUsedAfterExpiry() {
        String token = google.login("google-token").pendingToken();
        google.complete(token, "Password123");
        assertEquals(ErrorCode.TOKEN_REVOKED, assertThrows(ApiException.class,
                () -> google.complete(token, "Replacement123")).getCode());
        assertEquals(ErrorCode.TOKEN_REVOKED, assertThrows(ApiException.class,
                () -> google.complete("x".repeat(43), "Password123")).getCode());
        assertTrue(passwords.matches("Password123", storedUsers.get("customer@example.com").getPasswordHash()));
    }

    @Test
    void registrationRaceCannotOverwriteAnEmailAccount() {
        String token = google.login("google-token").pendingToken();
        User existing = existingCustomer();
        String hash = existing.getPasswordHash();
        assertEquals(ErrorCode.EMAIL_EXISTS, assertThrows(ApiException.class,
                () -> google.complete(token, "Replacement123")).getCode());
        assertEquals(hash, existing.getPasswordHash());
        assertNull(existing.getFirebaseUid());
        assertSame(existing, google.login("google-token").session().user());
    }

    @Test
    void databaseUniqueConstraintFailureNeverIssuesASession() {
        String token = google.login("google-token").pendingToken();
        when(users.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("duplicate"));
        assertEquals(ErrorCode.EMAIL_EXISTS, assertThrows(ApiException.class,
                () -> google.complete(token, "Password123")).getCode());
        verifyNoInteractions(refresh);
    }

    @Test
    void lockedUnverifiedAndStaffAccountsCannotLink() {
        User user = existingCustomer();
        user.setStatus("LOCKED");
        assertDenied(ErrorCode.ACCOUNT_LOCKED);
        user.setStatus("ACTIVE");
        user.setEmailVerified(false);
        assertDenied(ErrorCode.EMAIL_NOT_VERIFIED);
        user.setEmailVerified(true);
        for (Role role : Role.values()) {
            if (role == Role.CUSTOMER) continue;
            user.setRole(role);
            assertDenied(ErrorCode.FORBIDDEN);
        }
        assertNull(user.getFirebaseUid());
        verifyNoInteractions(refresh);
    }

    @Test
    void conflictingUidIsRejectedButStableUidSurvivesVerifiedEmailChange() {
        User user = existingCustomer();
        user.setFirebaseUid("another-uid");
        assertDenied(ErrorCode.RESOURCE_CONFLICT);
        user.setFirebaseUid("firebase-uid");
        user.setEmail("other@example.com");
        var afterChange = google.login("google-token");
        assertNull(afterChange.pendingToken());
        assertSame(user, afterChange.session().user());
        assertEquals("other@example.com", user.getEmail());
        verify(refresh).saveRefreshToken(eq(user.getId()), anyString(), any(java.time.Instant.class));
    }

    @Test
    void verifierFailureOrRateLimitCreatesNoAccountOrPendingToken() {
        when(verifier.verify("invalid")).thenThrow(new ApiException(ErrorCode.UNAUTHENTICATED));
        assertEquals(ErrorCode.UNAUTHENTICATED, assertThrows(ApiException.class,
                () -> google.login("invalid")).getCode());
        when(redis.execute(org.mockito.ArgumentMatchers.<RedisScript<Long>>any(), anyList())).thenReturn(11L);
        assertDenied(ErrorCode.TOO_MANY_REQUESTS);
        assertTrue(storedUsers.isEmpty());
        assertTrue(pending.isEmpty());
        verifyNoInteractions(refresh);
    }

    private User existingCustomer() {
        User user = new User();
        user.setId(42L);
        user.setEmail("customer@example.com");
        user.setPasswordHash(passwords.encode("Existing123"));
        user.setFullName("Existing Name");
        user.setAvatarUrl("https://example.com/existing.png");
        user.setRole(Role.CUSTOMER);
        user.setEmailVerified(true);
        storedUsers.put(user.getEmail(), user);
        return user;
    }

    @Test
    void bcryptByteLimitIsValidatedBeforeConsumingPendingToken() {
        String token = google.login("google-token").pendingToken();
        assertEquals(ErrorCode.VALIDATION_ERROR, assertThrows(ApiException.class,
                () -> google.complete(token, "Aa1" + "ế".repeat(24))).getCode());
        assertNotNull(google.complete(token, "Password123").accessToken());
    }

    private void assertDenied(ErrorCode expected) {
        assertEquals(expected, assertThrows(ApiException.class, () -> google.login("google-token")).getCode());
    }
}
