package com.clucky.promotionloyaltyservice.dto;

import com.clucky.promotionloyaltyservice.exception.ErrorCode;
import java.time.Instant;
import org.springframework.http.HttpStatus;

public record ApiError(Instant timestamp, int status, String error, String code, String message, String path) {
    public static ApiError of(ErrorCode code, String path) {
        HttpStatus status = HttpStatus.valueOf(code.httpStatus());
        return new ApiError(Instant.now(), status.value(), status.getReasonPhrase(), code.name(), code.message(), path);
    }

    public static ApiError of(HttpStatus status, String path) {
        return of(ErrorCode.fromStatus(status.value()), path);
    }
}
