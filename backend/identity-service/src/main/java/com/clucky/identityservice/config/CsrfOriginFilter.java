package com.clucky.identityservice.config;

import com.clucky.identityservice.dto.ApiError;
import com.clucky.identityservice.exception.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * CSRF defence for the cookie-authenticated auth endpoints.
 *
 * <p>The refresh credential travels in an HttpOnly cookie (BLOCKER 7). Spring Security CSRF tokens are
 * disabled because the API is otherwise stateless, so every state-changing request that may carry the
 * refresh cookie is validated against an explicit allow-list of frontend origins. A request without an
 * Origin/Referer, or from an unlisted origin, is rejected — a cross-site form post cannot forge these
 * headers.
 */
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
@Component
public class CsrfOriginFilter extends OncePerRequestFilter {
    private static final Set<String> PROTECTED_PATHS = Set.of(
            "/api/auth/refresh", "/api/auth/logout", "/api/auth/reset-password",
            "/api/auth/login", "/api/auth/verify-otp");

    private final List<String> allowedOrigins;
    private final ObjectMapper mapper;

    public CsrfOriginFilter(AuthProperties authProperties, ObjectMapper mapper) {
        this.allowedOrigins = authProperties.allowedOrigins().stream()
                .map(origin -> origin.toLowerCase(Locale.ROOT).replaceAll("/+$", ""))
                .toList();
        this.mapper = mapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equalsIgnoreCase(request.getMethod())
                || !PROTECTED_PATHS.contains(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        String origin = request.getHeader(HttpHeaders.ORIGIN);
        String candidate = origin != null ? origin : refererOrigin(request.getHeader(HttpHeaders.REFERER));
        boolean sameOrigin = candidate != null && candidate.equalsIgnoreCase(
                request.getScheme() + "://" + request.getServerName()
                        + (isDefaultPort(request) ? "" : ":" + request.getServerPort()));

        if (candidate == null || (!sameOrigin && !allowedOrigins.contains(normalize(candidate)))) {
            request.setAttribute(CorrelationIdFilter.ERROR_CODE, ErrorCode.FORBIDDEN.name());
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            mapper.writeValue(response.getOutputStream(),
                    ApiError.of(ErrorCode.FORBIDDEN, request.getRequestURI()));
            return;
        }
        chain.doFilter(request, response);
    }

    private String normalize(String value) {
        return value.toLowerCase(Locale.ROOT).replaceAll("/+$", "");
    }

    private boolean isDefaultPort(HttpServletRequest request) {
        int port = request.getServerPort();
        return ("http".equals(request.getScheme()) && port == 80)
                || ("https".equals(request.getScheme()) && port == 443);
    }

    private String refererOrigin(String referer) {
        if (referer == null || referer.isBlank()) {
            return null;
        }
        try {
            java.net.URI uri = java.net.URI.create(referer);
            if (uri.getScheme() == null || uri.getHost() == null) {
                return null;
            }
            return uri.getScheme() + "://" + uri.getHost() + (uri.getPort() > 0 ? ":" + uri.getPort() : "");
        } catch (IllegalArgumentException failure) {
            return null;
        }
    }
}
