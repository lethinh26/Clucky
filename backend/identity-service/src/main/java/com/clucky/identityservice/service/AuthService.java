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

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtIssuer jwtIssuer,
            OtpService otpService,
            RefreshTokenService refreshTokenService,
            EmailEventPublisher emailEventPublisher,
            AuthProperties authProperties
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtIssuer = jwtIssuer;
        this.otpService = otpService;
        this.refreshTokenService = refreshTokenService;
        this.emailEventPublisher = emailEventPublisher;
        this.authProperties = authProperties;
    }

    @Transactional(readOnly = true)
    public AuthResponse session(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.UNAUTHENTICATED));
        if (!STATUS_ACTIVE.equals(user.getStatus())) throw new ApiException(ErrorCode.ACCOUNT_LOCKED);
        return new AuthResponse(user.getId(), user.getRole(), user.getStoreId(), user.getEmail(), user.getFullName());
    }

    @Transactional
    public MessageResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        otpService.limitIssuance(email, OtpService.PURPOSE_REGISTER);

        if (userRepository.existsByEmail(email)) {
            throw new ApiException(ErrorCode.EMAIL_EXISTS);
        }
        if (request.fullName() == null || request.fullName().isBlank()
                || request.password() == null || request.password().isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR);
        }

        String phone = request.phone() != null && !request.phone().isBlank() ? request.phone().trim() : null;
        if (phone != null && userRepository.existsByPhone(phone)) {
            throw new ApiException(ErrorCode.RESOURCE_CONFLICT, Map.of("phone", "ALREADY_EXISTS"));
        }

        User user = new User();
        user.setEmail(email);
        user.setPhone(phone);
        user.setFullName(request.fullName().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        // Role, store, status and verification flag are decided server-side only.
        user.setRole(Role.CUSTOMER);
        user.setStoreId(null);
        user.setStatus(STATUS_ACTIVE);
        user.setEmailVerified(false);
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
                    if ("users_phone_key".equals(constraint.getConstraintName())) {
                        throw new ApiException(ErrorCode.RESOURCE_CONFLICT, Map.of("phone", "ALREADY_EXISTS"));
                    }
                }
            }
            throw failure;
        }

        String otp = otpService.generateAndSaveOtp(email, OtpService.PURPOSE_REGISTER);
        emailEventPublisher.publishOtpEmail(email, EmailEventPublisher.TEMPLATE_REGISTER_OTP, otp,
                Map.of("fullName", user.getFullName()));

        return new MessageResponse("Đăng ký thành công. Vui lòng kiểm tra mã OTP trong email.");
    }

    @Transactional
    public AuthResult verifyOtp(VerifyOtpRequest request) {
        String email = normalizeEmail(request.email());

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(ErrorCode.INVALID_OTP));

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
        String email = normalizeEmail(request.email());

        User user = userRepository.findByLogin(email)
                .orElseThrow(() -> new ApiException(ErrorCode.INVALID_CREDENTIALS));

        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS);
        }

        if (STATUS_LOCKED.equals(user.getStatus())) {
            throw new ApiException(ErrorCode.ACCOUNT_LOCKED);
        }

        // An unverified account can never obtain a session (BLOCKER 8).
        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
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
        String email = normalizeEmail(request.email());
        otpService.limitIssuance(email, OtpService.PURPOSE_RESET);

        userRepository.findByEmail(email).ifPresent(user -> {
            if (STATUS_ACTIVE.equals(user.getStatus()) && !user.isCurrentBranchAccount()) {
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
        String email = normalizeEmail(request.email());

        User user = userRepository.findByEmailForGoogle(email)
                .orElseThrow(() -> new ApiException(ErrorCode.INVALID_OTP));

        if (STATUS_LOCKED.equals(user.getStatus()) || user.isCurrentBranchAccount()) {
            throw new ApiException(ErrorCode.ACCOUNT_LOCKED);
        }

        // RESET purpose only; a REGISTER code can never authorize a password change.
        otpService.verifyAndConsume(email, OtpService.PURPOSE_RESET, request.otp());

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        // Global revocation: every session on every device stops authenticating (BLOCKER 10).
        refreshTokenService.revokeAllForUser(user.getId());

        return new MessageResponse("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
    }

    /**
     * INT-69: resend the register OTP for an existing, not-yet-verified account.
     * Issues a new challenge (invalidating the previous one) and re-publishes the email.
     */
    @Transactional
    public MessageResponse resendRegisterOtp(String email) {
        String normalized = normalizeEmail(email);
        otpService.limitIssuance(normalized, OtpService.PURPOSE_REGISTER);
        User user = userRepository.findByEmail(normalized)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
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

    /** Revokes every session of a user; called when an account is locked by administration. */
    @Transactional
    public void revokeAllSessionsForLockedAccount(User user) {
        user.setStatus(STATUS_LOCKED);
        userRepository.save(user);
        refreshTokenService.revokeAllForUser(user.getId());
    }

    AuthResult issueSession(User user) {
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

    public record AuthResult(String accessToken, String refreshToken, User user) {}
}
