-- Keep the current mail_templates row as the published delivery snapshot.
-- Draft revisions never change emails being queued or sent.
ALTER TABLE notification_service.mail_templates
    ADD COLUMN html_template TEXT;

CREATE TABLE notification_service.mail_template_revisions (
    id BIGSERIAL PRIMARY KEY,
    template_key VARCHAR(100) NOT NULL REFERENCES notification_service.mail_templates(template_key),
    revision_number INTEGER NOT NULL CHECK (revision_number > 0),
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    html_template TEXT,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    published_by BIGINT,
    UNIQUE(template_key, revision_number)
);

ALTER TABLE notification_service.mail_templates
    ADD COLUMN published_revision_id BIGINT REFERENCES notification_service.mail_template_revisions(id);

-- Capture all existing templates, including inactive legacy keys, for restore.
INSERT INTO notification_service.mail_template_revisions
    (template_key,revision_number,subject_template,body_template,html_template,created_by,created_at,published_at,published_by)
SELECT template_key,1,subject_template,body_template,NULL,0,updated_at,updated_at,0
FROM notification_service.mail_templates;

UPDATE notification_service.mail_templates t
SET published_revision_id = r.id
FROM notification_service.mail_template_revisions r
WHERE r.template_key = t.template_key AND r.revision_number=1;

CREATE INDEX idx_mail_template_revisions_recent
    ON notification_service.mail_template_revisions(template_key,revision_number DESC);
