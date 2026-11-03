package com.clucky.apigateway.config;

import com.clucky.apigateway.logging.SafeLog;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;
import reactor.core.publisher.SignalType;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter implements WebFilter {
    public static final String HEADER = "X-Correlation-ID";
    public static final String ERROR_CODE = "clucky.errorCode";
    private static final String COMPLETION = "clucky.logCompletion";
    private static final Logger LOG = LoggerFactory.getLogger(CorrelationIdFilter.class);

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        return Mono.defer(() -> {
            String supplied = exchange.getRequest().getHeaders().getFirst(HEADER);
            String correlationId = supplied != null && supplied.matches("[A-Za-z0-9._-]{1,128}")
                    ? supplied : UUID.randomUUID().toString();
            exchange.getAttributes().put(HEADER, correlationId);
            exchange.getResponse().getHeaders().set(HEADER, correlationId);
            long started = System.nanoTime();
            AtomicBoolean logged = new AtomicBoolean();
            Consumer<String> completion = outcome -> log(exchange, correlationId, started, logged, outcome);
            exchange.getAttributes().put(COMPLETION, completion);
            return chain.filter(exchange.mutate().request(request -> request.headers(headers -> {
                headers.set(HEADER, correlationId);
                headers.remove("X-User-Id");
                headers.remove("X-Role");
                headers.remove("X-Store-Id");
            })).build()).doFinally(signal -> {
                if (signal == SignalType.CANCEL) { completion.accept("cancelled"); }
                else if (signal == SignalType.ON_COMPLETE) { completion.accept("completed"); }
            }).contextWrite(context -> context.put("correlationId", correlationId));
        });
    }

    public static void complete(ServerWebExchange exchange, String outcome) {
        Consumer<String> completion = exchange.getAttribute(COMPLETION);
        if (completion != null) { completion.accept(outcome); }
    }

    private void log(ServerWebExchange exchange, String correlationId, long started,
            AtomicBoolean logged, String outcome) {
        if (!logged.compareAndSet(false, true)) { return; }
        var code = exchange.getResponse().getStatusCode();
        int status = code == null ? (outcome.equals("cancelled") ? 0 : 200) : code.value();
        String event = status == 401 || status == 403 ? "security_denied" : "http_request";
        var level = status >= 500 ? LOG.atError() : status >= 400 ? LOG.atWarn() : LOG.atInfo();
        level.log("event={} correlationId={} method={} path={} status={} durationMs={} outcome={} code={}",
                event, correlationId, exchange.getRequest().getMethod(),
                SafeLog.route(exchange.getAttribute(ServerWebExchangeUtils.GATEWAY_PREDICATE_MATCHED_PATH_ATTR)),
                status, (System.nanoTime() - started) / 1_000_000, outcome,
                SafeLog.token(exchange.getAttribute(ERROR_CODE)));
    }
}
