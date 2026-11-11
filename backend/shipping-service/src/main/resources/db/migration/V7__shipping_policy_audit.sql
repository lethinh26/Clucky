CREATE TABLE shipping_service.audit_outbox (
    event_id uuid PRIMARY KEY,
    envelope jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
