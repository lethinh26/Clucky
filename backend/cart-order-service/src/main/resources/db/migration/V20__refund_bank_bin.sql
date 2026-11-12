ALTER TABLE order_service.refund_requests
    ADD COLUMN IF NOT EXISTS bank_bin VARCHAR(6);

ALTER TABLE order_service.refund_attempts
    ADD COLUMN IF NOT EXISTS bank_bin VARCHAR(6);
