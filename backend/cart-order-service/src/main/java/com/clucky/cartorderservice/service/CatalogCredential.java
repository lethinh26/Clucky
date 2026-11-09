package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.config.JwtSettings;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Component;

@Component
public class CatalogCredential {
    private final String configuredToken;
    private final JwtSettings settings;
    private final JwtEncoder encoder;
    public CatalogCredential(JwtSettings settings, @Value("${clucky.catalog.service-token:}") String configuredToken) {
        this.settings = settings;
        this.configuredToken = configuredToken;
        this.encoder = new NimbusJwtEncoder(new ImmutableSecret<>(settings.secret().getBytes(StandardCharsets.UTF_8)));
    }
    public String token() {
        if (configuredToken != null && !configuredToken.isBlank()) return configuredToken;
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer(settings.issuer()).audience(List.of(settings.audience()))
                .subject(Long.toString(Long.MAX_VALUE)).issuedAt(now).expiresAt(now.plusSeconds(60))
                .claim("role", "INTERNAL_SERVICE").claim("typ", "access")
                .claim("sid", "cart-catalog:" + UUID.randomUUID()).build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }
}
