package com.clucky.apigateway.config;

import com.clucky.apigateway.dto.ApiError;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;
import org.springframework.web.server.WebFilter;

@Configuration(proxyBeanMethods = false)
public class BrowserSessionConfig {
    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS");
    private final List<String> customerOrigins;
    private final List<String> adminOrigins;

    public BrowserSessionConfig(
            @Value("${clucky.auth.customer-origins}") List<String> customerOrigins,
            @Value("${clucky.auth.admin-origins}") List<String> adminOrigins) {
        this.customerOrigins = customerOrigins.stream().map(BrowserSessionConfig::normalizeOrigin).toList();
        this.adminOrigins = adminOrigins.stream().map(BrowserSessionConfig::normalizeOrigin).toList();
    }

    @Bean
    @Order(-300)
    CorsWebFilter browserCorsFilter() {
        CorsConfiguration cors = new CorsConfiguration();
        customerOrigins.forEach(cors::addAllowedOrigin);
        adminOrigins.forEach(cors::addAllowedOrigin);
        cors.setAllowCredentials(true);
        cors.setAllowedMethods(List.of("GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Content-Type", "Authorization", "Accept-Language",
                "X-Clucky-Client", "X-Guest-Session-Id", "X-Session-Id", "X-Correlation-ID", "Idempotency-Key"));
        cors.setExposedHeaders(List.of("X-Correlation-ID", "X-Guest-Session-Id"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", cors);
        return new CorsWebFilter(source);
    }

    @Bean
    @Order(-200)
    WebFilter browserSessionFilter(ObjectMapper mapper) {
        return (exchange, chain) -> {
            var request = exchange.getRequest();
            String path = request.getPath().value();
            if (!path.startsWith("/api/")) return chain.filter(exchange);
            exchange.getResponse().getHeaders().setCacheControl("no-store");
            if ("POST".equals(request.getMethod().name()) && "/api/payments/webhook/sepay".equals(path)) {
                var forwarded = request.mutate().headers(headers -> {
                    headers.remove(HttpHeaders.COOKIE);
                    headers.remove("X-Clucky-Client");
                }).build();
                return chain.filter(exchange.mutate().request(forwarded).build());
            }
            String client = request.getHeaders().getFirst("X-Clucky-Client");
            boolean admin = "admin".equals(client);
            String cookieName = admin ? "clucky_admin_access" : "clucky_customer_access";
            var cookie = request.getCookies().getFirst(cookieName);
            boolean authMutation = path.startsWith("/api/auth/")
                    && !SAFE_METHODS.contains(request.getMethod().name());
            boolean cookieMutation = !SAFE_METHODS.contains(request.getMethod().name())
                    && request.getCookies().keySet().stream().anyMatch(name -> name.startsWith("clucky_"));
            String origin = request.getHeaders().getOrigin();
            if (origin == null) origin = refererOrigin(request.getHeaders().getFirst(HttpHeaders.REFERER));
            boolean invalidClient = client != null && !Set.of("customer", "admin").contains(client);
            boolean invalidOrigin = origin == null || !(admin ? adminOrigins : customerOrigins).contains(normalizeOrigin(origin));
            if (invalidClient || ((authMutation || cookieMutation || (client != null && origin != null))
                    && invalidOrigin)) {
                exchange.getAttributes().put(CorrelationIdFilter.ERROR_CODE, "FORBIDDEN");
                exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
                exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
                byte[] body;
                try {
                    body = mapper.writeValueAsBytes(ApiError.of(HttpStatus.FORBIDDEN, path));
                } catch (java.io.IOException failure) {
                    return reactor.core.publisher.Mono.error(failure);
                }
                return exchange.getResponse().writeWith(reactor.core.publisher.Mono.just(
                        exchange.getResponse().bufferFactory().wrap(body)));
            }
            var forwarded = request.mutate().headers(headers -> {
                if (authMutation || client != null) headers.remove(HttpHeaders.AUTHORIZATION);
                if (!authMutation && client != null && cookie != null) headers.setBearerAuth(cookie.getValue());
                if (!path.startsWith("/api/auth/")) headers.remove(HttpHeaders.COOKIE);
            }).build();
            return chain.filter(exchange.mutate().request(forwarded).build());
        };
    }

    private static String normalizeOrigin(String origin) {
        return origin.strip().toLowerCase(Locale.ROOT).replaceAll("/+$", "");
    }

    private static String refererOrigin(String referer) {
        if (referer == null) return null;
        try {
            URI uri = URI.create(referer);
            if (uri.getHost() == null || uri.getUserInfo() != null
                    || !("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))) {
                return null;
            }
            return uri.getScheme() + "://" + uri.getRawAuthority();
        } catch (IllegalArgumentException failure) {
            return null;
        }
    }
}
