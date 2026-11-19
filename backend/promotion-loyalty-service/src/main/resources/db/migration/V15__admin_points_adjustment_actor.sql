-- Identify the actor who performed a manual points adjustment.
-- Existing point transactions remain intact and retain their original history.
ALTER TABLE promotion_service.point_transactions
    ADD COLUMN actor_id BIGINT;

CREATE INDEX idx_point_history_admin_adjustment
    ON promotion_service.point_transactions(customer_id, created_at DESC, id DESC)
    WHERE actor_id IS NOT NULL AND type = 'ADJUST';
