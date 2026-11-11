package com.clucky.identityservice.service;

import com.clucky.identityservice.config.AuthProperties;
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
        String tokenHash = hash(rawRefreshToken);
        RefreshToken entity = new RefreshToken();
        entity.setUserId(userId);
        entity.setTokenHash(tokenHash);
        entity.setExpiresAt(expiresAt);
        entity.setRevoked(false);
        entity.setCreatedAt(Instant.now());
        refreshTokenRepository.save(entity);
    }

    @Transactional
    public RotateResult rotate(String rawRefreshToken) {
        JwtIssuer.RefreshTokenClaims claims = jwtIssuer.verifyAndParseRefreshToken(rawRefreshToken);

        if (sessionRevocationService.isSessionRevoked(claims.sid())
                || sessionRevocationService.isUserRevoked(claims.userId(), claims.issuedAt())) {
            throw new ApiException(ErrorCode.TOKEN_REVOKED);
        }

        String tokenHash = hash(rawRefreshToken);
        RefreshToken storedToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ApiException(ErrorCode.TOKEN_REVOKED));

        if (Boolean.TRUE.equals(storedToken.getRevoked())) {
            // Replay attack: token was already revoked!
            throw new ApiException(ErrorCode.TOKEN_REVOKED);
        }

        // Atomic revoke current token
        int updated = refreshTokenRepository.revokeToken(tokenHash);
        if (updated == 0) {
            throw new ApiException(ErrorCode.TOKEN_REVOKED);
        }

        User user = userRepository.findById(claims.userId())
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHENTICATED));

        if (!"ACTIVE".equals(user.getStatus())) {
            throw new ApiException(ErrorCode.ACCOUNT_LOCKED);
        }

        // Issue new access and refresh tokens with new JTI, same session ID
        String sid = claims.sid() != null ? claims.sid() : UUID.randomUUID().toString();
        String newAccessToken = jwtIssuer.issueAccessToken(user.getId(), user.getRole(), user.getStoreId(), sid);
        String newRefreshToken = jwtIssuer.issueRefreshToken(user.getId(), sid, UUID.randomUUID().toString());

        Instant newExpiry = Instant.now().plus(authProperties.refreshTtl());
        saveRefreshToken(user.getId(), newRefreshToken, newExpiry);

        return new RotateResult(newAccessToken, newRefreshToken, user);
    }

    @Transactional
    public void revokeSession(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        JwtIssuer.RefreshTokenClaims claims = jwtIssuer.verifyAndParseRefreshToken(rawRefreshToken);
        String tokenHash = hash(rawRefreshToken);
        refreshTokenRepository.revokeToken(tokenHash);
        sessionRevocationService.revokeSession(claims.sid(),
                authProperties.refreshTtl().plus(authProperties.accessTtl()).plusMinutes(1));
    }

    @Transactional
    public void revokeAllForUser(Long userId) {
        revokeAllForUser(userId, Instant.now(), false);
    }

    /** Lock revocation preserves the cutoff after unlock so old credentials cannot revive. */
    public void revokeAllForUser(Long userId, Instant revokedAt, boolean locked) {
        if (userId == null || userId <= 0) return;
        refreshTokenRepository.revokeAllForUser(userId);
        Duration ttl = authProperties.refreshTtl().plus(authProperties.accessTtl()).plusMinutes(1);
        sessionRevocationService.revokeAllUserSessions(userId, revokedAt, ttl);
        if (locked) sessionRevocationService.markUserLocked(userId, ttl);
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
