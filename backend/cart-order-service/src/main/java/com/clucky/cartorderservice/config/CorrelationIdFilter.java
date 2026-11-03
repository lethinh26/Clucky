package com.clucky.cartorderservice.config;

import com.clucky.cartorderservice.logging.SafeLog;
import jakarta.servlet.AsyncEvent;
import jakarta.servlet.AsyncListener;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerMapping;

@Order(Ordered.HIGHEST_PRECEDENCE)
@Component
public class CorrelationIdFilter extends OncePerRequestFilter {
    public static final String HEADER = "X-Correlation-ID";
    public static final String ERROR_CODE = "clucky.errorCode";
    private static final Logger LOG = LoggerFactory.getLogger(CorrelationIdFilter.class);

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
        long started = System.nanoTime();
        AtomicBoolean logged = new AtomicBoolean();
        AtomicBoolean failed = new AtomicBoolean();
        Runnable complete = () -> {
            if (!logged.compareAndSet(false, true)) { return; }
            int status = failed.get() && response.getStatus() < 400 ? 500 : response.getStatus();
            String event = status == 401 || status == 403 ? "security_denied" : "http_request";
            var level = status >= 500 ? LOG.atError() : status >= 400 ? LOG.atWarn() : LOG.atInfo();
            level.log("event={} correlationId={} method={} path={} status={} durationMs={} code={}",
                    event, correlationId, SafeLog.token(request.getMethod()),
                    SafeLog.route(request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE)),
                    status, (System.nanoTime() - started) / 1_000_000,
                    SafeLog.token((String) request.getAttribute(ERROR_CODE)));
        };
        try {
            chain.doFilter(request, response);
        } catch (IOException | ServletException | RuntimeException failure) {
            failed.set(true);
            LOG.error("event=http_unhandled correlationId={} trace={}", correlationId, SafeLog.trace(failure));
            throw failure;
        } finally {
            try {
                if (request.isAsyncStarted()) {
                    AsyncListener listener = new AsyncListener() {
                        @Override public void onComplete(AsyncEvent event) { complete.run(); }
                        @Override public void onTimeout(AsyncEvent event) { failed.set(true); }
                        @Override public void onError(AsyncEvent event) {
                            failed.set(true);
                            LOG.error("event=http_async_error correlationId={} trace={}",
                                    correlationId, SafeLog.trace(event.getThrowable()));
                        }
                        @Override public void onStartAsync(AsyncEvent event) {
                            event.getAsyncContext().addListener(this);
                        }
                    };
                    try { request.getAsyncContext().addListener(listener); }
                    catch (IllegalStateException alreadyCompleted) { complete.run(); }
                } else {
                    complete.run();
                }
            } finally {
                if (previous == null) { MDC.remove("correlationId"); }
                else { MDC.put("correlationId", previous); }
            }
        }
    }
}
