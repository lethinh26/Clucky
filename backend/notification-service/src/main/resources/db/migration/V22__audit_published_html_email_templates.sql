-- The V9 audit trigger covered only subject/text. Published HTML is now a
-- delivery-affecting field, so include it and the published revision pointer.
CREATE OR REPLACE FUNCTION notification_service.audit_mail_template_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO notification_service.configuration_audit
        (template_key, operation, actor_id, correlation_id, before_digest, after_digest)
    VALUES (
        COALESCE(NEW.template_key, OLD.template_key),
        TG_OP,
        NULLIF(current_setting('clucky.actor_id', true), ''),
        NULLIF(current_setting('clucky.correlation_id', true), ''),
        CASE WHEN TG_OP <> 'INSERT' THEN
            encode(sha256(convert_to(row(OLD.subject_template, OLD.body_template,
                OLD.html_template, OLD.is_active, OLD.published_revision_id)::text, 'UTF8')), 'hex')
        END,
        CASE WHEN TG_OP <> 'DELETE' THEN
            encode(sha256(convert_to(row(NEW.subject_template, NEW.body_template,
                NEW.html_template, NEW.is_active, NEW.published_revision_id)::text, 'UTF8')), 'hex')
        END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;
