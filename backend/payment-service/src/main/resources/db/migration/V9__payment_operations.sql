ALTER TABLE payment_service.payments ADD COLUMN version BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN legacy_adopted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN failed_event_sent BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE payment_service.collections (
    id UUID PRIMARY KEY, order_id BIGINT NOT NULL, order_code VARCHAR(40) NOT NULL,
    customer_id BIGINT NOT NULL, store_id BIGINT NOT NULL, order_version TIMESTAMPTZ NOT NULL,
    amount NUMERIC(12,0) NOT NULL CHECK (amount > 0), cash_amount NUMERIC(12,0) NOT NULL CHECK (cash_amount >= 0),
    transfer_amount NUMERIC(12,0) NOT NULL CHECK (transfer_amount >= 0),
    cash_tendered NUMERIC(12,0) NOT NULL, cash_change NUMERIC(12,0) NOT NULL,
    reason VARCHAR(500) NOT NULL, actor_id BIGINT NOT NULL, actor_role VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', version BIGINT NOT NULL DEFAULT 0,
    bank_name VARCHAR(100), bank_code VARCHAR(20), account_no VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), resolved_at TIMESTAMPTZ,
    CHECK (cash_tendered >= cash_amount AND cash_change = cash_tendered - cash_amount)
);
CREATE UNIQUE INDEX one_active_collection ON payment_service.collections(order_id) WHERE status IN ('PENDING','ACCEPTED');
ALTER TABLE payment_service.bank_transactions ADD COLUMN version BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN collection_id UUID REFERENCES payment_service.collections(id),
    ADD COLUMN conflict_reviewed BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX collection_receipts ON payment_service.bank_transactions(collection_id) WHERE collection_id IS NOT NULL;
CREATE TABLE payment_service.operations (
    actor_id BIGINT NOT NULL, operation_key UUID NOT NULL, request_hash VARCHAR(64) NOT NULL,
    response JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(actor_id,operation_key)
);
CREATE FUNCTION payment_service.advance_financial_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.version := OLD.version + 1;
    RETURN NEW;
END;
$$;
CREATE TRIGGER payment_version BEFORE UPDATE ON payment_service.payments FOR EACH ROW EXECUTE FUNCTION payment_service.advance_financial_version();
CREATE TRIGGER receipt_version BEFORE UPDATE ON payment_service.bank_transactions FOR EACH ROW EXECUTE FUNCTION payment_service.advance_financial_version();
