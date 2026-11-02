package com.clucky.reviewreportservice.config;

import org.springframework.stereotype.Component;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.filter.OncePerRequestFilter;

@Order(Ordered.HIGHEST_PRECEDENCE)
@Component
public class CorrelationIdFilter extends OncePerRequestFilter {
    public static final String HEADER = "X-Correlation-ID";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        String candidate = request.getHeader(HEADER);
        String correlationId = candidate != null && candidate.matches("[A-Za-z0-9._-]{1,128}")
                ? candidate : UUID.randomUUID().toString();
        String previous = MDC.get("correlationId");
        MDC.put("correlationId", correlationId);
        request.setAttribute(HEADER, correlationId);
        response.setHeader(HEADER, correlationId);
        try {
            chain.doFilter(request, response);
        } finally {
            if (previous == null) { MDC.remove("correlationId"); }
            else { MDC.put("correlationId", previous); }
        }
    }
}
