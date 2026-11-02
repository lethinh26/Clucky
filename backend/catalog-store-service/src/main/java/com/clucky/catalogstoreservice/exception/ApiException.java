package com.clucky.catalogstoreservice.exception;

import java.util.Objects;

public class ApiException extends RuntimeException {
    private final ErrorCode code;

    public ApiException(ErrorCode code) {
        super(Objects.requireNonNull(code).message());
        this.code = code;
    }

    public ErrorCode getCode() { return code; }
}
