ALTER TABLE review_report_service.audit_outbox ADD COLUMN published_at TIMESTAMPTZ;

CREATE INDEX idx_review_audit_outbox_pending
    ON review_report_service.audit_outbox (created_at, event_id) WHERE published_at IS NULL;
