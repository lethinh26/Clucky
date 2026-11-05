package com.clucky.identityservice.security;

import static org.junit.jupiter.api.Assertions.*;

import com.clucky.identityservice.config.AuthProperties;
import com.clucky.identityservice.config.JwtSettings;
import com.clucky.identityservice.dto.Role;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;

class JwtIssuerTest {
    private static final String SECRET = "unit-test-secret-value-at-least-32-bytes-long";

    private JwtIssuer issuer() {
        return new JwtIssuer(new JwtSettings(SECRET, "clucky-identity", "clucky-api"),
                new AuthProperties(Duration.ofMinutes(30), Duration.ofDays(7), Duration.ofMinutes(5),
                        new AuthProperties.Cookie(false), List.of("http://localhost:3000")));
    }

    @Test
    void accessTokenCarriesRoleStoreAndSessionClaims() throws Exception {
        String token = issuer().issueAccessToken(42L, Role.STORE_MANAGER, 11L, "sid-abc");
        var claims = com.nimbusds.jwt.SignedJWT.parse(token).getJWTClaimsSet();

        assertEquals("42", claims.getSubject());
        assertEquals("STORE_MANAGER", claims.getClaim("role"));
        assertEquals(11L, ((Number) claims.getClaim("storeId")).longValue());
        assertEquals("sid-abc", claims.getClaim("sid"));
        assertEquals("access", claims.getClaim("typ"));
        assertEquals("clucky-identity", claims.getIssuer());
        assertTrue(claims.getAudience().contains("clucky-api"));
    }

    @Test
    void accessTokenLifetimeFollowsConfiguredValue() throws Exception {
        String token = issuer().issueAccessToken(1L, Role.CUSTOMER, null, "sid");
        var claims = com.nimbusds.jwt.SignedJWT.parse(token).getJWTClaimsSet();
        long seconds = Duration.between(claims.getIssueTime().toInstant(),
                claims.getExpirationTime().toInstant()).toSeconds();
        assertEquals(30 * 60, seconds, "Access token lifetime must come from configuration");
    }

    @Test
    void refreshTokenIsPurposeTaggedAndExpiresInSevenDays() throws Exception {
        String token = issuer().issueRefreshToken(7L, "sid-refresh", "jti-1");
        var claims = com.nimbusds.jwt.SignedJWT.parse(token).getJWTClaimsSet();

        assertEquals("refresh", claims.getClaim("typ"));
        assertEquals("jti-1", claims.getJWTID());
        assertEquals("sid-refresh", claims.getClaim("sid"));
        assertEquals(7 * 24 * 3600, Duration.between(claims.getIssueTime().toInstant(),
                claims.getExpirationTime().toInstant()).toSeconds());
    }

    @Test
    void refreshTokenCannotBeReinterpretedAsRefreshWhenSignedWithAccessPurpose() {
        ApiException failure = assertThrows(ApiException.class,
                () -> issuer().verifyAndParseRefreshToken(issuer().issueAccessToken(1L, Role.CUSTOMER, null, "sid")));
        assertEquals(ErrorCode.UNAUTHENTICATED, failure.getCode());
    }

    @Test
    void tamperedRefreshTokenIsRejected() {
        String token = issuer().issueRefreshToken(1L, "sid", "jti");
        String tampered = token.substring(0, token.length() - 3) + "abc";
        assertThrows(ApiException.class, () -> issuer().verifyAndParseRefreshToken(tampered));
    }

    @Test
    void expiredRefreshTokenIsRejected() throws Exception {
        var original = com.nimbusds.jwt.SignedJWT.parse(issuer().issueRefreshToken(1L, "sid", "jti"));
        var claims = new com.nimbusds.jwt.JWTClaimsSet.Builder(original.getJWTClaimsSet())
                .issueTime(java.util.Date.from(java.time.Instant.now().minusSeconds(120)))
                .expirationTime(java.util.Date.from(java.time.Instant.now().minusSeconds(60))).build();
        var expired = new com.nimbusds.jwt.SignedJWT(original.getHeader(), claims);
        expired.sign(new com.nimbusds.jose.crypto.MACSigner(SECRET));
        assertThrows(ApiException.class, () -> issuer().verifyAndParseRefreshToken(expired.serialize()));
    }

    @Test
    void weakSecretIsRefused() {
        assertThrows(IllegalStateException.class, () -> new JwtIssuer(
                new JwtSettings("short", "clucky-identity", "clucky-api"),
                new AuthProperties(null, null, null, null, List.of())));
    }

    @Test
    void refreshParsingReturnsSessionAndExpiry() {
        JwtIssuer issuer = issuer();
        var claims = issuer.verifyAndParseRefreshToken(issuer.issueRefreshToken(99L, "sid-99", "jti-99"));
        assertEquals(99L, claims.userId());
        assertEquals("sid-99", claims.sid());
        assertEquals("jti-99", claims.jti());
        assertTrue(claims.expiresAt().isAfter(java.time.Instant.now()));
    }
}

