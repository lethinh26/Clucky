ALTER TABLE payment_service.bank_transactions
    ADD COLUMN webhook_fingerprint VARCHAR(64),
    ADD COLUMN bank_occurred_at TIMESTAMPTZ,
    ADD COLUMN last_seen_at TIMESTAMPTZ,
    ADD COLUMN replay_count BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN conflict_count BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN candidate_payment_id BIGINT REFERENCES payment_service.payments(id),
    ADD COLUMN candidate_order_code VARCHAR(40);

CREATE INDEX bank_receipt_received ON payment_service.bank_transactions(received_at DESC, id DESC);
CREATE INDEX bank_receipt_status ON payment_service.bank_transactions(status, received_at DESC, id DESC);

CREATE TABLE payment_service.sepay_receipt_conflicts (
    bank_transaction_id BIGINT NOT NULL REFERENCES payment_service.bank_transactions(id),
    fingerprint VARCHAR(64) NOT NULL,
    financial_payload JSONB NOT NULL,
    reason VARCHAR(80) NOT NULL,
    occurrences BIGINT NOT NULL DEFAULT 1,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (bank_transaction_id, fingerprint)
);
