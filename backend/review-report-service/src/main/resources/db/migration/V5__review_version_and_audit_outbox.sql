ALTER TABLE review_report_service.reviews ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

CREATE TABLE review_report_service.audit_outbox (
    event_id VARCHAR(160) PRIMARY KEY,
    event JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
