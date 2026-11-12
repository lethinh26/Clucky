export const generatedBy = "scripts/generate-errors.mjs";
export const errorCatalog = {
  "VALIDATION_ERROR": {
    "httpStatus": 400
  },
  "UNAUTHENTICATED": {
    "httpStatus": 401
  },
  "FORBIDDEN": {
    "httpStatus": 403
  },
  "RESOURCE_NOT_FOUND": {
    "httpStatus": 404
  },
  "METHOD_NOT_ALLOWED": {
    "httpStatus": 405
  },
  "RESOURCE_CONFLICT": {
    "httpStatus": 409
  },
  "REQUEST_TOO_LARGE": {
    "httpStatus": 413
  },
  "UNSUPPORTED_MEDIA_TYPE": {
    "httpStatus": 415
  },
  "TOO_MANY_REQUESTS": {
    "httpStatus": 429
  },
  "INTERNAL_ERROR": {
    "httpStatus": 500
  },
  "NOT_IMPLEMENTED": {
    "httpStatus": 501
  },
  "UPSTREAM_ERROR": {
    "httpStatus": 502
  },
  "DEPENDENCY_UNAVAILABLE": {
    "httpStatus": 503
  },
  "GATEWAY_TIMEOUT": {
    "httpStatus": 504
  },
  "VOUCHER_NOT_FOUND": {
    "httpStatus": 404
  },
  "VOUCHER_EXPIRED": {
    "httpStatus": 409
  },
  "VOUCHER_NOT_STARTED": {
    "httpStatus": 409
  },
  "VOUCHER_INACTIVE": {
    "httpStatus": 409
  },
  "VOUCHER_EXHAUSTED": {
    "httpStatus": 409
  },
  "VOUCHER_SCOPE_MISMATCH": {
    "httpStatus": 409
  },
  "MIN_ORDER_NOT_MET": {
    "httpStatus": 409
  },
  "INSUFFICIENT_POINTS": {
    "httpStatus": 409
  },
  "EMAIL_EXISTS": {
    "httpStatus": 409
  },
  "ACCOUNT_LOCKED": {
    "httpStatus": 403
  },
  "INVALID_CREDENTIALS": {
    "httpStatus": 401
  },
  "EMAIL_NOT_VERIFIED": {
    "httpStatus": 401
  },
  "INVALID_OTP": {
    "httpStatus": 400
  },
  "OTP_EXPIRED": {
    "httpStatus": 400
  },
  "TOKEN_REVOKED": {
    "httpStatus": 401
  },
  "REFUND_NOT_ELIGIBLE": {
    "httpStatus": 400
  },
  "REFUND_AMOUNT_EXCEEDED": {
    "httpStatus": 409
  },
  "REFUND_ALREADY_EXISTS": {
    "httpStatus": 409
  },
  "INVALID_REFUND_STATE": {
    "httpStatus": 409
  },
  "EVIDENCE_REQUIRED": {
    "httpStatus": 400
  },
  "EVIDENCE_DELIVERY_UNAVAILABLE": {
    "httpStatus": 503
  },
  "INVALID_THRESHOLD": {
    "httpStatus": 400
  },
  "PRODUCT_OUT_OF_STOCK": {
    "httpStatus": 409
  },
  "PAYMENT_REQUIRED_BEFORE_HANDOVER": {
    "httpStatus": 409
  },
  "INSUFFICIENT_INVENTORY": {
    "httpStatus": 400
  }
} as const;
export type ErrorCode = keyof typeof errorCatalog;
export const defaultErrorCodes: Readonly<Record<number, ErrorCode>> = {
  "400": "VALIDATION_ERROR",
  "401": "UNAUTHENTICATED",
  "403": "FORBIDDEN",
  "404": "RESOURCE_NOT_FOUND",
  "405": "METHOD_NOT_ALLOWED",
  "409": "RESOURCE_CONFLICT",
  "413": "REQUEST_TOO_LARGE",
  "415": "UNSUPPORTED_MEDIA_TYPE",
  "429": "TOO_MANY_REQUESTS",
  "500": "INTERNAL_ERROR",
  "501": "NOT_IMPLEMENTED",
  "502": "UPSTREAM_ERROR",
  "503": "DEPENDENCY_UNAVAILABLE",
  "504": "GATEWAY_TIMEOUT"
};
