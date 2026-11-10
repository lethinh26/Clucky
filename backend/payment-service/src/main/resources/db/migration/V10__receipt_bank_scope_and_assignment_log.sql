ALTER TABLE payment_service.bank_transactions
    ADD COLUMN bank_store_ids BIGINT[] NOT NULL DEFAULT '{}',
    ADD COLUMN bank_scope_source VARCHAR(30) NOT NULL DEFAULT 'NONE',
    ADD COLUMN assigned_by BIGINT,
    ADD COLUMN assigned_at TIMESTAMPTZ,
    ADD COLUMN assignment_reason VARCHAR(500);

UPDATE payment_service.bank_transactions receipt
SET bank_store_ids = evidence.store_ids, bank_scope_source = 'CURRENT_CONFIG_BACKFILL'
FROM (
    SELECT receipt.id, array_agg(DISTINCT assignment.store_id ORDER BY assignment.store_id) AS store_ids
    FROM payment_service.bank_transactions receipt
    JOIN payment_service.bank_accounts_config bank ON bank.account_no = receipt.bank_account AND bank.is_active
    JOIN payment_service.store_bank_accounts assignment ON assignment.bank_account_id = bank.id
    WHERE receipt.webhook_fingerprint IS NOT NULL
      AND regexp_replace(upper(receipt.bank_gateway), '[^A-Z0-9]', '', 'g') <> ''
      AND regexp_replace(upper(receipt.bank_gateway), '[^A-Z0-9]', '', 'g') IN
          (regexp_replace(upper(bank.bank_name), '[^A-Z0-9]', '', 'g'), regexp_replace(upper(bank.bank_code), '[^A-Z0-9]', '', 'g'))
    GROUP BY receipt.id
) evidence
WHERE receipt.id = evidence.id;

CREATE INDEX receipt_bank_store_scope ON payment_service.bank_transactions USING gin(bank_store_ids);

CREATE FUNCTION payment_service.advance_receipt_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF (to_jsonb(NEW) - ARRAY['version','recheck_after','last_seen_at','replay_count','classification_evidence'])
        IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['version','recheck_after','last_seen_at','replay_count','classification_evidence']) THEN
        NEW.version := OLD.version + 1;
    ELSE
        NEW.version := OLD.version;
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER receipt_version ON payment_service.bank_transactions;
CREATE TRIGGER receipt_version BEFORE UPDATE ON payment_service.bank_transactions
    FOR EACH ROW EXECUTE FUNCTION payment_service.advance_receipt_version();
