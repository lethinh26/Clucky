ALTER TABLE payment_service.bank_accounts_config
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE payment_service.store_bank_accounts
    ALTER COLUMN bank_account_id DROP NOT NULL,
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE payment_service.bank_operations (
    actor_id BIGINT NOT NULL,
    operation_key UUID NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    response JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (actor_id, operation_key)
);

CREATE TABLE payment_service.bank_audit_outbox (
    event_id UUID PRIMARY KEY,
    event JSONB NOT NULL,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX bank_audit_pending ON payment_service.bank_audit_outbox(created_at) WHERE NOT published;
