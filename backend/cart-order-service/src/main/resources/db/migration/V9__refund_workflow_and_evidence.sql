SET search_path TO order_service, public;

ALTER TABLE order_service.refund_requests ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE order_service.refund_requests
    ADD COLUMN IF NOT EXISTS review_note TEXT,
    ADD COLUMN IF NOT EXISTS cancellation_reason_snapshot TEXT,
    ADD COLUMN IF NOT EXISTS cancellation_status_snapshot VARCHAR(30),
    ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(80),
    ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(160),
    ADD COLUMN IF NOT EXISTS bank_details_version INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS current_attempt_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS current_attempt_bank_snapshot TEXT,
    ADD COLUMN IF NOT EXISTS evidence_public_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS evidence_url TEXT,
    ADD COLUMN IF NOT EXISTS evidence_registered_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS evidence_registered_by BIGINT,
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS confirmed_by BIGINT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS order_service.refund_attempts (
    id BIGSERIAL PRIMARY KEY,
    refund_request_id BIGINT NOT NULL REFERENCES order_service.refund_requests(id),
    attempt_number INT NOT NULL,
    attempt_id VARCHAR(64) NOT NULL UNIQUE,
    bank_name VARCHAR(100),
    bank_account_no VARCHAR(80),
    bank_account_name VARCHAR(160),
    amount NUMERIC(12,0) NOT NULL,
    status VARCHAR(30) NOT NULL,
    failure_reason TEXT,
    evidence_public_id VARCHAR(255),
    evidence_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT,
    UNIQUE(refund_request_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_refund_attempts_refund_request ON order_service.refund_attempts(refund_request_id);

CREATE TABLE IF NOT EXISTS order_service.refund_evidence_sessions (
    session_id VARCHAR(64) PRIMARY KEY,
    refund_request_id BIGINT NOT NULL REFERENCES order_service.refund_requests(id),
    attempt_id VARCHAR(64) NOT NULL,
    store_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE
);

