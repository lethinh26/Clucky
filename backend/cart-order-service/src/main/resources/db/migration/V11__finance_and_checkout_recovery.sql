CREATE TABLE order_service.voucher_release_work (
    order_id BIGINT PRIMARY KEY CHECK (order_id > 0),
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE order_service.orders ADD COLUMN customer_email VARCHAR(255);
ALTER TABLE order_service.refund_requests
    ADD COLUMN payment_operation VARCHAR(16),
    ADD COLUMN payment_error VARCHAR(64),
    ADD COLUMN payment_retry_at TIMESTAMPTZ,
    ADD COLUMN review_role VARCHAR(30),
    ADD CONSTRAINT refund_payment_operation CHECK (payment_operation IN ('RESERVE','RELEASE','CONFIRM'));
UPDATE order_service.refund_requests SET payment_operation='CONFIRM',payment_retry_at=now()
    WHERE status='PROCESSING' AND confirmation_requested_at IS NOT NULL;
CREATE INDEX refund_payment_work ON order_service.refund_requests(payment_retry_at) WHERE payment_operation IS NOT NULL;
CREATE TABLE order_service.cancellation_refund_work (
    order_id BIGINT PRIMARY KEY REFERENCES order_service.orders(id),
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
