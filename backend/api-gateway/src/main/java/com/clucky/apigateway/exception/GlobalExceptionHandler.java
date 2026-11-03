package com.clucky.apigateway.exception;

import com.clucky.apigateway.logging.SafeLog;
import com.clucky.apigateway.config.CorrelationIdFilter;

import com.clucky.apigateway.dto.ApiError;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.ErrorResponse;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebExceptionHandler;
import reactor.core.publisher.Mono;

@Component
@Order(-2)
public class GlobalExceptionHandler implements WebExceptionHandler {
    private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private final ObjectMapper mapper;

    public GlobalExceptionHandler(ObjectMapper mapper) { this.mapper = mapper; }

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable failure) {
        if (exchange.getResponse().isCommitted()) {
            LOG.error("event=http_response_failed correlationId={} trace={}",
                    SafeLog.token(exchange.getAttribute(CorrelationIdFilter.HEADER)), SafeLog.trace(failure));
            CorrelationIdFilter.complete(exchange, "response_failed");
            return Mono.error(failure);
        }
        HttpStatus status = failure instanceof ErrorResponse error
                ? HttpStatus.resolve(error.getStatusCode().value()) : HttpStatus.INTERNAL_SERVER_ERROR;
        if (status == null) { status = HttpStatus.INTERNAL_SERVER_ERROR; }
        if (status.is5xxServerError()) {
            LOG.error("event=http_error correlationId={} trace={}",
                    SafeLog.token(exchange.getAttribute(CorrelationIdFilter.HEADER)), SafeLog.trace(failure));
        }
        ApiError error = ApiError.of(status, exchange.getRequest().getPath().value());
        exchange.getAttributes().put(CorrelationIdFilter.ERROR_CODE, error.code());
        exchange.getResponse().setStatusCode(HttpStatus.valueOf(error.status()));
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        try {
            byte[] body = mapper.writeValueAsBytes(error);
            return exchange.getResponse().writeWith(Mono.just(exchange.getResponse().bufferFactory().wrap(body)))
                    .doFinally(signal -> CorrelationIdFilter.complete(exchange, signal.name()));
        } catch (JsonProcessingException serializationFailure) {
            CorrelationIdFilter.complete(exchange, "serialization_failed");
            return Mono.error(serializationFailure);
        }
    }
}
