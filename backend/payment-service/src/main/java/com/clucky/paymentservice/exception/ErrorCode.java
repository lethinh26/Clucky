package com.clucky.paymentservice.exception;

@javax.annotation.processing.Generated("scripts/generate-errors.mjs")
public enum ErrorCode {
    VALIDATION_ERROR(400, "The submitted information is invalid."),
    UNAUTHENTICATED(401, "Please sign in to continue."),
    FORBIDDEN(403, "You do not have permission to perform this action."),
    RESOURCE_NOT_FOUND(404, "The requested resource was not found."),
    METHOD_NOT_ALLOWED(405, "This operation is not supported."),
    RESOURCE_CONFLICT(409, "The data has changed or already exists. Please check and try again."),
    REQUEST_TOO_LARGE(413, "The submitted data exceeds the size limit."),
    UNSUPPORTED_MEDIA_TYPE(415, "This data format is not supported."),
    TOO_MANY_REQUESTS(429, "Too many requests. Please try again later."),
    INTERNAL_ERROR(500, "Something went wrong. Please try again later."),
    NOT_IMPLEMENTED(501, "This feature is not available yet."),
    UPSTREAM_ERROR(502, "The service returned an invalid response. Please try again."),
    DEPENDENCY_UNAVAILABLE(503, "The service is temporarily unavailable. Please try again later."),
    GATEWAY_TIMEOUT(504, "The service took too long to respond. Please try again."),
    VOUCHER_NOT_FOUND(404, "This voucher was not found."),
    VOUCHER_EXPIRED(409, "This voucher has expired."),
    VOUCHER_NOT_STARTED(409, "This voucher is not valid yet."),
    VOUCHER_INACTIVE(409, "This voucher is currently unavailable."),
    VOUCHER_EXHAUSTED(409, "This voucher has reached its usage limit."),
    VOUCHER_SCOPE_MISMATCH(409, "This voucher cannot be used at this store."),
    MIN_ORDER_NOT_MET(409, "Your order does not meet the minimum voucher value."),
    INSUFFICIENT_POINTS(409, "You do not have enough points for this operation."),
    EMAIL_EXISTS(409, "This email is already registered."),
    ACCOUNT_LOCKED(403, "This account has been locked."),
    INVALID_CREDENTIALS(401, "Invalid email or password."),
    EMAIL_NOT_VERIFIED(401, "Please verify your email before signing in."),
    INVALID_OTP(400, "The OTP is invalid or has already been used."),
    OTP_EXPIRED(400, "The OTP has expired."),
    TOKEN_REVOKED(401, "The session has expired or been revoked."),
    REFUND_NOT_ELIGIBLE(400, "This order is not eligible for a refund."),
    REFUND_AMOUNT_EXCEEDED(409, "Refund amount exceeds eligible received amount."),
    REFUND_ALREADY_EXISTS(409, "An active refund request already exists."),
    INVALID_REFUND_STATE(409, "Invalid refund request state for this action."),
    EVIDENCE_REQUIRED(400, "Valid refund evidence is required."),
    EVIDENCE_DELIVERY_UNAVAILABLE(503, "Private evidence delivery is currently unavailable."),
    INVALID_THRESHOLD(400, "Invalid stock threshold."),
    PRODUCT_OUT_OF_STOCK(409, "Product is out of stock and cannot be put on sale.");

    private final int httpStatus;
    private final String message;

    ErrorCode(int httpStatus, String message) {
        this.httpStatus = httpStatus;
        this.message = message;
    }

    public int httpStatus() { return httpStatus; }
    public String message() { return message; }

    public static ErrorCode fromStatus(int status) {
        return switch (status) {
            case 400 -> VALIDATION_ERROR;
            case 401 -> UNAUTHENTICATED;
            case 403 -> FORBIDDEN;
            case 404 -> RESOURCE_NOT_FOUND;
            case 405 -> METHOD_NOT_ALLOWED;
            case 409 -> RESOURCE_CONFLICT;
            case 413 -> REQUEST_TOO_LARGE;
            case 415 -> UNSUPPORTED_MEDIA_TYPE;
            case 429 -> TOO_MANY_REQUESTS;
            case 500 -> INTERNAL_ERROR;
            case 501 -> NOT_IMPLEMENTED;
            case 502 -> UPSTREAM_ERROR;
            case 503 -> DEPENDENCY_UNAVAILABLE;
            case 504 -> GATEWAY_TIMEOUT;
            default -> INTERNAL_ERROR;
        };
    }
}
