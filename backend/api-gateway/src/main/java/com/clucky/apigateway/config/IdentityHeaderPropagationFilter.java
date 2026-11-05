package com.clucky.apigateway.config;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * INT-53: identity header propagation.
 *
 * The Gateway is the only trust boundary: it strips any client-supplied
 * identity headers (X-User-Id, X-User-Role, X-Store-Id) and re-injects the
 * real values from the verified JWT before forwarding downstream. Downstream
 * services must never trust these headers from the outside.
 */
@Component
public class IdentityHeaderPropagationFilter implements GlobalFilter, Ordered {

    public static final String USER_ID_HEADER = "X-User-Id";
    public static final String USER_ROLE_HEADER = "X-User-Role";
    public static final String STORE_ID_HEADER = "X-Store-Id";

    @Override
    public int getOrder() {
        // Run before routing so mutated headers reach the downstream service.
        return -100;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        // 1) Zero-trust: always remove client-supplied identity headers first.
        var mutated = exchange.getRequest().mutate()
                .headers(headers -> {
                    headers.remove(USER_ID_HEADER);
                    headers.remove(USER_ROLE_HEADER);
                    headers.remove(STORE_ID_HEADER);
                })
                .build();

        return ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .filter(auth -> auth instanceof JwtAuthenticationToken jwtAuth && jwtAuth.isAuthenticated())
                .cast(JwtAuthenticationToken.class)
                .map(jwtAuth -> {
                    Jwt jwt = jwtAuth.getToken();
                    String userId = jwt.getSubject();
                    String role = jwt.getClaimAsString("role");
                    Object storeClaim = jwt.getClaims().get("storeId");
                    if (userId == null || role == null) {
                        return exchange.mutate().request(mutated).build();
                    }
                    var request = mutated.mutate()
                            .headers(headers -> {
                                headers.set(USER_ID_HEADER, userId);
                                headers.set(USER_ROLE_HEADER, role);
                                if (storeClaim != null) {
                                    headers.set(STORE_ID_HEADER, String.valueOf(storeClaim));
                                }
                            })
                            .build();
                    return exchange.mutate().request(request).build();
                })
                // Unauthenticated (public) requests proceed with stripped headers only.
                .defaultIfEmpty(exchange.mutate().request(mutated).build())
                .flatMap(chain::filter);
    }
}
