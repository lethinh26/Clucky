ALTER TABLE payment_service.payments
    ALTER COLUMN transfer_content TYPE VARCHAR(128),
    ADD COLUMN live_payment BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN received_amount NUMERIC(20,0) NOT NULL DEFAULT 0 CHECK (received_amount >= 0),
    ADD COLUMN receipt_proposed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN closed_reason VARCHAR(30),
    ADD CONSTRAINT live_payment_snapshot CHECK (NOT live_payment OR
        (customer_id IS NOT NULL AND store_id IS NOT NULL AND expires_at IS NOT NULL AND amount > 0
         AND bank_code IS NOT NULL AND account_no IS NOT NULL AND transfer_content IS NOT NULL));
CREATE UNIQUE INDEX one_live_payment_per_order ON payment_service.payments(order_id) WHERE live_payment;
ALTER TABLE payment_service.payment_outbox ADD COLUMN live_dispatch BOOLEAN NOT NULL DEFAULT FALSE;
DROP INDEX payment_service.uq_matched_payment_transaction;
CREATE INDEX payment_receipts ON payment_service.bank_transactions(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX receipt_candidates_pending ON payment_service.bank_transactions(candidate_payment_id)
    WHERE status='PENDING_RECONCILIATION' AND candidate_payment_id IS NOT NULL;
