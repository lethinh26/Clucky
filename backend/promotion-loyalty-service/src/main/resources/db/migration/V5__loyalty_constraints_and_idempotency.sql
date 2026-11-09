SET search_path TO promotion_service, public;

-- Enforce non-negative total points
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_member_points_non_negative'
    ) THEN
        ALTER TABLE promotion_service.member_points
            ADD CONSTRAINT chk_member_points_non_negative CHECK (total_points >= 0);
    END IF;
END $$;

-- Enforce singleton loyalty config (only row with id = 1 can exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_loyalty_config_single_row'
    ) THEN
        ALTER TABLE promotion_service.loyalty_config
            ADD CONSTRAINT chk_loyalty_config_single_row CHECK (id = 1);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_loyalty_config_rates'
    ) THEN
        ALTER TABLE promotion_service.loyalty_config
            ADD CONSTRAINT chk_loyalty_config_rates CHECK (earn_rate > 0 AND redeem_rate > 0);
    END IF;
END $$;

-- Extend point_transactions with operation_key and reason for idempotency and audit
ALTER TABLE promotion_service.point_transactions
    ADD COLUMN IF NOT EXISTS operation_key VARCHAR(120),
    ADD COLUMN IF NOT EXISTS reason VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS uq_point_transactions_operation_key
    ON promotion_service.point_transactions (operation_key)
    WHERE operation_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_point_transactions_customer_created
    ON promotion_service.point_transactions (customer_id, created_at DESC);
