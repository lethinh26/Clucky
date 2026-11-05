package com.clucky.apigateway.config;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import reactor.core.publisher.Mono;

/** INT-53: the gateway must strip forged identity headers and re-inject verified claims. */
class IdentityHeaderPropagationFilterTest {

    private final IdentityHeaderPropagationFilter filter = new IdentityHeaderPropagationFilter();

    @Test
    void stripsClientSuppliedIdentityHeadersWhenUnauthenticated() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                .get("/api/users/me")
                .header("X-User-Id", "999")
                .header("X-User-Role", "ADMIN")
                .header("X-Store-Id", "42"));
        AtomicReference<org.springframework.web.server.ServerWebExchange> forwarded = new AtomicReference<>();

        filter.filter(exchange, next -> {
            forwarded.set(next);
            return Mono.empty();
        }).block();

        var headers = forwarded.get().getRequest().getHeaders();
        assertNull(headers.getFirst("X-User-Id"), "Forged user id must be stripped");
        assertNull(headers.getFirst("X-User-Role"), "Forged role must be stripped");
        assertNull(headers.getFirst("X-Store-Id"), "Forged store id must be stripped");
    }

    @Test
    void injectsClaimsFromVerifiedJwt() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                .get("/api/users/me")
                .header("X-User-Id", "999")
                .header("X-User-Role", "ADMIN")
                .header("X-Store-Id", "42"));
        AtomicReference<org.springframework.web.server.ServerWebExchange> forwarded = new AtomicReference<>();

        filter.filter(exchange, next -> {
            forwarded.set(next);
            return Mono.empty();
        }).contextWrite(ReactiveSecurityContextHolder.withSecurityContext(
                Mono.just(securityContext(7L, "CUSTOMER", null)))).block();

        var headers = forwarded.get().getRequest().getHeaders();
        assertEquals("7", headers.getFirst("X-User-Id"),
                "Header must come from the verified token, never the client");
        assertEquals("CUSTOMER", headers.getFirst("X-User-Role"));
        assertNull(headers.getFirst("X-Store-Id"), "A customer has no store scope");
    }

    @Test
    void propagatesStoreScopeForStaff() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/orders"));
        AtomicReference<org.springframework.web.server.ServerWebExchange> forwarded = new AtomicReference<>();

        filter.filter(exchange, next -> {
            forwarded.set(next);
            return Mono.empty();
        }).contextWrite(ReactiveSecurityContextHolder.withSecurityContext(
                Mono.just(securityContext(11L, "STAFF", 3L)))).block();

        var headers = forwarded.get().getRequest().getHeaders();
        assertEquals("11", headers.getFirst("X-User-Id"));
        assertEquals("STAFF", headers.getFirst("X-User-Role"));
        assertEquals("3", headers.getFirst("X-Store-Id"));
    }

    private SecurityContextImpl securityContext(Long userId, String role, Long storeId) {
        Jwt.Builder builder = Jwt.withTokenValue("token")
                .header("alg", "HS256")
                .subject(String.valueOf(userId))
                .claim("role", role)
                .claim("sid", "session-1")
                .claim("typ", "access")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(60));
        if (storeId != null) {
            builder = builder.claim("storeId", storeId);
        }
        Jwt jwt = builder.build();
        var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
        return new SecurityContextImpl(new JwtAuthenticationToken(jwt, authorities, jwt.getSubject()));
    }

}
