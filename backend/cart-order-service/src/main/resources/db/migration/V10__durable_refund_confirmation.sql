ALTER TABLE order_service.refund_requests
    ADD COLUMN confirmation_requested_at TIMESTAMPTZ,
    ADD COLUMN confirmation_requested_by BIGINT,
    ADD COLUMN confirmation_requested_role VARCHAR(30),
    ADD CONSTRAINT refund_confirmation_actor CHECK (confirmation_requested_at IS NULL OR
        (confirmation_requested_by IS NOT NULL AND confirmation_requested_role IN ('ADMIN','STORE_MANAGER')));
CREATE INDEX refund_confirmation_pending ON order_service.refund_requests(id)
    WHERE status='PROCESSING' AND confirmation_requested_at IS NOT NULL;
CREATE UNIQUE INDEX one_active_refund_per_order ON order_service.refund_requests(order_id)
    WHERE status IN ('PENDING','APPROVED','PROCESSING','WAITING_BANK_DETAILS','REFUNDED');
