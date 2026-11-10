ALTER TABLE payment_service.bank_transactions
    ADD COLUMN sub_account VARCHAR(160),
    ADD COLUMN classified_store_id BIGINT CHECK (classified_store_id > 0),
    ADD COLUMN classification_evidence JSONB,
    ADD COLUMN recheck_after TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX receipt_recheck_ready ON payment_service.bank_transactions(recheck_after,id)
    WHERE status='UNMATCHED' AND payment_id IS NULL AND webhook_fingerprint IS NOT NULL
      AND sub_account='' AND conflict_count=0 AND transfer_direction='in';
CREATE INDEX receipt_scoped_received ON payment_service.bank_transactions
    ((coalesce(classified_store_id,CASE WHEN payment_id IS NOT NULL AND webhook_fingerprint IS NOT NULL THEN store_id END)),received_at DESC,id DESC)
    WHERE conflict_count=0 AND transfer_direction='in';
