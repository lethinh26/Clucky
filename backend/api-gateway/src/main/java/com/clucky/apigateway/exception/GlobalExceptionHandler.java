package com.clucky.apigateway.exception;

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
    private final ObjectMapper mapper;

    public GlobalExceptionHandler(ObjectMapper mapper) { this.mapper = mapper; }

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable failure) {
        if (exchange.getResponse().isCommitted()) { return Mono.error(failure); }
        HttpStatus status = failure instanceof ErrorResponse error
                ? HttpStatus.resolve(error.getStatusCode().value()) : HttpStatus.INTERNAL_SERVER_ERROR;
        if (status == null) { status = HttpStatus.INTERNAL_SERVER_ERROR; }
        ApiError error = ApiError.of(status, exchange.getRequest().getPath().value());
        exchange.getResponse().setStatusCode(HttpStatus.valueOf(error.status()));
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        try {
            byte[] body = mapper.writeValueAsBytes(error);
            return exchange.getResponse().writeWith(Mono.just(exchange.getResponse().bufferFactory().wrap(body)));
        } catch (JsonProcessingException serializationFailure) {
            return Mono.error(serializationFailure);
        }
    }
}
