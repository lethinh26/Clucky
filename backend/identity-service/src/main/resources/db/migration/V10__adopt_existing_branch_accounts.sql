SELECT pg_advisory_xact_lock(192615);
LOCK TABLE identity_service.users IN SHARE ROW EXCLUSIVE MODE;

ALTER TABLE identity_service.branch_accounts ALTER COLUMN recovery_email DROP NOT NULL;
ALTER TABLE identity_service.branch_accounts ADD CONSTRAINT verified_recovery_email_present
    CHECK (NOT email_verified OR (recovery_email IS NOT NULL AND btrim(recovery_email) <> ''));

CREATE TEMP TABLE branch_account_adoption ON COMMIT DROP AS
SELECT account.id, account.store_id, account.role, COALESCE(account.login_name, account.email) AS login
FROM identity_service.users account
WHERE account.role IN ('STORE_MANAGER', 'STAFF')
    AND NOT EXISTS (SELECT 1 FROM identity_service.branch_accounts branch WHERE branch.store_id = account.store_id);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM branch_account_adoption WHERE store_id IS NULL OR store_id <= 0 OR login IS NULL OR btrim(login) = '') THEN
        RAISE EXCEPTION 'Existing branch accounts need a valid store and login before adoption';
    END IF;
    IF EXISTS (SELECT store_id FROM branch_account_adoption GROUP BY store_id HAVING count(*) <> 2 OR count(DISTINCT role) <> 2) THEN
        RAISE EXCEPTION 'Existing branch accounts must contain exactly one Manager and one Staff per store; no account is selected or retired automatically';
    END IF;
END $$;

INSERT INTO identity_service.branch_accounts (store_id, request_key, request_hash)
SELECT store_id, gen_random_uuid(), encode(sha256(convert_to('adopt-existing-accounts-v1:' || store_id, 'UTF8')), 'hex')
FROM branch_account_adoption GROUP BY store_id;

UPDATE identity_service.users account
SET login_name = adopted.login, current_branch_account = TRUE, updated_at = now()
FROM branch_account_adoption adopted WHERE adopted.id = account.id;

DO $$
BEGIN
    IF EXISTS (
        SELECT account.store_id FROM identity_service.users account
        WHERE account.store_id IN (SELECT store_id FROM branch_account_adoption) AND account.current_branch_account
        GROUP BY account.store_id HAVING count(*) <> 2 OR count(DISTINCT account.role) <> 2
    ) THEN
        RAISE EXCEPTION 'Adopted branch accounts do not satisfy the current-account pair invariant';
    END IF;
END $$;
