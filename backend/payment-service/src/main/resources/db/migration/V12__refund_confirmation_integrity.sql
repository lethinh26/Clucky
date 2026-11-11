ALTER TABLE payment_service.refund_reservations
    ADD COLUMN attempt_id VARCHAR(64),
    ADD COLUMN evidence_reference VARCHAR(64),
    ADD CONSTRAINT refund_amount_positive CHECK (amount > 0) NOT VALID,
    ADD CONSTRAINT refund_reservation_status CHECK (status IN ('HELD','CONFIRMED','RELEASED')) NOT VALID,
    ADD CONSTRAINT refund_confirmation_evidence CHECK (status <> 'CONFIRMED' OR
        (confirmed_at IS NOT NULL AND attempt_id IS NOT NULL AND evidence_reference ~ '^[a-f0-9]{64}$')) NOT VALID;
CREATE UNIQUE INDEX refund_confirmation_attempt ON payment_service.refund_reservations(attempt_id) WHERE attempt_id IS NOT NULL;
