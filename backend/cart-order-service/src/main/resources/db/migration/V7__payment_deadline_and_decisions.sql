ALTER TABLE order_service.orders ADD COLUMN payment_expires_at TIMESTAMPTZ;
CREATE INDEX order_payment_deadline ON order_service.orders(payment_expires_at)
    WHERE status='PENDING_PAYMENT' AND payment_expires_at IS NOT NULL;
CREATE TABLE order_service.payment_decisions (
    payment_id BIGINT PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES order_service.orders(id),
    event_id VARCHAR(160) NOT NULL UNIQUE,
    decision VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
