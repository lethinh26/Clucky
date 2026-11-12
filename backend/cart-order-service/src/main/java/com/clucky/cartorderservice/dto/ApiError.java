package com.clucky.cartorderservice.dto;

import com.clucky.cartorderservice.exception.ErrorCode;
import java.time.Instant;
import org.springframework.http.HttpStatus;

public record ApiError(Instant timestamp, int status, String error, String code, String message, String path) {
    public static ApiError of(ErrorCode code, String path) {
        return of(code, null, path);
    }

    public static ApiError of(ErrorCode code, String customMessage, String path) {
        HttpStatus status = HttpStatus.valueOf(code.httpStatus());
        String msg = (customMessage != null && !customMessage.isBlank()) ? customMessage : code.message();
        return new ApiError(Instant.now(), status.value(), status.getReasonPhrase(), code.name(), msg, path);
    }

    public static ApiError of(HttpStatus status, String path) {
        return of(ErrorCode.fromStatus(status.value()), path);
    }
}
