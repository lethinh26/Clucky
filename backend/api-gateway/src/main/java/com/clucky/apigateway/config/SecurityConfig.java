package com.clucky.apigateway.config;

import com.clucky.apigateway.dto.ApiError;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.List;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverterAdapter;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.context.NoOpServerSecurityContextRepository;
import org.springframework.security.web.server.savedrequest.NoOpServerRequestCache;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(JwtSettings.class)
public class SecurityConfig {
    @Bean
    ReactiveJwtDecoder jwtDecoder(JwtSettings settings) {
        byte[] key = settings.secret() == null ? new byte[0] : settings.secret().getBytes(StandardCharsets.UTF_8);
        if (key.length < 32 || settings.secret().startsWith("change-") || settings.secret().contains("replace-")) {
            throw new IllegalStateException("Configure a strong JWT_SECRET with at least 32 bytes");
        }
        NimbusReactiveJwtDecoder decoder = NimbusReactiveJwtDecoder
                .withSecretKey(new SecretKeySpec(key, "HmacSHA256")).macAlgorithm(MacAlgorithm.HS256).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(settings.issuer()), new AccessTokenValidator(settings.audience())));
        return decoder;
    }

    @Bean
    SecurityWebFilterChain securityFilterChain(ServerHttpSecurity http, ObjectMapper mapper) {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(token -> List.of(
                new SimpleGrantedAuthority("ROLE_" + token.getClaimAsString("role"))));
        return http.csrf(csrf -> csrf.disable())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .logout(logout -> logout.disable())
                .securityContextRepository(NoOpServerSecurityContextRepository.getInstance())
                .requestCache(cache -> cache.requestCache(NoOpServerRequestCache.getInstance()))
                .authorizeExchange(auth -> auth
                        .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .pathMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        .pathMatchers(HttpMethod.GET, "/api/stores", "/api/stores/{id}",
                                "/api/catalog/categories", "/api/catalog/products", "/api/catalog/products/{id}",
                                "/api/catalog/combos", "/api/promotions/banners", "/api/reviews/products/{id}").permitAll()
                        .pathMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/verify-otp",
                                "/api/auth/login", "/api/auth/refresh", "/api/auth/forgot-password",
                                "/api/auth/reset-password", "/api/auth/google", "/api/auth/google/complete").permitAll()
                        .pathMatchers("/internal/**", "/api/payments/webhook/**").denyAll()
                        .anyExchange().authenticated())
                .oauth2ResourceServer(resource -> resource.jwt(jwt -> jwt.jwtAuthenticationConverter(
                                new ReactiveJwtAuthenticationConverterAdapter(converter)))
                        .authenticationEntryPoint((exchange, failure) -> error(exchange, mapper,
                                HttpStatus.UNAUTHORIZED))
                        .accessDeniedHandler((exchange, failure) -> error(exchange, mapper,
                                HttpStatus.FORBIDDEN)))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((exchange, failure) -> error(exchange, mapper,
                                HttpStatus.UNAUTHORIZED))
                        .accessDeniedHandler((exchange, failure) -> error(exchange, mapper,
                                HttpStatus.FORBIDDEN)))
                .build();
    }

    private Mono<Void> error(ServerWebExchange exchange, ObjectMapper mapper, HttpStatus status) {
        exchange.getResponse().setStatusCode(status);
        if (status == HttpStatus.UNAUTHORIZED) {
            exchange.getResponse().getHeaders().set("WWW-Authenticate", "Bearer");
        }
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        try {
            byte[] body = mapper.writeValueAsBytes(ApiError.of(status, exchange.getRequest().getPath().value()));
            return exchange.getResponse().writeWith(Mono.just(exchange.getResponse().bufferFactory().wrap(body)));
        } catch (JsonProcessingException failure) {
            return Mono.error(failure);
        }
    }
}
