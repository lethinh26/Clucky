package com.clucky.promotionloyaltyservice.exception;

import com.clucky.promotionloyaltyservice.logging.SafeLog;
import com.clucky.promotionloyaltyservice.config.CorrelationIdFilter;

import com.clucky.promotionloyaltyservice.dto.ApiError;
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
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ApiError> business(ApiException failure, HttpServletRequest request) {
        request.setAttribute(CorrelationIdFilter.ERROR_CODE, failure.getCode().name());
        return ResponseEntity.status(failure.getCode().httpStatus()).body(ApiError.of(failure.getCode(), request.getRequestURI()));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    ResponseEntity<ApiError> notFound(ResourceNotFoundException failure, HttpServletRequest request) {
        return respond(HttpStatus.NOT_FOUND, request);
    }

    @ExceptionHandler({BadRequestException.class, MethodArgumentNotValidException.class, ConstraintViolationException.class,
            HttpMessageNotReadableException.class, HandlerMethodValidationException.class,
            MethodArgumentTypeMismatchException.class, MissingServletRequestPartException.class,
            MissingServletRequestParameterException.class})
    ResponseEntity<ApiError> invalid(Exception failure, HttpServletRequest request) {
        return respond(HttpStatus.BAD_REQUEST, request);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ApiError> tooLarge(MaxUploadSizeExceededException failure, HttpServletRequest request) {
        return respond(HttpStatus.PAYLOAD_TOO_LARGE, request);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ApiError> unsupportedMediaType(HttpMediaTypeNotSupportedException failure, HttpServletRequest request) {
        return respond(HttpStatus.UNSUPPORTED_MEDIA_TYPE, request);
    }

    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<ApiError> unauthenticated(AuthenticationException failure, HttpServletRequest request) {
        return respond(HttpStatus.UNAUTHORIZED, request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiError> forbidden(AccessDeniedException failure, HttpServletRequest request) {
        return respond(HttpStatus.FORBIDDEN, request);
    }

    @ExceptionHandler({ConflictException.class, DataIntegrityViolationException.class, OptimisticLockingFailureException.class})
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
