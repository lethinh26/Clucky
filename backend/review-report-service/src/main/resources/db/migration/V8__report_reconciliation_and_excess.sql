-- BE-42: Separate reconciled bank transfers, pending reconciliation transfers, excess receipts, and expired-order receipts
ALTER TABLE review_report_service.daily_store_stats
    ADD COLUMN IF NOT EXISTS reconciled_transfer_amount NUMERIC(12, 0) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pending_reconciliation_amount NUMERIC(12, 0) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS excess_amount NUMERIC(12, 0) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS expired_receipt_amount NUMERIC(12, 0) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE review_report_service.order_projection_trackers
    ADD COLUMN IF NOT EXISTS reconciled_transfer_amount NUMERIC(12, 0) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pending_reconciliation_amount NUMERIC(12, 0) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS excess_amount NUMERIC(12, 0) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS expired_receipt_amount NUMERIC(12, 0) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reconciliation_status VARCHAR(40);
