ALTER TABLE promotion_service.vouchers
  ADD COLUMN version BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN reserved_count INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT voucher_counts_nonnegative CHECK (used_count >= 0 AND reserved_count >= 0),
  ADD CONSTRAINT voucher_quota CHECK (total_limit IS NULL OR total_limit <= 0 OR used_count::BIGINT + reserved_count <= total_limit);

CREATE UNIQUE INDEX vouchers_normalized_code ON promotion_service.vouchers (upper(code));
CREATE UNIQUE INDEX voucher_usage_order ON promotion_service.voucher_usages(order_id);

CREATE TABLE promotion_service.voucher_reservations (
  order_id BIGINT PRIMARY KEY CHECK (order_id > 0),
  voucher_id BIGINT REFERENCES promotion_service.vouchers(id),
  customer_id BIGINT CHECK (customer_id > 0),
  store_id BIGINT CHECK (store_id > 0),
  code VARCHAR(80),
  order_amount NUMERIC(12,0) CHECK (order_amount >= 0),
  discount_amount NUMERIC(12,0) CHECK (discount_amount >= 0 AND discount_amount <= order_amount),
  state VARCHAR(20) NOT NULL CHECK (state IN ('RESERVED','COMPLETED','RELEASED')),
  event_id VARCHAR(160),
  correlation_id VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (state = 'RELEASED' OR (voucher_id IS NOT NULL AND customer_id IS NOT NULL AND store_id IS NOT NULL
    AND code IS NOT NULL AND order_amount IS NOT NULL AND discount_amount IS NOT NULL))
);
CREATE INDEX voucher_reservations_voucher ON promotion_service.voucher_reservations(voucher_id);
CREATE INDEX voucher_reservations_pending ON promotion_service.voucher_reservations(updated_at) WHERE state = 'RESERVED';

CREATE TABLE promotion_service.voucher_order_events (
  event_id VARCHAR(160) PRIMARY KEY,
  order_id BIGINT NOT NULL,
  customer_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL,
  correlation_id VARCHAR(128) NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE promotion_service.audit_outbox (
  event_id VARCHAR(160) PRIMARY KEY,
  event JSONB NOT NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_outbox_pending ON promotion_service.audit_outbox(created_at) WHERE NOT published;
