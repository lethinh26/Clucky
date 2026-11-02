CREATE TABLE IF NOT EXISTS payment_service.payments (
  id BIGSERIAL PRIMARY KEY, order_id BIGINT NOT NULL, order_code VARCHAR(40) NOT NULL, method VARCHAR(20) NOT NULL,
  amount NUMERIC(12,0) NOT NULL, status VARCHAR(30) NOT NULL, qr_content TEXT, expires_at TIMESTAMPTZ, paid_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payment_service.bank_transactions (
  id BIGSERIAL PRIMARY KEY, bank_tx_id VARCHAR(160) NOT NULL UNIQUE, bank_account VARCHAR(80), amount NUMERIC(12,0) NOT NULL,
  content TEXT, received_at TIMESTAMPTZ NOT NULL, matched_order_code VARCHAR(40), raw_payload JSONB
);

CREATE TABLE IF NOT EXISTS payment_service.webhook_logs (
  id BIGSERIAL PRIMARY KEY, provider VARCHAR(20) NOT NULL, signature_valid BOOLEAN NOT NULL,
  payload JSONB NOT NULL, processed BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_service.bank_accounts_config (
  id BIGSERIAL PRIMARY KEY, bank_name VARCHAR(100) NOT NULL, account_no VARCHAR(80) NOT NULL,
  account_name VARCHAR(160) NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_payments_order_code ON payment_service.payments(order_code);
