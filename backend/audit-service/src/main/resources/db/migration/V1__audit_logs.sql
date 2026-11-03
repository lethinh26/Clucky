CREATE TABLE IF NOT EXISTS audit_service.audit_logs (
  id BIGSERIAL PRIMARY KEY, event_id VARCHAR(160) NOT NULL UNIQUE, correlation_id VARCHAR(160),
  source_service VARCHAR(100) NOT NULL, actor_id BIGINT NOT NULL, actor_role VARCHAR(30) NOT NULL,
  store_id BIGINT, action VARCHAR(100) NOT NULL, target_type VARCHAR(100) NOT NULL, target_id BIGINT,
  detail JSONB, occurred_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_store_time ON audit_service.audit_logs(store_id, occurred_at);
