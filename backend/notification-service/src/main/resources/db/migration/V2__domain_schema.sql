CREATE TABLE IF NOT EXISTS notification_service.notifications (
  id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL, title VARCHAR(180) NOT NULL, content TEXT NOT NULL,
  type VARCHAR(30) NOT NULL, ref_id BIGINT, is_read BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_service.email_logs (
  id BIGSERIAL PRIMARY KEY, message_id VARCHAR(160) NOT NULL UNIQUE, event_id VARCHAR(160), to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL, template VARCHAR(100) NOT NULL, provider VARCHAR(30) NOT NULL DEFAULT 'GMAIL_SMTP',
  status VARCHAR(20) NOT NULL, retry_count INT NOT NULL DEFAULT 0, last_error TEXT, sent_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_service.mail_templates (
  id BIGSERIAL PRIMARY KEY, template_key VARCHAR(100) NOT NULL UNIQUE, subject_template TEXT NOT NULL, body_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_status ON notification_service.email_logs(status, created_at);
