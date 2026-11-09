package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.config.JwtSettings;
import java.nio.charset.StandardCharsets;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import static org.junit.jupiter.api.Assertions.*;

class CatalogCredentialTest {
    @Test void blankConfigurationUsesASignedShortLivedServiceIdentity() {
        String secret = "test-only-secret-with-at-least-32-characters";
        var settings = new JwtSettings(secret, "test-issuer", "test-audience");
        var credential = new CatalogCredential(settings, "");
        var decoder = NimbusJwtDecoder.withSecretKey(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"))
                .macAlgorithm(MacAlgorithm.HS256).build();
        var token = decoder.decode(credential.token());
        assertEquals("INTERNAL_SERVICE", token.getClaimAsString("role"));
        assertEquals(Long.toString(Long.MAX_VALUE), token.getSubject());
        assertTrue(token.getAudience().contains("test-audience"));
        assertEquals(60, token.getExpiresAt().getEpochSecond() - token.getIssuedAt().getEpochSecond());
        assertFalse(token.getClaimAsString("sid").isBlank());
        assertEquals("configured-credential", new CatalogCredential(settings, "configured-credential").token());
    }
}
