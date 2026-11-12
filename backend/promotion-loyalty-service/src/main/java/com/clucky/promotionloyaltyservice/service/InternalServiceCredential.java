package com.clucky.promotionloyaltyservice.service;

import com.clucky.promotionloyaltyservice.config.JwtSettings;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Component;

@Component
public class InternalServiceCredential {
    private final JwtSettings settings;
    private final JwtEncoder encoder;

    public InternalServiceCredential(JwtSettings settings) {
        this.settings = settings;
        this.encoder = new NimbusJwtEncoder(new ImmutableSecret<>(settings.secret().getBytes(StandardCharsets.UTF_8)));
    }

    public String token() {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer(settings.issuer()).audience(List.of(settings.audience()))
                .subject(Long.toString(Long.MAX_VALUE - 1)).issuedAt(now).expiresAt(now.plusSeconds(60))
                .claim("role", "INTERNAL_SERVICE").claim("typ", "access")
                .claim("service", "promotion-loyalty-service")
                .claim("sid", "promotion-loyalty-service:" + UUID.randomUUID()).build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }
}
