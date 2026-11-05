package com.clucky.apigateway.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.core.env.MapPropertySource;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.test.web.reactive.server.WebTestClient;
import org.springframework.web.reactive.config.EnableWebFlux;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.RouterFunctions;
import org.springframework.web.reactive.function.server.ServerResponse;
import reactor.core.publisher.Mono;

class SecurityConfigTest {
    private static final String SECRET = "unit-test-secret-value-at-least-32-bytes-long";

    @Test
    void decoderRejectsRevokedSessionsAndFailsClosed() throws Exception {
        ReactiveStringRedisTemplate redis = mock(ReactiveStringRedisTemplate.class, RETURNS_DEEP_STUBS);
        when(redis.hasKey("auth:revoked:sid:device-a")).thenReturn(Mono.just(false));
        when(redis.opsForValue().get("auth:revoked:user:7")).thenReturn(Mono.empty());
        var decoder = new SecurityConfig().jwtDecoder(new JwtSettings(SECRET, "clucky-identity", "clucky-api"), redis);
        Instant now = Instant.now();
        SignedJWT signed = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), new JWTClaimsSet.Builder()
                .subject("7").issuer("clucky-identity").audience("clucky-api")
                .issueTime(Date.from(now)).expirationTime(Date.from(now.plusSeconds(1800)))
                .claim("role", "CUSTOMER").claim("typ", "access").claim("sid", "device-a").build());
        signed.sign(new MACSigner(SECRET));
        String token = signed.serialize();
        assertNotNull(decoder.decode(token).block());

        when(redis.hasKey("auth:revoked:sid:device-a")).thenReturn(Mono.just(true));
        assertThrows(JwtException.class, () -> decoder.decode(token).block());
        when(redis.hasKey("auth:revoked:sid:device-a")).thenReturn(Mono.just(false));
        when(redis.opsForValue().get("auth:revoked:user:7"))
                .thenReturn(Mono.just(String.valueOf(now.toEpochMilli())));
        assertThrows(JwtException.class, () -> decoder.decode(token).block());
        when(redis.hasKey("auth:revoked:sid:device-a")).thenReturn(Mono.error(new IllegalStateException()));
        assertThrows(JwtException.class, () -> decoder.decode(token).block());
    }

    @Test
    void cookieOnlyLogoutAndRefreshReachIdentityRouteButProtectedRoutesStillRequireBearer() {
        try (var context = new AnnotationConfigApplicationContext()) {
            context.getEnvironment().getPropertySources().addFirst(new MapPropertySource("jwt", Map.of(
                    "clucky.security.jwt.secret", SECRET, "clucky.security.jwt.issuer", "clucky-identity",
                    "clucky.security.jwt.audience", "clucky-api")));
            context.register(WebConfig.class);
            context.refresh();
            WebTestClient client = WebTestClient.bindToApplicationContext(context).build();
            for (String path : new String[]{"/api/auth/logout", "/api/auth/refresh"}) {
                client.post().uri(path).cookie("clucky_refresh_token", "opaque-refresh-token")
                        .header("Origin", "http://localhost:3000").exchange().expectStatus().isOk();
            }
            client.get().uri("/api/orders").exchange().expectStatus().isUnauthorized();
        }
    }

    @Configuration(proxyBeanMethods = false)
    @EnableWebFlux
    @EnableWebFluxSecurity
    @Import(SecurityConfig.class)
    static class WebConfig {
        @Bean
        ReactiveStringRedisTemplate redis() { return mock(ReactiveStringRedisTemplate.class); }

        @Bean
        ObjectMapper mapper() { return new ObjectMapper().findAndRegisterModules(); }

        @Bean
        RouterFunction<ServerResponse> routes() {
            return RouterFunctions.route().POST("/api/auth/logout", request -> ServerResponse.ok().build())
                    .POST("/api/auth/refresh", request -> ServerResponse.ok().build())
                    .GET("/api/orders", request -> ServerResponse.ok().build()).build();
        }
    }
}
