package com.clucky.cartorderservice.exception;

import java.util.Objects;

public class ApiException extends RuntimeException {
    private final ErrorCode code;

    public ApiException(ErrorCode code) {
        super(Objects.requireNonNull(code).message());
        this.code = code;
    }

    public ApiException(ErrorCode code, String message) {
        super(message);
        this.code = Objects.requireNonNull(code);
    }

    public ErrorCode getCode() { return code; }
}
