package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.config.JwtSettings;
import java.nio.charset.StandardCharsets;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import static org.junit.jupiter.api.Assertions.*;

class InternalServiceCredentialTest {
    @Test void existingJwtConfigurationIssuesFreshShortLivedServiceTokens() {
        String secret = "test-only-secret-with-at-least-32-characters";
        var settings = new JwtSettings(secret, "test-issuer", "test-audience");
        var credential = new InternalServiceCredential(settings);
        var decoder = NimbusJwtDecoder.withSecretKey(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"))
                .macAlgorithm(MacAlgorithm.HS256).build();
        var token = decoder.decode(credential.token());
        assertEquals("INTERNAL_SERVICE", token.getClaimAsString("role"));
        assertEquals(Long.toString(Long.MAX_VALUE), token.getSubject());
        assertTrue(token.getAudience().contains("test-audience"));
        assertEquals(60, token.getExpiresAt().getEpochSecond() - token.getIssuedAt().getEpochSecond());
        assertFalse(token.getClaimAsString("sid").isBlank());
        assertEquals("cart-order-service", token.getClaimAsString("service"));
        assertEquals("access", token.getClaimAsString("typ"));
        assertEquals("test-issuer", token.getClaimAsString("iss"));
        assertNotEquals(token.getClaimAsString("sid"), decoder.decode(credential.token()).getClaimAsString("sid"));
    }
}
