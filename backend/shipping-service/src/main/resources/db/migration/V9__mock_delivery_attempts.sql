CREATE TABLE shipping_service.mock_ready_orders (
  order_id BIGINT PRIMARY KEY,
  store_id BIGINT NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  payment_status VARCHAR(30) NOT NULL,
  event_id VARCHAR(160) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shipping_service.mock_delivery_attempts (
  order_id BIGINT NOT NULL REFERENCES shipping_service.shipments(order_id),
  attempt_number INT NOT NULL CHECK (attempt_number BETWEEN 1 AND 3),
  phase VARCHAR(32) NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  route JSONB NOT NULL,
  failure_code VARCHAR(48),
  failure_note TEXT,
  failed_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  proof_kind VARCHAR(40),
  proof_at TIMESTAMPTZ,
  PRIMARY KEY (order_id, attempt_number)
);
CREATE INDEX mock_delivery_attempts_pending ON shipping_service.mock_delivery_attempts (phase, assigned_at);

CREATE TABLE shipping_service.mock_wallet_ledger (
  order_id BIGINT NOT NULL,
  attempt_number INT NOT NULL,
  operation VARCHAR(24) NOT NULL,
  amount NUMERIC(12,0) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (order_id, attempt_number, operation),
  FOREIGN KEY (order_id, attempt_number) REFERENCES shipping_service.mock_delivery_attempts(order_id, attempt_number)
);

CREATE TABLE shipping_service.mock_delivery_outbox (
  event_id UUID PRIMARY KEY,
  order_id BIGINT NOT NULL,
  envelope JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
