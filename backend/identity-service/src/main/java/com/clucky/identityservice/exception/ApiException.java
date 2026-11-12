package com.clucky.identityservice.exception;

import java.util.Objects;
import java.util.Map;

public class ApiException extends RuntimeException {
    private final ErrorCode code;
    private final Map<String, String> fieldErrors;

    public ApiException(ErrorCode code) {
        this(code, Map.of());
    }

    public ApiException(ErrorCode code, Map<String, String> fieldErrors) {
        super(Objects.requireNonNull(code).message());
        this.code = code;
        this.fieldErrors = Map.copyOf(fieldErrors);
    }

    public ErrorCode getCode() { return code; }
    public Map<String, String> getFieldErrors() { return fieldErrors; }
}
