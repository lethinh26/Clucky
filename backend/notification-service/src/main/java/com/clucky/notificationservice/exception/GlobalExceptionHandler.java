package com.clucky.notificationservice.exception;

import com.clucky.notificationservice.logging.SafeLog;
import com.clucky.notificationservice.config.CorrelationIdFilter;

import com.clucky.notificationservice.dto.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ApiError> business(ApiException failure, HttpServletRequest request) {
        request.setAttribute(CorrelationIdFilter.ERROR_CODE, failure.getCode().name());
        return ResponseEntity.status(failure.getCode().httpStatus()).body(ApiError.of(failure.getCode(), request.getRequestURI()));
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, ConstraintViolationException.class,
            HttpMessageNotReadableException.class, HandlerMethodValidationException.class,
            MethodArgumentTypeMismatchException.class})
    ResponseEntity<ApiError> invalid(Exception failure, HttpServletRequest request) {
        return respond(HttpStatus.BAD_REQUEST, request);
    }

    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<ApiError> unauthenticated(AuthenticationException failure, HttpServletRequest request) {
        return respond(HttpStatus.UNAUTHORIZED, request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiError> forbidden(AccessDeniedException failure, HttpServletRequest request) {
        return respond(HttpStatus.FORBIDDEN, request);
    }

    @ExceptionHandler({DataIntegrityViolationException.class, OptimisticLockingFailureException.class})
    ResponseEntity<ApiError> conflict(Exception failure, HttpServletRequest request) {
        return respond(HttpStatus.CONFLICT, request);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> unexpected(Exception failure, HttpServletRequest request) {
        if (failure instanceof ErrorResponse response) {
            HttpStatus status = HttpStatus.resolve(response.getStatusCode().value());
            if (status != null && status.is4xxClientError()) {
                return respond(status, request);
            }
        }
        LOG.error("event=http_error correlationId={} trace={}",
                request.getAttribute(CorrelationIdFilter.HEADER), SafeLog.trace(failure));
        return respond(HttpStatus.INTERNAL_SERVER_ERROR, request);
    }

    private ResponseEntity<ApiError> respond(HttpStatus status, HttpServletRequest request) {
        ApiError error = ApiError.of(status, request.getRequestURI());
        request.setAttribute(CorrelationIdFilter.ERROR_CODE, error.code());
        return ResponseEntity.status(error.status()).body(error);
    }
}
