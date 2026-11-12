CREATE INDEX idx_audit_logs_time ON audit_service.audit_logs (occurred_at DESC, id DESC);
CREATE INDEX idx_audit_logs_source_time ON audit_service.audit_logs (source_service, occurred_at DESC, id DESC);
CREATE INDEX idx_audit_logs_actor_time ON audit_service.audit_logs (actor_id, occurred_at DESC, id DESC);
