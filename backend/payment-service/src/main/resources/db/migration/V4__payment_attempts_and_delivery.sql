ALTER TABLE payment_service.bank_accounts_config ADD COLUMN bank_code VARCHAR(20);
CREATE UNIQUE INDEX uq_bank_account_identity ON payment_service.bank_accounts_config(bank_code, account_no) WHERE bank_code IS NOT NULL;
CREATE TABLE payment_service.store_bank_accounts (
  store_id BIGINT PRIMARY KEY CHECK (store_id > 0),
  bank_account_id BIGINT NOT NULL REFERENCES payment_service.bank_accounts_config(id)
);
ALTER TABLE payment_service.payments
  ADD COLUMN customer_id BIGINT,
  ADD COLUMN store_id BIGINT,
  ADD COLUMN attempt_code VARCHAR(48),
  ADD COLUMN transfer_content VARCHAR(48),
  ADD COLUMN bank_code VARCHAR(20),
  ADD COLUMN bank_name VARCHAR(100),
  ADD COLUMN account_no VARCHAR(80),
  ADD COLUMN account_name VARCHAR(160),
  ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN reviewed_by BIGINT,
  ADD COLUMN review_reason VARCHAR(500),
  ADD COLUMN evidence_reference VARCHAR(160);
CREATE UNIQUE INDEX uq_payment_reference ON payment_service.payments(transfer_content) WHERE transfer_content IS NOT NULL;
CREATE UNIQUE INDEX uq_payment_pending_order ON payment_service.payments(order_id) WHERE status IN ('PENDING','MISMATCH') AND customer_id IS NOT NULL;
CREATE UNIQUE INDEX uq_payment_settled_order ON payment_service.payments(order_id) WHERE status IN ('PAID','COLLECTED','REFUND_PENDING','REFUNDED') AND customer_id IS NOT NULL;
CREATE INDEX idx_payment_store_created ON payment_service.payments(store_id,created_at DESC);
CREATE INDEX idx_payment_expiry ON payment_service.payments(expires_at) WHERE status = 'PENDING';
CREATE UNIQUE INDEX uq_manual_bank_evidence ON payment_service.payments(bank_code,account_no,evidence_reference)
  WHERE method='BANK_TRANSFER' AND reviewed_by IS NOT NULL AND status IN ('PAID','REFUND_PENDING','REFUNDED');
ALTER TABLE payment_service.bank_transactions
  ADD COLUMN bank_gateway VARCHAR(100),
  ADD COLUMN transfer_direction VARCHAR(3),
  ADD COLUMN store_id BIGINT,
  ADD COLUMN payment_id BIGINT REFERENCES payment_service.payments(id),
  ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'UNMATCHED',
  ADD COLUMN reason VARCHAR(80);
CREATE UNIQUE INDEX uq_matched_payment_transaction ON payment_service.bank_transactions(payment_id) WHERE status='MATCHED';
CREATE TABLE payment_service.order_snapshots (
  order_id BIGINT PRIMARY KEY, status VARCHAR(30) NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE payment_service.processed_events (
  event_id VARCHAR(160) PRIMARY KEY, processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE payment_service.payment_outbox (
  event_id VARCHAR(160) PRIMARY KEY, order_id BIGINT NOT NULL, topic VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), published_at TIMESTAMPTZ
);
CREATE INDEX idx_payment_outbox_pending ON payment_service.payment_outbox(created_at) WHERE published_at IS NULL;
CREATE TABLE payment_service.payment_audit (
  id BIGSERIAL PRIMARY KEY, actor_id BIGINT, store_id BIGINT, payment_id BIGINT,
  action VARCHAR(80) NOT NULL, reason VARCHAR(500), evidence_reference VARCHAR(160),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
