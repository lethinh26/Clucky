package com.clucky.paymentservice.config;

import com.clucky.paymentservice.dto.ApiError;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Collections;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration(proxyBeanMethods = false)
public class SepayWebhookSecurity {
    public static final String PATH = "/api/payments/webhook/sepay";
    public static final int MAX_BODY_BYTES = 32768;

    @Bean
    @Order(1)
    SecurityFilterChain sepaySecurity(HttpSecurity http, ObjectMapper mapper,
            @Value("${payment.sepay.api-key:}") String key) throws Exception {
        return http.securityMatcher(new AntPathRequestMatcher(PATH, "POST"))
                .csrf(csrf -> csrf.disable()).httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable()).logout(logout -> logout.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(cache -> cache.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .addFilterBefore(new ApiKeyFilter(key, mapper), AuthorizationFilter.class).build();
    }

    static final class ApiKeyFilter extends OncePerRequestFilter {
        private final byte[] expected;
        private final ObjectMapper mapper;

        ApiKeyFilter(String key, ObjectMapper mapper) {
            this.expected = key.isBlank() ? null : ("Apikey " + key).getBytes(StandardCharsets.UTF_8);
            this.mapper = mapper;
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
                throws ServletException, IOException {
            var headers = Collections.list(request.getHeaders("Authorization"));
            HttpStatus failure = null;
            if (expected == null) failure = HttpStatus.SERVICE_UNAVAILABLE;
            else if (headers.size() != 1 || !MessageDigest.isEqual(expected, headers.getFirst().getBytes(StandardCharsets.UTF_8))) {
                failure = HttpStatus.UNAUTHORIZED;
            } else if (request.getContentLengthLong() > MAX_BODY_BYTES) failure = HttpStatus.PAYLOAD_TOO_LARGE;
            if (failure == null) { chain.doFilter(request, response); return; }
            ApiError error = ApiError.of(failure, request.getRequestURI());
            request.setAttribute(CorrelationIdFilter.ERROR_CODE, error.code());
            response.setStatus(error.status());
            response.setContentType("application/json");
            if (failure == HttpStatus.UNAUTHORIZED) response.setHeader("WWW-Authenticate", "Apikey");
            mapper.writeValue(response.getOutputStream(), error);
        }
    }
}
