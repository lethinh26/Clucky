CREATE TABLE order_service.mock_delivery_receipts (
  event_id VARCHAR(160) PRIMARY KEY,
  order_id BIGINT NOT NULL,
  attempt_number INT NOT NULL,
  phase VARCHAR(32) NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
