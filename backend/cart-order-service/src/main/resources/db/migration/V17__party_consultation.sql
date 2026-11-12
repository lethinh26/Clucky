ALTER TABLE order_service.party_orders
  ADD COLUMN contact_email VARCHAR(254),
  ADD COLUMN expected_time TIME,
  ADD COLUMN package_code VARCHAR(30),
  ADD COLUMN quote_amount NUMERIC(12,0),
  ADD COLUMN payment_method VARCHAR(20),
  ADD COLUMN consultation_note TEXT,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE order_service.party_orders
  ADD CONSTRAINT party_quote_amount_positive CHECK (quote_amount IS NULL OR quote_amount > 0),
  ADD CONSTRAINT party_payment_method_valid CHECK (payment_method IS NULL OR payment_method IN ('BANK_TRANSFER','CASH'));

CREATE INDEX party_orders_store_status ON order_service.party_orders(store_id,status,id DESC);
