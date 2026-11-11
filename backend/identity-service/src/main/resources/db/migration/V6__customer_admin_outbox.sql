CREATE TABLE identity_service.outbox_events (
  event_id VARCHAR(36) PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  aggregate_id BIGINT NOT NULL,
  correlation_id VARCHAR(128) NOT NULL,
  payload TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_identity_outbox_unpublished ON identity_service.outbox_events (occurred_at) WHERE published_at IS NULL;
