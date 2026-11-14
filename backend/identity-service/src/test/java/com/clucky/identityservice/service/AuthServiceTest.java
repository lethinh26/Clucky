package com.clucky.identityservice.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.clucky.identityservice.dto.auth.ForgotPasswordRequest;
import com.clucky.identityservice.dto.auth.LoginRequest;
import com.clucky.identityservice.dto.auth.RegisterRequest;
import com.clucky.identityservice.dto.auth.ResetPasswordRequest;
import com.clucky.identityservice.dto.auth.ResendOtpRequest;
import com.clucky.identityservice.dto.auth.VerifyOtpRequest;
import com.clucky.identityservice.config.AuthProperties;
import com.clucky.identityservice.config.JwtSettings;
import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.entity.User;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.clucky.identityservice.repository.UserRepository;
import com.clucky.identityservice.security.JwtIssuer;
import java.lang.reflect.Proxy;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServiceTest {
    private static final String SECRET = "unit-test-secret-value-at-least-32-bytes-long";

    private final Map<Long, User> users = new ConcurrentHashMap<>();
    private final AtomicLong ids = new AtomicLong();
    private final List<String> publishedTemplates = new ArrayList<>();
    private final Map<String, String> publishedCodes = new HashMap<>();
    private OtpService otpService;
    private RefreshTokenService refreshTokens;
    private FakeRefreshRepository refreshRepository;
    private AuthService service;
    private PasswordEncoder encoder;
    private SessionRevocationService revocation;
    private org.springframework.data.redis.core.StringRedisTemplate redis;
    private IdentityChallenges challenges;

    @BeforeEach
    void setUp() {
        encoder = new BCryptPasswordEncoder(4);
        AuthProperties properties = new AuthProperties(Duration.ofMinutes(30), Duration.ofDays(7),
                Duration.ofMinutes(5), new AuthProperties.Cookie(false), List.of());
        JwtSettings settings = new JwtSettings(SECRET, "clucky-identity", "clucky-api");
        JwtIssuer issuer = new JwtIssuer(settings, properties);

        OtpServiceTest.InMemoryOtpRepository otpRepository = new OtpServiceTest.InMemoryOtpRepository();
        redis = mock(org.springframework.data.redis.core.StringRedisTemplate.class);
        when(redis.execute(any(org.springframework.data.redis.core.script.RedisScript.class), anyList(), anyString()))
                .thenReturn(1L);
        otpService = new OtpService(otpRepository.proxy(), properties, settings, redis);

        refreshRepository = new FakeRefreshRepository();
        revocation = mock(SessionRevocationService.class);
        refreshTokens = new RefreshTokenService(refreshRepository.proxy(), userRepository(), issuer, revocation,
                properties);
        challenges = mock(IdentityChallenges.class);
        when(challenges.sendSms(any(User.class), eq("REGISTER"))).thenReturn("challenge-1");

        service = new AuthService(userRepository(), encoder, issuer, otpService, refreshTokens,
                new EmailEventPublisher(null, new com.fasterxml.jackson.databind.ObjectMapper(), properties) {
                    @Override
                    public void publishOtpEmail(String recipient, String template, String otp,
                            Map<String, String> extraVariables) {
                        publishedTemplates.add(template);
                        publishedCodes.put(template, otp);
                    }
                }, properties, challenges);
    }

    @Test
    void registerCreatesUnverifiedPhoneCustomerAndRequestsSmsOnly() {
        var result = service.register(new RegisterRequest("Nguyen Van A", "0901234567", "Password1"));

        User user = users.values().iterator().next();
        assertNull(user.getEmail(), "Email is optional and must be bound using a separate verified challenge");
        assertEquals("+84901234567", user.getPhone());
        assertEquals(Role.CUSTOMER, user.getRole(), "Role is server assigned");
        assertNull(user.getStoreId(), "Client cannot set storeId");
        assertEquals("ACTIVE", user.getStatus());
        assertFalse(user.getEmailVerified(), "Registration must leave the account unverified");
        assertFalse(user.getPhoneVerified(), "Registration must leave the phone unverified");
        assertNotEquals("Password1", user.getPasswordHash(), "Password must be hashed");
        assertEquals("challenge-1", result.challengeId());
        verify(challenges).sendSms(user, "REGISTER");
        assertTrue(publishedTemplates.isEmpty(), "Phone signup must not send an email OTP");
    }

    @Test
    void signupRejectsEmailUntilItIsVerifiedFromTheAccount() {
        service.register(new RegisterRequest("A", "0901234567", "Password1"));

        ApiException failure = assertThrows(ApiException.class,
                () -> service.register(new RegisterRequest("B", "A@Example.com", "0903333333", "Password1")));
        assertEquals(ErrorCode.VALIDATION_ERROR, failure.getCode());
        assertEquals(1, users.size(), "Only one account may exist");
    }

    @Test
    void domesticAndE164RepresentationsCannotRegisterTheSamePhone() {
        service.register(new RegisterRequest("A", "0901234567", "Password1"));
        users.replaceAll((id, user) -> user);

        ApiException failure = assertThrows(ApiException.class,
                () -> service.register(new RegisterRequest("C", "+84901234567", "Password2")));
        assertEquals(ErrorCode.RESOURCE_CONFLICT, failure.getCode());
        assertEquals(Map.of("phone", "ALREADY_EXISTS"), failure.getFieldErrors());
        assertEquals(1, users.size());
    }

    @Test
    void duplicatePhoneIsIdentifiedWithoutCallingItAnEmailConflict() {
        service.register(new RegisterRequest("A", "0901234567", "Password1"));
        var failure = assertThrows(ApiException.class,
                () -> service.register(new RegisterRequest("B", "0901234567", "Password1")));
        assertEquals(ErrorCode.RESOURCE_CONFLICT, failure.getCode());
        assertEquals(Map.of("phone", "ALREADY_EXISTS"), failure.getFieldErrors());
        assertEquals(1, users.size());
        verify(challenges, times(1)).sendSms(any(User.class), eq("REGISTER"));
    }

    @Test
    void concurrentRegistrationConflictsUseTheActualDatabaseConstraint() {
        for (String name : List.of("users_email_key", "users_phone_key", "users_phone_canonical_unique", "unknown_constraint")) {
            var repository = mock(UserRepository.class);
            var publisher = mock(EmailEventPublisher.class);
            var constraint = mock(org.hibernate.exception.ConstraintViolationException.class);
            when(constraint.getConstraintName()).thenReturn(name);
            var databaseFailure = new DataIntegrityViolationException("private database diagnostic", constraint);
            when(repository.saveAndFlush(any(User.class))).thenThrow(databaseFailure);
            var concurrent = new AuthService(repository, encoder, mock(JwtIssuer.class), otpService, refreshTokens,
                    publisher, mock(AuthProperties.class), challenges);
            var request = new RegisterRequest("Customer", "0901234567", "Password1");
            if ("unknown_constraint".equals(name)) {
                assertSame(databaseFailure, assertThrows(DataIntegrityViolationException.class, () -> concurrent.register(request)));
            } else {
                var failure = assertThrows(ApiException.class, () -> concurrent.register(request));
                assertEquals("users_email_key".equals(name) ? ErrorCode.EMAIL_EXISTS : ErrorCode.RESOURCE_CONFLICT, failure.getCode());
                assertEquals(name.contains("phone") ? Map.of("phone", "ALREADY_EXISTS") : Map.of(), failure.getFieldErrors());
                assertFalse(failure.getMessage().contains("private"));
            }
            verifyNoInteractions(publisher);
        }
    }

    @Test
    void loginBeforeVerificationIsRejectedAndCreatesNoSession() {
        service.register(new RegisterRequest("A", "0901234567", "Password1"));

        ApiException failure = assertThrows(ApiException.class,
                () -> service.login(new LoginRequest("0901234567", "Password1")));
        assertEquals(ErrorCode.EMAIL_NOT_VERIFIED, failure.getCode());
        assertTrue(refreshRepository.rows.isEmpty(), "No refresh session may be created");
    }

    @Test
    void registerOtpVerifiesAccountAndIssuesTokens() {
        service.register(new RegisterRequest("A", "0901234567", "Password1"));

        AuthService.AuthResult result = service.verifyOtp(
                new VerifyOtpRequest(null, "123456", "0901234567", "challenge-1"));

        assertFalse(result.accessToken().isBlank());
        assertFalse(result.refreshToken().isBlank());
        assertTrue(users.values().iterator().next().getPhoneVerified());
        assertFalse(users.values().iterator().next().getEmailVerified());
        verify(challenges).verifySms(any(User.class), eq("REGISTER"), eq("challenge-1"), eq("123456"));
        assertEquals(1, refreshRepository.rows.size());
    }

    @Test
    void resetOtpCannotVerifyEmail() {
        seedVerifiedUser("a@example.com", "Password1");
        users.values().iterator().next().setEmailVerified(false);

        String resetCode = otpService.generateAndSaveOtp("a@example.com", OtpService.PURPOSE_RESET);

        ApiException failure = assertThrows(ApiException.class,
                () -> service.verifyOtp(new VerifyOtpRequest("a@example.com", resetCode)));
        assertEquals(ErrorCode.INVALID_OTP, failure.getCode());
        assertFalse(users.values().iterator().next().getEmailVerified());
    }

    @Test
    void verificationDoesNotUnlockLockedAccount() {
        service.register(new RegisterRequest("A", "0901234567", "Password1"));
        User user = users.values().iterator().next();
        user.setStatus("LOCKED");

        ApiException failure = assertThrows(ApiException.class,
                () -> service.verifyOtp(new VerifyOtpRequest(null, "123456", "0901234567", "challenge-1")));
        assertEquals(ErrorCode.ACCOUNT_LOCKED, failure.getCode());
        assertEquals("LOCKED", user.getStatus());
        verify(challenges, never()).verifySms(any(), anyString(), anyString(), anyString());
    }

    @Test
    void lockedAccountLoginReturnsLockedError() {
        seedVerifiedUser("a@example.com", "Password1");
        users.values().iterator().next().setStatus("LOCKED");

        ApiException failure = assertThrows(ApiException.class,
                () -> service.login(new LoginRequest("a@example.com", "Password1")));
        assertEquals(ErrorCode.ACCOUNT_LOCKED, failure.getCode());
        assertTrue(refreshRepository.rows.isEmpty());
    }

    @Test
    void wrongPasswordIsRejected() {
        seedVerifiedUser("a@example.com", "Password1");
        ApiException failure = assertThrows(ApiException.class,
                () -> service.login(new LoginRequest("a@example.com", "Password2")));
        assertEquals(ErrorCode.INVALID_CREDENTIALS, failure.getCode());
    }

    @Test
    void loginUsesNormalizedEmail() {
        seedVerifiedUser("a@example.com", "Password1");
        assertDoesNotThrow(() -> service.login(new LoginRequest("  A@EXAMPLE.COM ", "Password1")));
    }

    @Test
    void forgotPasswordIsGenericForUnknownEmail() {
        assertEquals(service.forgotPassword(new ForgotPasswordRequest("missing@example.com")),
                service.forgotPassword(new ForgotPasswordRequest("also-missing@example.com")));
        assertTrue(publishedTemplates.isEmpty(), "No email may be published for unknown accounts");
    }

    @Test
    void smsRecoveryDoesNotRevealWhetherTheNumberBelongsToAVerifiedAccount() {
        seedVerifiedUser("customer@example.com", "Password1");
        User account = users.values().iterator().next();
        account.setPhone("+84901234567");
        account.setPhoneVerified(true);
        when(challenges.sendSms(account, "PASSWORD_RESET")).thenReturn("bridge-challenge-1");

        var eligible = service.forgotPassword(new ForgotPasswordRequest(null, "0901234567", "SMS"));
        var unknown = service.forgotPassword(new ForgotPasswordRequest(null, "0909999999", "SMS"));
        assertEquals(eligible.message(), unknown.message(), "Unknown numbers must receive the same public response");
        assertNotNull(eligible.challengeId());
        assertNotNull(unknown.challengeId());
        verify(challenges, times(1)).sendSms(account, "PASSWORD_RESET");
    }

    @Test
    void smsRecoveryRateLimitAppliesBeforeLookupForExistingAndUnknownNumbers() {
        seedVerifiedUser("customer@example.com", "Password1");
        User account = users.values().iterator().next();
        account.setPhone("+84901234567");
        account.setPhoneVerified(true);
        when(redis.execute(any(org.springframework.data.redis.core.script.RedisScript.class), anyList(), anyString()))
                .thenReturn(6L);
        for (String number : List.of("0901234567", "0909999999")) {
            assertEquals(ErrorCode.TOO_MANY_REQUESTS, assertThrows(ApiException.class,
                    () -> service.forgotPassword(new ForgotPasswordRequest(null, number, "SMS"))).getCode());
        }
        verifyNoInteractions(challenges);
    }

    @Test
    void smsRecoveryBridgeOutageDoesNotExposeAccountOwnership() {
        seedVerifiedUser("customer@example.com", "Password1");
        User account = users.values().iterator().next();
        account.setPhone("+84901234567");
        account.setPhoneVerified(true);
        when(challenges.sendSms(account, "PASSWORD_RESET"))
                .thenThrow(new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE));

        var eligible = service.forgotPassword(new ForgotPasswordRequest(null, "0901234567", "SMS"));
        var unknown = service.forgotPassword(new ForgotPasswordRequest(null, "0909999999", "SMS"));
        assertEquals(unknown.message(), eligible.message());
        assertFalse(eligible.challengeId().isBlank());
    }

    @Test
    void resetPasswordChangesHashAndRevokesEverySession() {
        seedVerifiedUser("a@example.com", "Password1");
        AuthService.AuthResult deviceA = service.login(new LoginRequest("a@example.com", "Password1"));
        AuthService.AuthResult deviceB = service.login(new LoginRequest("a@example.com", "Password1"));
        assertEquals(2, refreshRepository.rows.size());

        // A remote session must be attributable to its own sid.
        refreshTokens.revokeSession(deviceA.refreshToken());
        assertTrue(refreshRepository.isRevoked(deviceA.refreshToken()));
        assertFalse(refreshRepository.isRevoked(deviceB.refreshToken()),
                "Session-scoped logout must not touch other devices");

        service.forgotPassword(new ForgotPasswordRequest("a@example.com"));
        String code = publishedCodes.get(EmailEventPublisher.TEMPLATE_RESET_OTP);
        var response = service.resetPassword(new ResetPasswordRequest("a@example.com", code, "NewPassword1"));

        assertEquals("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.", response.message());
        assertTrue(refreshRepository.allRevoked(), "Reset must revoke every active session");
        assertTrue(encoder.matches("NewPassword1", users.values().iterator().next().getPasswordHash()));
        assertFalse(encoder.matches("Password1", users.values().iterator().next().getPasswordHash()));
    }

    @Test
    void usedResetOtpCannotChangePasswordTwice() {
        seedVerifiedUser("a@example.com", "Password1");
        service.forgotPassword(new ForgotPasswordRequest("a@example.com"));
        String code = publishedCodes.get(EmailEventPublisher.TEMPLATE_RESET_OTP);
        service.resetPassword(new ResetPasswordRequest("a@example.com", code, "NewPassword1"));

        ApiException failure = assertThrows(ApiException.class,
                () -> service.resetPassword(new ResetPasswordRequest("a@example.com", code, "OtherPassword1")));
        assertEquals(ErrorCode.INVALID_OTP, failure.getCode());
        assertTrue(encoder.matches("NewPassword1", users.values().iterator().next().getPasswordHash()));
    }

    @Test
    void registerOtpCannotResetPassword() {
        seedVerifiedUser("a@example.com", "Password1");
        String registerCode = otpService.generateAndSaveOtp("a@example.com", OtpService.PURPOSE_REGISTER);

        ApiException failure = assertThrows(ApiException.class,
                () -> service.resetPassword(new ResetPasswordRequest("a@example.com", registerCode, "NewPassword1")));
        assertEquals(ErrorCode.INVALID_OTP, failure.getCode());
    }

    @Test
    void logoutRequiresARevocableCredential() {
        ApiException failure = assertThrows(ApiException.class, () -> service.logout(null));
        assertEquals(ErrorCode.UNAUTHENTICATED, failure.getCode());
    }

    /* ---------- INT-69: resend register OTP ---------- */

    @Test
    void resendOtpIssuesANewPhoneChallengeAndOnlyTheNewChallengeVerifies() {
        when(challenges.sendSms(any(User.class), eq("REGISTER"))).thenReturn("challenge-1", "challenge-2");
        service.register(new RegisterRequest("Nguyen Van A", "0901234567", "Password1"));
        var response = service.resendRegisterOtp(new ResendOtpRequest(null, "0901234567"));
        assertEquals("challenge-2", response.challengeId());
        assertEquals("Đã gửi lại mã OTP đến số điện thoại.", response.message());
        doThrow(new ApiException(ErrorCode.INVALID_OTP)).when(challenges)
                .verifySms(any(User.class), eq("REGISTER"), eq("challenge-1"), eq("123456"));
        assertEquals(ErrorCode.INVALID_OTP, assertThrows(ApiException.class,
                () -> service.verifyOtp(new VerifyOtpRequest(null, "123456", "0901234567", "challenge-1"))).getCode());
        assertNotNull(service.verifyOtp(new VerifyOtpRequest(null, "123456", "0901234567", "challenge-2")));
        assertTrue(users.values().iterator().next().getPhoneVerified());
    }

    @Test
    void resendOtpRejectsAVerifiedAccount() {
        seedVerifiedUser("a@example.com", "Password1");
        User user = users.values().iterator().next();
        user.setPhone("+84901234567");
        user.setPhoneVerified(true);

        ApiException failure = assertThrows(ApiException.class,
                () -> service.resendRegisterOtp(new ResendOtpRequest(null, "0901234567")));
        assertEquals(ErrorCode.RESOURCE_CONFLICT, failure.getCode());
    }

    @Test
    void resendOtpRejectsAnUnknownPhone() {
        ApiException failure = assertThrows(ApiException.class,
                () -> service.resendRegisterOtp(new ResendOtpRequest(null, "0909999999")));
        assertEquals(ErrorCode.RESOURCE_NOT_FOUND, failure.getCode());
    }

    @Test
    void resendOtpEnforcesIssuanceQuotaBeforeAccountLookup() {
        when(redis.execute(any(org.springframework.data.redis.core.script.RedisScript.class), anyList(), anyString()))
                .thenReturn(6L);
        assertEquals(ErrorCode.TOO_MANY_REQUESTS, assertThrows(ApiException.class,
                () -> service.resendRegisterOtp("missing@example.com")).getCode());
        assertTrue(publishedCodes.isEmpty());
    }

    @Test
    void revokedSessionCannotRotateRefreshToken() {
        seedVerifiedUser("a@example.com", "Password1");
        AuthService.AuthResult session = service.login(new LoginRequest("a@example.com", "Password1"));
        when(revocation.isSessionRevoked(anyString())).thenReturn(true);
        assertEquals(ErrorCode.TOKEN_REVOKED, assertThrows(ApiException.class,
                () -> service.refresh(session.refreshToken())).getCode());
        assertEquals(1, refreshRepository.rows.size());
    }

    @Test
    void resetRevocationBlocksAnUnrevokedRefreshRow() {
        seedVerifiedUser("a@example.com", "Password1");
        AuthService.AuthResult session = service.login(new LoginRequest("a@example.com", "Password1"));
        when(revocation.isUserRevoked(anyLong(), any(Instant.class))).thenReturn(true);
        assertEquals(ErrorCode.TOKEN_REVOKED, assertThrows(ApiException.class,
                () -> service.refresh(session.refreshToken())).getCode());
        assertEquals(1, refreshRepository.rows.size());
    }

    @Test
    void logoutDoesNotHideRevocationFailure() {
        seedVerifiedUser("a@example.com", "Password1");
        AuthService.AuthResult session = service.login(new LoginRequest("a@example.com", "Password1"));
        doThrow(new ApiException(ErrorCode.DEPENDENCY_UNAVAILABLE)).when(revocation)
                .revokeSession(anyString(), any(Duration.class));
        assertEquals(ErrorCode.DEPENDENCY_UNAVAILABLE, assertThrows(ApiException.class,
                () -> service.logout(session.refreshToken())).getCode());
    }

    @Test
    void forgotPasswordQuotaAppliesBeforeAccountLookup() {
        seedVerifiedUser("a@example.com", "Password1");
        when(redis.execute(any(org.springframework.data.redis.core.script.RedisScript.class), anyList(), anyString()))
                .thenReturn(6L);
        for (String email : List.of("a@example.com", "missing@example.com")) {
            assertEquals(ErrorCode.TOO_MANY_REQUESTS, assertThrows(ApiException.class,
                    () -> service.forgotPassword(new ForgotPasswordRequest(email))).getCode());
        }
        assertTrue(publishedCodes.isEmpty());
    }

    private void seedVerifiedUser(String email, String rawPassword) {
        User user = new User();
        user.setId(ids.incrementAndGet());
        user.setEmail(email);
        user.setFullName("Test User");
        user.setPasswordHash(encoder.encode(rawPassword));
        user.setRole(Role.CUSTOMER);
        user.setStatus("ACTIVE");
        user.setEmailVerified(true);
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());
        users.put(user.getId(), user);
    }

    private UserRepository userRepository() {
        return (UserRepository) Proxy.newProxyInstance(
                UserRepository.class.getClassLoader(),
                new Class<?>[]{UserRepository.class},
                (instance, method, args) -> switch (method.getName()) {
                    case "findByEmail", "findByEmailForGoogle" -> users.values().stream()
                            .filter(user -> java.util.Objects.equals(user.getEmail(), args[0])).findFirst();
                    case "findByPhone", "findByPhoneForUpdate" -> users.values().stream()
                            .filter(user -> java.util.Objects.equals(user.getPhone(), args[0])).findFirst();
                    case "findByLogin" -> users.values().stream()
                            .filter(user -> args[0].equals(user.getLoginName() == null ? user.getEmail() : user.getLoginName())).findFirst();
                    case "existsByEmail" -> users.values().stream()
                            .anyMatch(user -> java.util.Objects.equals(user.getEmail(), args[0]));
                    case "existsByPhone" -> args[0] != null && users.values().stream()
                            .anyMatch(user -> args[0].equals(user.getPhone()));
                    case "findById", "findByIdForUpdate" -> Optional.ofNullable(users.get((Long) args[0]));
                    case "save", "saveAndFlush" -> {
                        User user = (User) args[0];
                        if (user.getId() == null) {
                            boolean duplicatePhone = users.values().stream().anyMatch(existing ->
                                    user.getPhone() != null && PhoneNumbers.equivalent(existing.getPhone(), user.getPhone()));
                            if (duplicatePhone) throw new DataIntegrityViolationException("duplicate phone");
                            user.setId(ids.incrementAndGet());
                        }
                        users.put(user.getId(), user);
                        yield user;
                    }
                    default -> throw new UnsupportedOperationException(method.getName());
                });
    }

    static final class FakeRefreshRepository {
        final List<com.clucky.identityservice.entity.RefreshToken> rows = new ArrayList<>();

        boolean isRevoked(String rawToken) {
            String hash = RefreshTokenService.hash(rawToken);
            return rows.stream().anyMatch(row -> row.getTokenHash().equals(hash)
                    && Boolean.TRUE.equals(row.getRevoked()));
        }

        boolean allRevoked() {
            return !rows.isEmpty() && rows.stream().allMatch(row -> Boolean.TRUE.equals(row.getRevoked()));
        }

        com.clucky.identityservice.repository.RefreshTokenRepository proxy() {
            return (com.clucky.identityservice.repository.RefreshTokenRepository) Proxy.newProxyInstance(
                    com.clucky.identityservice.repository.RefreshTokenRepository.class.getClassLoader(),
                    new Class<?>[]{com.clucky.identityservice.repository.RefreshTokenRepository.class},
                    (instance, method, args) -> switch (method.getName()) {
                        case "save" -> {
                            rows.add((com.clucky.identityservice.entity.RefreshToken) args[0]);
                            yield args[0];
                        }
                        case "findByTokenHash" -> rows.stream()
                                .filter(row -> row.getTokenHash().equals(args[0])).reduce((a, b) -> b);
                        case "revokeToken" -> {
                            int changed = 0;
                            for (var row : rows) {
                                if (row.getTokenHash().equals(args[0]) && Boolean.FALSE.equals(row.getRevoked())) {
                                    row.setRevoked(true);
                                    changed++;
                                }
                            }
                            yield changed;
                        }
                        case "revokeAllForUser" -> {
                            int changed = 0;
                            for (var row : rows) {
                                if (row.getUserId().equals(args[0]) && Boolean.FALSE.equals(row.getRevoked())) {
                                    row.setRevoked(true);
                                    changed++;
                                }
                            }
                            yield changed;
                        }
                        default -> throw new UnsupportedOperationException(method.getName());
                    });
        }
    }
}

