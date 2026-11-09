package com.clucky.promotionloyaltyservice.config;

import com.clucky.promotionloyaltyservice.dto.ApiError;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration(proxyBeanMethods = false)
public class LoyaltyInternalSecurity {
    @Bean
    @Order(1)
    SecurityFilterChain loyaltyInternal(HttpSecurity http, ObjectMapper mapper,
            @Value("${clucky.loyalty.internal-token:}") String token) throws Exception {
        http.securityMatcher("/internal/loyalty/**").csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .requestCache(cache -> cache.disable())
            .authorizeHttpRequests(auth -> auth.anyRequest().access((authentication, context) -> {
                String supplied = context.getRequest().getHeader("X-Loyalty-Service-Token");
                return new AuthorizationDecision(token.length() >= 32 && supplied != null && MessageDigest.isEqual(
                    token.getBytes(StandardCharsets.UTF_8), supplied.getBytes(StandardCharsets.UTF_8)));
            }))
            .exceptionHandling(errors -> errors.authenticationEntryPoint((request, response, failure) -> {
                response.setStatus(401); response.setContentType("application/json");
                mapper.writeValue(response.getOutputStream(), ApiError.of(HttpStatus.UNAUTHORIZED, request.getRequestURI()));
            }));
        return http.build();
    }
}
