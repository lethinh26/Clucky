package com.clucky.notificationservice.config;

import com.clucky.notificationservice.dto.ApiError;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.List;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;

@Configuration(proxyBeanMethods = false)
@EnableMethodSecurity
@EnableConfigurationProperties(JwtSettings.class)
public class SecurityConfig {
    @Bean
    JwtDecoder jwtDecoder(JwtSettings settings) {
        byte[] key = settings.secret() == null ? new byte[0] : settings.secret().getBytes(StandardCharsets.UTF_8);
        if (key.length < 32 || settings.secret().startsWith("change-") || settings.secret().contains("replace-")) {
            throw new IllegalStateException("Configure a strong JWT_SECRET with at least 32 bytes");
        }
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(new SecretKeySpec(key, "HmacSHA256"))
                .macAlgorithm(MacAlgorithm.HS256).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(settings.issuer()), new AccessTokenValidator(settings.audience())));
        return decoder;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectMapper mapper,
            @Value("${springdoc.api-docs.enabled:false}") boolean docsEnabled) throws Exception {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(token -> List.of(
                new SimpleGrantedAuthority("ROLE_" + token.getClaimAsString("role"))));
        AuthenticationEntryPoint unauthorized = (request, response, failure) -> {
            response.setStatus(401);
            response.setHeader("WWW-Authenticate", "Bearer");
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            mapper.writeValue(response.getOutputStream(), ApiError.of(HttpStatus.UNAUTHORIZED, request.getRequestURI()));
        };
        AccessDeniedHandler forbidden = (request, response, failure) -> {
            response.setStatus(403);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            mapper.writeValue(response.getOutputStream(), ApiError.of(HttpStatus.FORBIDDEN, request.getRequestURI()));
        };
        http.csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(cache -> cache.disable())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .logout(logout -> logout.disable())
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers("/actuator/health", "/actuator/health/**").permitAll();
                    if (docsEnabled) {
                        auth.requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll();
                    }
                    auth.requestMatchers(HttpMethod.GET, "/api/stores", "/api/stores/{id}",
                            "/api/catalog/categories", "/api/catalog/products", "/api/catalog/products/{id}",
                            "/api/catalog/combos", "/api/promotions/banners", "/api/reviews/products/{id}").permitAll();
                    auth.requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/verify-otp",
                            "/api/auth/login", "/api/auth/refresh", "/api/auth/forgot-password",
                            "/api/auth/reset-password", "/api/auth/google", "/api/auth/google/complete").permitAll();
                    auth.requestMatchers("/internal/**", "/api/payments/webhook/**").denyAll();
                    auth.anyRequest().authenticated();
                })
                .oauth2ResourceServer(resource -> resource.jwt(jwt -> jwt.jwtAuthenticationConverter(converter))
                        .authenticationEntryPoint(unauthorized).accessDeniedHandler(forbidden))
                .exceptionHandling(errors -> errors.authenticationEntryPoint(unauthorized).accessDeniedHandler(forbidden));
        return http.build();
    }
}
