ALTER TABLE promotion_service.vouchers
    ADD COLUMN rejection_reason VARCHAR(500),
    ADD COLUMN rejected_by BIGINT,
    ADD COLUMN rejected_at TIMESTAMPTZ,
    ADD CONSTRAINT voucher_rejection_metadata CHECK (
        (rejection_reason IS NULL AND rejected_by IS NULL AND rejected_at IS NULL)
        OR (rejection_reason IS NOT NULL AND length(btrim(rejection_reason)) > 0
            AND rejected_by IS NOT NULL AND rejected_by > 0 AND rejected_at IS NOT NULL)
    );
