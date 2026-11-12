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
                    "clucky.security.jwt.audience", "clucky-api",
                    "clucky.auth.customer-origins", "http://localhost:3000/",
                    "clucky.auth.admin-origins", "http://localhost:3001/")));
            context.register(WebConfig.class);
            context.refresh();
            WebTestClient client = WebTestClient.bindToApplicationContext(context)
                    .configureClient().baseUrl("http://localhost:8080").build();
            for (String path : new String[]{"/api/auth/logout", "/api/auth/refresh"}) {
                client.post().uri(path).cookie("clucky_customer_refresh", "opaque-refresh-token")
                        .header("X-Clucky-Client", "customer")
                        .header("Origin", "http://localhost:3000").exchange().expectStatus().isOk();
            }
            for (String scope : new String[]{"customer", "admin"}) {
                String origin = "customer".equals(scope) ? "http://localhost:3000" : "http://localhost:3001";
                for (String path : new String[]{"/api/auth/register", "/api/auth/login", "/api/auth/refresh"}) {
                    client.post().uri(path).header("X-Clucky-Client", scope)
                            .cookie("clucky_" + scope + "_access", "expired-token")
                            .header("Origin", origin).exchange().expectStatus().isOk();
                    client.post().uri(path).header("X-Clucky-Client", scope)
                            .cookie("clucky_" + scope + "_access", "expired-token")
                            .header("Referer", origin + "/login").exchange().expectStatus().isOk();
                    client.post().uri(path).header("X-Clucky-Client", scope)
                            .exchange().expectStatus().isForbidden();
                    client.post().uri(path).header("X-Clucky-Client", scope)
                            .header("Referer", "https://evil.example/login").exchange().expectStatus().isForbidden();
                    client.post().uri(path).header("X-Clucky-Client", scope)
                            .header("Origin", "null").header("Referer", origin + "/login")
                            .exchange().expectStatus().isForbidden();
                }
            }
            client.get().uri("/api/orders").exchange().expectStatus().isUnauthorized();
            client.get().uri("/api/orders").header("Origin", "http://localhost:3000")
                    .header("X-Clucky-Client", "customer").cookie("clucky_customer_access", "expired-token")
                    .exchange().expectStatus().isUnauthorized()
                    .expectHeader().valueEquals("Access-Control-Allow-Origin", "http://localhost:3000")
                    .expectHeader().valueEquals("Access-Control-Allow-Credentials", "true");
            client.options().uri("/api/orders").header("Origin", "http://localhost:3001")
                    .header("Access-Control-Request-Method", "POST")
                    .header("Access-Control-Request-Headers", "X-Clucky-Client,Content-Type")
                    .exchange().expectStatus().isOk();
            client.post().uri("/api/auth/logout").header("Origin", "https://evil.example")
                    .header("X-Clucky-Client", "customer").exchange().expectStatus().isForbidden();
            client.post().uri("/api/auth/refresh").header("Origin", "http://localhost:3000")
                    .header("X-Clucky-Client", "admin").exchange().expectStatus().isForbidden();
            client.post().uri("/api/cart/items").header("X-Clucky-Client", "customer")
                    .cookie("clucky_customer_access", "token").exchange().expectStatus().isForbidden();
            client.post().uri("/api/payments/webhook/sepay").header("Authorization", "Apikey test-key")
                    .header("X-Clucky-Client", "admin").cookie("clucky_admin_access", "not-a-jwt")
                    .exchange().expectStatus().isOk().expectBody(String.class).isEqualTo("Apikey test-key");
            client.get().uri("/api/payments/transactions").header("Authorization", "Apikey test-key")
                    .exchange().expectStatus().isUnauthorized();
            client.post().uri("/api/payments/webhook/casso").header("Authorization", "Apikey test-key")
                    .exchange().expectStatus().isUnauthorized();
            client.options().uri("/api/payments/bank-config").header("Origin", "http://localhost:3001")
                    .header("Access-Control-Request-Method", "POST")
                    .header("Access-Control-Request-Headers", "X-Clucky-Client,Content-Type,Idempotency-Key")
                    .exchange().expectStatus().isOk();
        }
    }

    @Configuration(proxyBeanMethods = false)
    @EnableWebFlux
    @EnableWebFluxSecurity
    @Import({SecurityConfig.class, BrowserSessionConfig.class})
    static class WebConfig {
        @Bean
        ReactiveStringRedisTemplate redis() { return mock(ReactiveStringRedisTemplate.class); }

        @Bean
        ObjectMapper mapper() { return new ObjectMapper().findAndRegisterModules(); }

        @Bean
        RouterFunction<ServerResponse> routes() {
            return RouterFunctions.route().POST("/api/auth/logout", request -> ServerResponse.ok().build())
                    .POST("/api/auth/register", request -> ServerResponse.ok().build())
                    .POST("/api/auth/login", request -> ServerResponse.ok().build())
                    .POST("/api/auth/refresh", request -> ServerResponse.ok().build())
                    .POST("/api/payments/webhook/sepay", request -> ServerResponse.ok().bodyValue(request.headers().firstHeader("Authorization")))
                    .GET("/api/orders", request -> ServerResponse.ok().build()).build();
        }
    }
}
