ALTER TABLE order_service.orders ADD COLUMN customer_email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE order_service.outbox_events ADD COLUMN recipient_retry_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX refund_recipient_work ON order_service.outbox_events(recipient_retry_at) WHERE status='WAITING_RECIPIENT';
UPDATE order_service.outbox_events SET status='WAITING_RECIPIENT',last_error='Verified customer recipient required'
WHERE topic LIKE 'refund.%' AND status IN ('PENDING','FAILED') AND NOT (payload->'payload' ? 'recipient');
