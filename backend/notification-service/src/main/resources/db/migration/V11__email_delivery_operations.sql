ALTER TABLE notification_service.email_logs
    ADD COLUMN store_id BIGINT,
    ADD COLUMN command_hash VARCHAR(64),
    ADD COLUMN snapshot_version INT NOT NULL DEFAULT 0,
    ADD COLUMN sensitive BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN expires_at TIMESTAMPTZ,
    ADD COLUMN attempt_count INT NOT NULL DEFAULT 0,
    ADD COLUMN cycle_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN generation INT NOT NULL DEFAULT 0,
    ADD COLUMN claim_token UUID,
    ADD COLUMN lease_until TIMESTAMPTZ,
    ADD CONSTRAINT email_store_positive CHECK (store_id IS NULL OR store_id > 0);

UPDATE notification_service.email_logs
SET sensitive = TRUE, subject = 'Clucky — Account verification'
WHERE lower(template) LIKE '%otp%' OR template = 'branch-security';

CREATE TABLE notification_service.email_attempts (
    id UUID PRIMARY KEY,
    delivery_id BIGINT NOT NULL REFERENCES notification_service.email_logs(id),
    attempt_number INT NOT NULL,
    generation INT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    outcome VARCHAR(40) NOT NULL DEFAULT 'SENDING',
    UNIQUE (delivery_id, attempt_number)
);

CREATE TABLE notification_service.email_failure_outbox (
    id UUID PRIMARY KEY,
    delivery_id BIGINT NOT NULL REFERENCES notification_service.email_logs(id),
    generation INT NOT NULL,
    attempt_number INT NOT NULL,
    failure_code VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    publish_attempts INT NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (delivery_id, generation)
);
CREATE INDEX email_failure_pending ON notification_service.email_failure_outbox(next_attempt_at)
    WHERE published_at IS NULL;
INSERT INTO notification_service.email_failure_outbox(id,delivery_id,generation,attempt_number,failure_code)
SELECT md5('clucky-email-legacy:' || id::text)::uuid,id,0,0,
    CASE WHEN last_error IN ('SMTP_CONNECT_FAILED','SMTP_OUTCOME_UNKNOWN','INVALID_TEMPLATE')
        THEN last_error ELSE 'LEGACY_UNSNAPSHOTTED' END
FROM notification_service.email_logs WHERE status='FAILED';
CREATE INDEX email_store_created ON notification_service.email_logs(store_id, created_at DESC, id DESC);

CREATE TABLE notification_service.email_retry_requests (
    delivery_id BIGINT NOT NULL REFERENCES notification_service.email_logs(id),
    expected_generation INT NOT NULL,
    request_id UUID NOT NULL,
    actor_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (delivery_id, expected_generation),
    UNIQUE (delivery_id, request_id)
);

CREATE TABLE notification_service.email_command_conflicts (
    message_id VARCHAR(160) NOT NULL,
    command_hash VARCHAR(64) NOT NULL,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (message_id, command_hash)
);

INSERT INTO notification_service.mail_templates(template_key, subject_template, body_template)
VALUES
 ('register-otp', 'Clucky — Xác thực tài khoản', 'Mã xác thực: {{otp}}. Hết hạn (UTC): {{expiresAt}}. Không chia sẻ mã.'),
 ('reset-password-otp', 'Clucky — Đặt lại mật khẩu', 'Mã đặt lại mật khẩu: {{otp}}. Hết hạn (UTC): {{expiresAt}}. Không chia sẻ mã.'),
 ('branch-security', 'Clucky — Xác minh tài khoản nhân sự', 'Mã xác minh: {{otp}}. Tài khoản: {{login}}. Mục đích: {{purpose}}. Hết hạn (UTC): {{expiresAt}}. Không chia sẻ mã.')
ON CONFLICT (template_key) DO NOTHING;
