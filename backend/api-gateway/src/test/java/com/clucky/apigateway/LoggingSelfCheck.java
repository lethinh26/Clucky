package com.clucky.apigateway;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.clucky.apigateway.config.CorrelationIdFilter;
import com.clucky.apigateway.exception.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import reactor.core.publisher.Mono;

public final class LoggingSelfCheck {
    public static void main(String[] args) {
        Logger logger = (Logger) LoggerFactory.getLogger(CorrelationIdFilter.class);
        ListAppender<ILoggingEvent> logs = new ListAppender<>();
        logs.start();
        logger.addAppender(logs);
        try {
            CorrelationIdFilter filter = new CorrelationIdFilter();
            MockServerWebExchange success = MockServerWebExchange.from(MockServerHttpRequest
                    .get("/api/orders/secret?token=secret").header("X-Correlation-ID", "gateway-1")
                    .header("X-User-Id", "forged"));
            success.getAttributes().put(ServerWebExchangeUtils.GATEWAY_PREDICATE_MATCHED_PATH_ATTR, "/api/orders/**");
            filter.filter(success, forwarded -> Mono.deferContextual(context -> {
                require("gateway-1".equals(context.get("correlationId")), "Reactor correlation missing");
                require(forwarded.getRequest().getHeaders().getFirst("X-User-Id") == null, "Forged identity forwarded");
                return forwarded.getResponse().setComplete();
            })).block();
            require(logs.list.size() == 1 && logs.list.getFirst().getFormattedMessage().contains("status=200"), "Successful request log incorrect");
            MockServerWebExchange denied = MockServerWebExchange.from(MockServerHttpRequest.get("/api/audit-logs"));
            filter.filter(denied, exchange -> {
                exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
                return exchange.getResponse().setComplete();
            }).block();
            require(logs.list.getLast().getFormattedMessage().contains("event=security_denied"), "Security denial missing");
            MockServerWebExchange failure = MockServerWebExchange.from(MockServerHttpRequest.get("/secret"));
            GlobalExceptionHandler handler = new GlobalExceptionHandler(new ObjectMapper().findAndRegisterModules());
            filter.filter(failure, exchange -> Mono.error(new IllegalStateException("secret")))
                    .onErrorResume(error -> handler.handle(failure, error)).block();
            require(logs.list.size() == 3 && logs.list.getLast().getFormattedMessage().contains("status=500"), "Reactive error missing or logged as 200");
            MockServerWebExchange cancelled = MockServerWebExchange.from(MockServerHttpRequest.get("/cancel"));
            filter.filter(cancelled, exchange -> Mono.never()).subscribe().dispose();
            require(logs.list.getLast().getFormattedMessage().contains("outcome=cancelled"), "Cancellation missing");
            require(logs.list.stream().noneMatch(entry -> entry.getFormattedMessage().contains("secret")), "Sensitive request data leaked");
        } finally {
            logger.detachAppender(logs);
            logs.stop();
        }
        System.out.println("Gateway logging self-check passed");
    }

    private static void require(boolean condition, String message) {
        if (!condition) { throw new AssertionError(message); }
    }
}
