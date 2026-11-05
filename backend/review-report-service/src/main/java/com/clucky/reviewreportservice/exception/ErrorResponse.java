package com.clucky.reviewreportservice.exception;

import java.time.OffsetDateTime;

public record ErrorResponse(
    int status,
    String error,
    String message,
    String path,
    OffsetDateTime timestamp
) {
    public ErrorResponse(int status, String error, String message, String path) {
        this(status, error, message, path, OffsetDateTime.now());
    }
}
