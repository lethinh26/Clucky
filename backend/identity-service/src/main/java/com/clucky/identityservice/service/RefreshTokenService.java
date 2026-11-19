package com.clucky.identityservice.service;

import com.clucky.identityservice.config.AuthProperties;
import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.entity.RefreshToken;
import com.clucky.identityservice.entity.User;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.clucky.identityservice.repository.RefreshTokenRepository;
import com.clucky.identityservice.repository.UserRepository;
import com.clucky.identityservice.security.JwtIssuer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class RefreshTokenService {
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final JwtIssuer jwtIssuer;
    private final SessionRevocationService sessionRevocationService;
    private final AuthProperties authProperties;
    @org.springframework.beans.factory.annotation.Autowired
    private AuthSessionService authSessions;

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            UserRepository userRepository,
            JwtIssuer jwtIssuer,
            SessionRevocationService sessionRevocationService,
            AuthProperties authProperties
    ) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.userRepository = userRepository;
        this.jwtIssuer = jwtIssuer;
        this.sessionRevocationService = sessionRevocationService;
        this.authProperties = authProperties;
    }

    @Transactional
    public void saveRefreshToken(Long userId, String rawRefreshToken, Instant expiresAt) {
        saveRefreshToken(userId, rawRefreshToken, expiresAt, null);
    }

    @Transactional
    public void saveRefreshToken(Long userId, String rawRefreshToken, Instant expiresAt, String sid) {
        String tokenHash = hash(rawRefreshToken);
        RefreshToken entity = new RefreshToken();
        entity.setUserId(userId);
        entity.setTokenHash(tokenHash);
        entity.setExpiresAt(expiresAt);
        entity.setRevoked(false);
        entity.setCreatedAt(Instant.now());
        entity.setSessionId(sid);
        refreshTokenRepository.save(entity);
    }

    @Transactional
    public RotateResult rotate(String rawRefreshToken) {
        JwtIssuer.RefreshTokenClaims claims = jwtIssuer.verifyAndParseRefreshToken(rawRefreshToken);

        if (sessionRevocationService.isSessionRevoked(claims.sid())
                || sessionRevocationService.isUserRevoked(claims.userId(), claims.issuedAt())) {
            throw new ApiException(ErrorCode.TOKEN_REVOKED);
        }

        User user = userRepository.findByIdForUpdate(claims.userId())
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHENTICATED));
        String tokenHash = hash(rawRefreshToken);
        RefreshToken storedToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ApiException(ErrorCode.TOKEN_REVOKED));

        if (!user.getId().equals(storedToken.getUserId())
                || (storedToken.getSessionId() != null && !storedToken.getSessionId().equals(claims.sid()))) {
            throw new ApiException(ErrorCode.TOKEN_REVOKED);
        }
        if (authSessions != null && (user.getRole() == Role.ADMIN || user.getRole() == Role.STORE_MANAGER
                || user.getRole() == Role.STAFF) && (storedToken.getSessionId() == null
                || !authSessions.isActive(user.getId(), claims.sid()))) {
            // Existing internal refresh tokens lack an indexed sid: explicitly require re-login on cutover.
            throw new ApiException(ErrorCode.TOKEN_REVOKED);
        }
        if (authSessions != null && storedToken.getSessionId() != null
                && !authSessions.isActive(user.getId(), claims.sid())) {
            throw new ApiException(ErrorCode.TOKEN_REVOKED);
        }

        if (Boolean.TRUE.equals(storedToken.getRevoked())) {
            // Replay attack: token was already revoked!
            throw new ApiException(ErrorCode.TOKEN_REVOKED);
        }

        // Atomic revoke current token
        int updated = refreshTokenRepository.revokeToken(tokenHash);
        if (updated == 0) {
            throw new ApiException(ErrorCode.TOKEN_REVOKED);
        }

        if (sessionRevocationService.isUserRevoked(user.getId(), claims.issuedAt())) {
            throw new ApiException(ErrorCode.TOKEN_REVOKED);
        }

        if (!"ACTIVE".equals(user.getStatus())) {
            throw new ApiException(ErrorCode.ACCOUNT_LOCKED);
        }

        if ((user.getRole() == Role.STAFF || user.getRole() == Role.STORE_MANAGER)
                && (!user.isCurrentBranchAccount() || !Boolean.TRUE.equals(user.getEmailVerified()))) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }

        // Issue new access and refresh tokens with new JTI, same session ID
        String sid = claims.sid() != null ? claims.sid() : UUID.randomUUID().toString();
        String newAccessToken = jwtIssuer.issueAccessToken(user.getId(), user.getRole(), user.getStoreId(), sid);
        String newRefreshToken = jwtIssuer.issueRefreshToken(user.getId(), sid, UUID.randomUUID().toString());

        Instant newExpiry = Instant.now().plus(authProperties.refreshTtl());
        if (authSessions != null && storedToken.getSessionId() != null) {
            authSessions.requireActiveAndTouch(user.getId(), sid, newExpiry);
        }
        saveRefreshToken(user.getId(), newRefreshToken, newExpiry, storedToken.getSessionId());

        return new RotateResult(newAccessToken, newRefreshToken, user);
    }

    @Transactional
    public void revokeSession(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        JwtIssuer.RefreshTokenClaims claims = jwtIssuer.verifyAndParseRefreshToken(rawRefreshToken);
        String tokenHash = hash(rawRefreshToken);
        User user = userRepository.findByIdForUpdate(claims.userId())
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHENTICATED));
        RefreshToken stored = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ApiException(ErrorCode.TOKEN_REVOKED));
        if (!user.getId().equals(stored.getUserId()) || (stored.getSessionId() != null
                && !stored.getSessionId().equals(claims.sid()))) throw new ApiException(ErrorCode.TOKEN_REVOKED);
        if (authSessions != null && stored.getSessionId() != null) {
            authSessions.revoke(user.getId(), claims.sid(), user.getId(), "LOGOUT");
        } else {
            sessionRevocationService.revokeSession(claims.sid(),
                    authProperties.refreshTtl().plus(authProperties.accessTtl()).plusMinutes(1));
        }
        refreshTokenRepository.revokeToken(tokenHash);
    }

    @Transactional
    public void revokeAllForUser(Long userId) {
        if (userId == null || userId <= 0) {
            return;
        }
        sessionRevocationService.revokeAllUserSessions(userId, Instant.now(),
                authProperties.refreshTtl().plus(authProperties.accessTtl()).plusMinutes(1));
        if (authSessions != null) authSessions.revokeAll(userId, "ACCOUNT_RESET");
        refreshTokenRepository.revokeAllForUser(userId);
    }

    public static String hash(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    public record RotateResult(String accessToken, String refreshToken, User user) {}
}

