package com.clucky.identityservice.security;

import com.clucky.identityservice.config.AuthProperties;
import com.clucky.identityservice.config.JwtSettings;
import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSSigner;
import com.nimbusds.jose.JWSVerifier;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Component
public class JwtIssuer {
    private final JwtSettings jwtSettings;
    private final AuthProperties authProperties;
    private final byte[] secretKey;

    public JwtIssuer(JwtSettings jwtSettings, AuthProperties authProperties) {
        this.jwtSettings = jwtSettings;
        this.authProperties = authProperties;
        this.secretKey = jwtSettings.secret() == null ? new byte[0] : jwtSettings.secret().getBytes(StandardCharsets.UTF_8);
        if (this.secretKey.length < 32 || jwtSettings.secret().startsWith("change-") || jwtSettings.secret().contains("replace-")) {
            throw new IllegalStateException("Configure a strong JWT_SECRET with at least 32 bytes");
        }
    }

    public String issueAccessToken(Long userId, Role role, Long storeId, String sid) {
        Instant now = Instant.now();
        Instant expiry = now.plus(authProperties.accessTtl());

        JWTClaimsSet.Builder builder = new JWTClaimsSet.Builder()
                .subject(String.valueOf(userId))
                .issuer(jwtSettings.issuer())
                .audience(List.of(jwtSettings.audience()))
                .issueTime(Date.from(now))
                .expirationTime(Date.from(expiry))
                .claim("role", role.name())
                .claim("sid", sid)
                .claim("typ", "access");

        if (storeId != null) {
            builder.claim("storeId", storeId);
        }

        return sign(builder.build());
    }

    public String issueRefreshToken(Long userId, String sid, String jti) {
        Instant now = Instant.now();
        Instant expiry = now.plus(authProperties.refreshTtl());

        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject(String.valueOf(userId))
                .issuer(jwtSettings.issuer())
                .audience(List.of(jwtSettings.audience()))
                .jwtID(jti != null ? jti : UUID.randomUUID().toString())
                .issueTime(Date.from(now))
                .expirationTime(Date.from(expiry))
                .claim("sid", sid)
                .claim("typ", "refresh")
                .build();

        return sign(claims);
    }

    public RefreshTokenClaims verifyAndParseRefreshToken(String token) {
        if (token == null || token.isBlank()) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
        try {
            SignedJWT signedJWT = SignedJWT.parse(token);
            JWSVerifier verifier = new MACVerifier(secretKey);
            if (!signedJWT.verify(verifier)) {
                throw new ApiException(ErrorCode.UNAUTHENTICATED);
            }

            JWTClaimsSet claims = signedJWT.getJWTClaimsSet();

            // Validate purpose
            String typ = (String) claims.getClaim("typ");
            if (!"refresh".equals(typ)) {
                throw new ApiException(ErrorCode.UNAUTHENTICATED);
            }

            // Validate expiration
            Date exp = claims.getExpirationTime();
            if (exp == null || exp.before(new Date())) {
                throw new ApiException(ErrorCode.UNAUTHENTICATED);
            }

            // Validate issuer and audience
            if (!jwtSettings.issuer().equals(claims.getIssuer())
                    || claims.getAudience() == null
                    || !claims.getAudience().contains(jwtSettings.audience())) {
                throw new ApiException(ErrorCode.UNAUTHENTICATED);
            }

            Long userId = Long.parseLong(claims.getSubject());
            String sid = (String) claims.getClaim("sid");
            String jti = claims.getJWTID();
            Instant expiresAt = exp.toInstant();

            return new RefreshTokenClaims(userId, sid, jti, expiresAt);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(ErrorCode.UNAUTHENTICATED);
        }
    }

    private String sign(JWTClaimsSet claims) {
        try {
            JWSSigner signer = new MACSigner(secretKey);
            SignedJWT signedJWT = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
            signedJWT.sign(signer);
            return signedJWT.serialize();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to sign JWT token", e);
        }
    }

    public record RefreshTokenClaims(Long userId, String sid, String jti, Instant expiresAt) {}
}

