CREATE TABLE notification_service.admin_notifications (
    id BIGSERIAL PRIMARY KEY,
    operation_key VARCHAR(180) NOT NULL UNIQUE,
    event_id VARCHAR(160) NOT NULL,
    correlation_id VARCHAR(128) NOT NULL,
    title VARCHAR(180) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(30) NOT NULL,
    ref_id BIGINT NOT NULL CHECK (ref_id > 0),
    store_id BIGINT NOT NULL CHECK (store_id > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_notifications_created ON notification_service.admin_notifications(created_at DESC,id DESC);
CREATE TABLE notification_service.admin_notification_reads (
    notification_id BIGINT NOT NULL REFERENCES notification_service.admin_notifications(id),
    user_id BIGINT NOT NULL CHECK (user_id > 0),
    read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (notification_id,user_id)
);
CREATE TABLE notification_service.notification_delivery_gaps (
    event_id VARCHAR(160) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    correlation_id VARCHAR(128) NOT NULL,
    reason VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id,event_type,reason)
);
CREATE INDEX idx_email_logs_created ON notification_service.email_logs(created_at DESC,id DESC);
CREATE TABLE notification_service.configuration_audit (
    id BIGSERIAL PRIMARY KEY,
    template_key VARCHAR(100) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    actor_id TEXT,
    database_actor TEXT NOT NULL DEFAULT current_user,
    correlation_id TEXT,
    before_digest TEXT,
    after_digest TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE FUNCTION notification_service.audit_mail_template_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO notification_service.configuration_audit
        (template_key,operation,actor_id,correlation_id,before_digest,after_digest)
    VALUES (COALESCE(NEW.template_key,OLD.template_key),TG_OP,
        NULLIF(current_setting('clucky.actor_id',true),''),
        NULLIF(current_setting('clucky.correlation_id',true),''),
        CASE WHEN TG_OP <> 'INSERT' THEN encode(sha256(convert_to(row(OLD.subject_template,OLD.body_template,OLD.is_active)::text,'UTF8')),'hex') END,
        CASE WHEN TG_OP <> 'DELETE' THEN encode(sha256(convert_to(row(NEW.subject_template,NEW.body_template,NEW.is_active)::text,'UTF8')),'hex') END);
    RETURN COALESCE(NEW,OLD);
END;
$$;
CREATE TRIGGER audit_mail_template_change AFTER INSERT OR UPDATE OR DELETE ON notification_service.mail_templates
FOR EACH ROW EXECUTE FUNCTION notification_service.audit_mail_template_change();

INSERT INTO notification_service.mail_templates(template_key,subject_template,body_template,is_active)
VALUES ('REFUND_PROCESSED','Clucky — Hoàn tiền thành công cho đơn {{orderCode}}',
    'Clucky đã hoàn {{amount}}đ cho đơn {{orderCode}}. Vui lòng đăng nhập để xem yêu cầu hoàn tiền.',true)
ON CONFLICT (template_key) DO NOTHING;
