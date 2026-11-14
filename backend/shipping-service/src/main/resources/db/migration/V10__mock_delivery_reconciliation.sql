ALTER TABLE shipping_service.shipments
  ADD COLUMN simulation_mode VARCHAR(24) NOT NULL DEFAULT 'NONE',
  ADD COLUMN mock_version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE shipping_service.mock_ready_orders
  ADD COLUMN last_attempt_at TIMESTAMPTZ,
  ADD COLUMN last_error_code VARCHAR(64);

ALTER TABLE shipping_service.mock_delivery_outbox
  ADD COLUMN published_at TIMESTAMPTZ;

ALTER TABLE shipping_service.mock_delivery_attempts
  ADD COLUMN failed_by BIGINT,
  ADD COLUMN failure_key VARCHAR(160),
  ADD COLUMN returned_by BIGINT,
  ADD COLUMN return_note TEXT,
  ADD COLUMN return_key VARCHAR(160),
  ADD COLUMN retry_note TEXT,
  ADD COLUMN retry_key VARCHAR(160),
  ADD COLUMN resolved_by BIGINT,
  ADD COLUMN resolution_note TEXT,
  ADD COLUMN resolution_key VARCHAR(160);

CREATE INDEX mock_delivery_outbox_unpublished
  ON shipping_service.mock_delivery_outbox(created_at)
  WHERE published_at IS NULL;
