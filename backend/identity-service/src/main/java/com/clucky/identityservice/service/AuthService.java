package com.clucky.identityservice.service;

import com.clucky.identityservice.config.AuthProperties;
import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.dto.auth.*;
import com.clucky.identityservice.entity.User;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.clucky.identityservice.repository.UserRepository;
import com.clucky.identityservice.security.JwtIssuer;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class AuthService {
    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final String STATUS_LOCKED = "LOCKED";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtIssuer jwtIssuer;
    private final OtpService otpService;
    private final RefreshTokenService refreshTokenService;
    private final EmailEventPublisher emailEventPublisher;
    private final AuthProperties authProperties;
    private final IdentityChallenges challenges;

    @org.springframework.beans.factory.annotation.Autowired
    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtIssuer jwtIssuer,
            OtpService otpService,
            RefreshTokenService refreshTokenService,
            EmailEventPublisher emailEventPublisher,
            AuthProperties authProperties,
            IdentityChallenges challenges
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtIssuer = jwtIssuer;
        this.otpService = otpService;
        this.refreshTokenService = refreshTokenService;
        this.emailEventPublisher = emailEventPublisher;
        this.authProperties = authProperties;
        this.challenges = challenges;
    }

    /** Kept for older in-process clients; runtime always injects IdentityChallenges. */
    @Deprecated
    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtIssuer jwtIssuer,
            OtpService otpService, RefreshTokenService refreshTokenService,
            EmailEventPublisher emailEventPublisher, AuthProperties authProperties) {
        this(userRepository, passwordEncoder, jwtIssuer, otpService,
                refreshTokenService, emailEventPublisher, authProperties, null);
    }

    @Transactional(readOnly = true)
    public AuthResponse session(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.UNAUTHENTICATED));
        requireSessionAllowed(user);
        return new AuthResponse(user.getId(), user.getRole(), user.getStoreId(), user.getEmail(), user.getFullName());
    }

    @Transactional
    public MessageResponse register(RegisterRequest request) {
        // Email can only be bound after signup by an authenticated email OTP.
        if (request.email() != null && !request.email().isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        if (request.fullName() == null || request.fullName().isBlank()
                || !validPassword(request.password())) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        String phone = PhoneNumbers.normalize(request.phone());
        if (userRepository.existsByPhone(phone)
                || userRepository.existsByPhone(PhoneNumbers.legacyVietnamese(phone))) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT, Map.of("phone", "ALREADY_EXISTS"));
        }

        User user = new User();
        user.setEmail(null);
        user.setPhone(phone);
        user.setFullName(request.fullName().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        // Role, store, status and verification flag are decided server-side only.
        user.setRole(Role.CUSTOMER);
        user.setStoreId(null);
        user.setStatus(STATUS_ACTIVE);
        user.setEmailVerified(false);
        user.setPhoneVerified(false);
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());

        try {
            // Flush immediately so the unique constraint decides concurrent duplicates.
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException failure) {
            var visited = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<Throwable, Boolean>());
            for (Throwable cause = failure; cause != null && visited.add(cause); cause = cause.getCause()) {
                if (cause instanceof org.hibernate.exception.ConstraintViolationException constraint) {
                    if ("users_email_key".equals(constraint.getConstraintName())) throw new ApiException(ErrorCode.EMAIL_EXISTS);
                    if ("users_phone_key".equals(constraint.getConstraintName())
                            || "users_phone_canonical_unique".equals(constraint.getConstraintName())) {
                        throw new ApiException(ErrorCode.RESOURCE_CONFLICT, Map.of("phone", "ALREADY_EXISTS"));
                    }
                }
            }
            throw failure;
        }

        String challengeId = challenges.sendSms(user, "REGISTER");
        return new MessageResponse("Vui lòng nhập mã OTP gửi đến số điện thoại để hoàn tất đăng ký.", challengeId);
    }

    @Transactional
    public AuthResult verifyOtp(VerifyOtpRequest request) {
        if (request.phone() != null && !request.phone().isBlank()) {
            String phone = PhoneNumbers.normalize(request.phone());
            User user = phoneUser(phone, true).orElseThrow(() -> new ApiException(ErrorCode.INVALID_OTP));
            if (user.getRole() != Role.CUSTOMER || user.isCurrentBranchAccount()
                    || STATUS_LOCKED.equals(user.getStatus())) throw new ApiException(ErrorCode.ACCOUNT_LOCKED);
            if (Boolean.TRUE.equals(user.getPhoneVerified())
                    || user.getEmail() != null || Boolean.TRUE.equals(user.getEmailVerified())) {
                throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
            }
            challenges.verifySms(user, "REGISTER", request.challengeId(), request.otp());
            user.setPhoneVerified(true);
            userRepository.saveAndFlush(user);
            return issueSession(user);
        }
        // Legacy email-only accounts may finish registration using their existing email OTP.
        if (request.email() == null || request.email().isBlank()) {
            throw new ApiException(ErrorCode.INVALID_OTP);
        }
        String email = normalizeEmail(request.email());

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(ErrorCode.INVALID_OTP));

        // Legacy registration verification is CUSTOMER-only. Never activate a
        // branch account or grant Staff/Manager/Admin sessions with a signup OTP.
        if (user.getRole() != Role.CUSTOMER || user.isCurrentBranchAccount()) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        // Email verification never unlocks a LOCKED account (BLOCKER 8).
        if (STATUS_LOCKED.equals(user.getStatus())) {
            throw new ApiException(ErrorCode.ACCOUNT_LOCKED);
        }

        // REGISTER purpose only; a RESET code can never verify an address.
        otpService.verifyAndConsume(email, OtpService.PURPOSE_REGISTER, request.otp());

        user.setEmailVerified(true);
        userRepository.save(user);

        return issueSession(user);
    }

    @Transactional
    public AuthResult login(LoginRequest request) {
        String identifier = request.email() == null ? null : request.email().trim();
        boolean phoneLogin = identifier != null && (identifier.startsWith("+") || identifier.matches("0[0-9]{9}"));
        User user = (phoneLogin
                ? phoneUser(PhoneNumbers.normalize(identifier), true)
                : userRepository.findByLogin(normalizeEmail(identifier)))
                .orElseThrow(() -> new ApiException(ErrorCode.INVALID_CREDENTIALS));

        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS);
        }

        if (STATUS_LOCKED.equals(user.getStatus())) {
            throw new ApiException(ErrorCode.ACCOUNT_LOCKED);
        }

        // A legacy CUSTOMER may have an email-verified account and a phone
        // recorded before phone OTP was introduced. Password login by either
        // identifier must still work; the phone remains *unverified* and cannot
        // be used as an OTP recovery channel until the owner verifies it.
        // New phone-only registrations are still blocked by the verification
        // gate below until Bridge confirms the registration SMS OTP.
        // Preserve the pre-existing staff/manager/admin email-verification gate.
        // Phone-only registration is exclusively for CUSTOMER accounts.
        if (user.getRole() != Role.CUSTOMER && !Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new ApiException(ErrorCode.EMAIL_NOT_VERIFIED);
        }
        if (user.getRole() == Role.CUSTOMER && !Boolean.TRUE.equals(user.getPhoneVerified())
                && !Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new ApiException(ErrorCode.EMAIL_NOT_VERIFIED);
        }

        return issueSession(user);
    }

    @Transactional
    public AuthResult refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
        RefreshTokenService.RotateResult rotated = refreshTokenService.rotate(rawRefreshToken);
        requireSessionAllowed(rotated.user());
        return new AuthResult(rotated.accessToken(), rotated.refreshToken(), rotated.user());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
        // Per-device logout only: revokes this session's refresh token and sid, never the user's others.
        refreshTokenService.revokeSession(rawRefreshToken);
    }

    @Transactional
    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        String channel = channel(request.channel(), request.phone());
        if ("SMS".equals(channel)) {
            String phone = PhoneNumbers.normalize(request.phone());
            // Apply the public per-number rate limit before lookup. Otherwise
            // unknown numbers never hit the Bridge throttle and the sixth
            // request can reveal which recovery contacts exist.
            otpService.limitIssuance("recovery:" + phone, "PASSWORD_RESET");
            String challengeId = UUID.randomUUID().toString();
            var eligible = phoneUser(phone, false)
                    .filter(this::recoverable)
                    .filter(user -> Boolean.TRUE.equals(user.getPhoneVerified()));
            if (eligible.isPresent()) {
                try {
                    challengeId = challenges.sendSms(eligible.get(), "PASSWORD_RESET");
                } catch (ApiException providerOrQuotaFailure) {
                    // Fail closed without revealing that the number is owned
                    // by an account, including when Bridge is unavailable.
                    // The public throttle above still returns 429 uniformly.
                }
            }
            // The response shape and provider failures cannot enumerate an account.
            return new MessageResponse("Nếu tài khoản đủ điều kiện, mã OTP đã được gửi.", challengeId);
        }
        String email = IdentityChallenges.normalizedEmail(request.email());
        otpService.limitIssuance(email, OtpService.PURPOSE_RESET);

        userRepository.findByEmail(email).ifPresent(user -> {
            if (recoverable(user) && Boolean.TRUE.equals(user.getEmailVerified())) {
                String otp = otpService.generateAndSaveOtp(email, OtpService.PURPOSE_RESET);
                emailEventPublisher.publishOtpEmail(email, EmailEventPublisher.TEMPLATE_RESET_OTP, otp,
                        Map.of("fullName", user.getFullName()));
            }
        });

        // Identical response whether or not the account exists: no user enumeration.
        return new MessageResponse("Nếu email tồn tại trong hệ thống, mã OTP đã được gửi.");
    }

    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        if (!validPassword(request.newPassword())) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        String channel = channel(request.channel(), request.phone());
        User user;
        if ("SMS".equals(channel)) {
            String phone = PhoneNumbers.normalize(request.phone());
            user = phoneUser(phone, true).orElseThrow(() -> new ApiException(ErrorCode.INVALID_OTP));
            if (!recoverable(user) || !Boolean.TRUE.equals(user.getPhoneVerified())) {
                throw new ApiException(ErrorCode.INVALID_OTP);
            }
            challenges.verifySms(user, "PASSWORD_RESET", request.challengeId(), request.otp());
        } else {
            String email = IdentityChallenges.normalizedEmail(request.email());
            user = userRepository.findByEmailForGoogle(email)
                    .orElseThrow(() -> new ApiException(ErrorCode.INVALID_OTP));
            if (!recoverable(user) || !Boolean.TRUE.equals(user.getEmailVerified())) {
                throw new ApiException(ErrorCode.INVALID_OTP);
            }
            otpService.verifyAndConsume(email, OtpService.PURPOSE_RESET, request.otp());
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        // Global revocation: every session on every device stops authenticating (BLOCKER 10).
        refreshTokenService.revokeAllForUser(user.getId());

        return new MessageResponse("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
    }

    @Transactional
    public MessageResponse requestPasswordChange(Long userId, String selectedChannel) {
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHENTICATED));
        if (!recoverable(user)) throw new ApiException(ErrorCode.FORBIDDEN);
        String channel = channel(selectedChannel, null);
        if ("SMS".equals(channel)) {
            if (!Boolean.TRUE.equals(user.getPhoneVerified())) throw new ApiException(ErrorCode.FORBIDDEN);
            return new MessageResponse("Mã OTP đã được gửi đến số điện thoại đã xác minh.",
                    challenges.sendSms(user, "PASSWORD_CHANGE"));
        }
        if (user.getEmail() == null || !Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        otpService.limitIssuance(user.getEmail(), OtpService.PURPOSE_PASSWORD_CHANGE);
        String otp = otpService.generateAndSaveOtp(user.getEmail(), OtpService.PURPOSE_PASSWORD_CHANGE);
        emailEventPublisher.publishOtpEmail(user.getEmail(), EmailEventPublisher.TEMPLATE_RESET_OTP, otp,
                Map.of("fullName", user.getFullName()));
        return new MessageResponse("Mã OTP đã được gửi đến email đã xác minh.");
    }

    @Transactional
    public MessageResponse confirmPasswordChange(Long userId, String selectedChannel, String challengeId,
            String otp, String newPassword) {
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHENTICATED));
        if (!recoverable(user)) throw new ApiException(ErrorCode.FORBIDDEN);
        if (!validPassword(newPassword)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        String channel = channel(selectedChannel, null);
        if ("SMS".equals(channel)) {
            if (!Boolean.TRUE.equals(user.getPhoneVerified())) throw new ApiException(ErrorCode.FORBIDDEN);
            challenges.verifySms(user, "PASSWORD_CHANGE", challengeId, otp);
        } else {
            if (user.getEmail() == null || !Boolean.TRUE.equals(user.getEmailVerified())) {
                throw new ApiException(ErrorCode.FORBIDDEN);
            }
            otpService.verifyAndConsume(user.getEmail(), OtpService.PURPOSE_PASSWORD_CHANGE, otp);
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.saveAndFlush(user);
        refreshTokenService.revokeAllForUser(user.getId());
        return new MessageResponse("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
    }

    /**
     * INT-69: resend the register OTP for an existing, not-yet-verified account.
     * Issues a new challenge (invalidating the previous one) and re-publishes the email.
     */
    @Transactional
    public MessageResponse resendRegisterOtp(String email) {
        if (email == null || email.isBlank()) throw new ApiException(ErrorCode.VALIDATION_ERROR);
        String normalized = normalizeEmail(email);
        otpService.limitIssuance(normalized, OtpService.PURPOSE_REGISTER);
        User user = userRepository.findByEmail(normalized)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        if (user.getRole() != Role.CUSTOMER || user.isCurrentBranchAccount()) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
        if (STATUS_LOCKED.equals(user.getStatus())) {
            throw new ApiException(ErrorCode.ACCOUNT_LOCKED);
        }
        String otp = otpService.generateAndSaveOtp(normalized, OtpService.PURPOSE_REGISTER);
        emailEventPublisher.publishOtpEmail(normalized, EmailEventPublisher.TEMPLATE_REGISTER_OTP, otp,
                Map.of("fullName", user.getFullName()));
        return new MessageResponse("Đã gửi lại mã OTP. Vui lòng kiểm tra email.");
    }

    @Transactional
    public MessageResponse resendRegisterOtp(ResendOtpRequest request) {
        if (request.phone() == null || request.phone().isBlank()) {
            return resendRegisterOtp(request.email());
        }
        String phone = PhoneNumbers.normalize(request.phone());
        User user = phoneUser(phone, true).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        if (user.getRole() != Role.CUSTOMER || STATUS_LOCKED.equals(user.getStatus())
                || Boolean.TRUE.equals(user.getPhoneVerified()) || user.getEmail() != null
                || Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT);
        }
        return new MessageResponse("Đã gửi lại mã OTP đến số điện thoại.",
                challenges.sendSms(user, "REGISTER"));
    }

    /** Revokes every session of a user; called when an account is locked by administration. */
    @Transactional
    public void revokeAllSessionsForLockedAccount(User user) {
        user.setStatus(STATUS_LOCKED);
        userRepository.save(user);
        refreshTokenService.revokeAllForUser(user.getId());
    }

    AuthResult issueSession(User user) {
        requireSessionAllowed(user);
        String sid = UUID.randomUUID().toString();
        String accessToken = jwtIssuer.issueAccessToken(user.getId(), user.getRole(), user.getStoreId(), sid);
        String refreshToken = jwtIssuer.issueRefreshToken(user.getId(), sid, UUID.randomUUID().toString());
        refreshTokenService.saveRefreshToken(user.getId(), refreshToken,
                Instant.now().plus(authProperties.refreshTtl()));
        return new AuthResult(accessToken, refreshToken, user);
    }

    public static String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private java.util.Optional<User> phoneUser(String normalized, boolean forUpdate) {
        var result = forUpdate ? userRepository.findByPhoneForUpdate(normalized)
                : userRepository.findByPhone(normalized);
        if (result.isPresent()) return result;
        String legacy = PhoneNumbers.legacyVietnamese(normalized);
        return forUpdate ? userRepository.findByPhoneForUpdate(legacy) : userRepository.findByPhone(legacy);
    }

    private boolean recoverable(User user) {
        return user.getRole() == Role.CUSTOMER && STATUS_ACTIVE.equals(user.getStatus())
                && !user.isCurrentBranchAccount();
    }

    private static String channel(String selected, String phone) {
        String value = selected == null || selected.isBlank()
                ? (phone == null || phone.isBlank() ? "EMAIL" : "SMS")
                : selected.trim().toUpperCase(Locale.ROOT);
        if (!"SMS".equals(value) && !"EMAIL".equals(value)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }
        return value;
    }

    private static void requireSessionAllowed(User user) {
        if (!STATUS_ACTIVE.equals(user.getStatus())) throw new ApiException(ErrorCode.ACCOUNT_LOCKED);
        if (user.getRole() == Role.CUSTOMER
                && !Boolean.TRUE.equals(user.getPhoneVerified())
                && !Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
    }

    private static boolean validPassword(String password) {
        return password != null
                && password.matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,72}$")
                && password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length <= 72;
    }

    public record AuthResult(String accessToken, String refreshToken, User user) {}
}
