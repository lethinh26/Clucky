ALTER TABLE notification_service.email_logs
    ADD COLUMN next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN claimed_at TIMESTAMPTZ;

CREATE INDEX idx_email_logs_dispatch ON notification_service.email_logs (next_attempt_at, id)
    WHERE status = 'QUEUED';
