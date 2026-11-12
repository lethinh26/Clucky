package com.clucky.identityservice.dto;

import com.clucky.identityservice.exception.ErrorCode;
import java.time.Instant;
import java.util.Map;
import org.springframework.http.HttpStatus;

public record ApiError(Instant timestamp, int status, String error, String code, String message, String path,
        @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_EMPTY) Map<String, String> fieldErrors) {
    public static ApiError of(ErrorCode code, String path) {
        return of(code, path, Map.of());
    }

    public static ApiError of(ErrorCode code, String path, Map<String, String> fieldErrors) {
        HttpStatus status = HttpStatus.valueOf(code.httpStatus());
        return new ApiError(Instant.now(), status.value(), status.getReasonPhrase(), code.name(), code.message(), path, fieldErrors);
    }

    public static ApiError of(HttpStatus status, String path) {
        return of(ErrorCode.fromStatus(status.value()), path);
    }
}
