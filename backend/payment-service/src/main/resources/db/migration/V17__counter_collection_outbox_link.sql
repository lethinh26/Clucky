ALTER TABLE payment_service.collections
    ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE payment_service.counter_payment_receipts
    ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES payment_service.collections(id),
    ADD COLUMN IF NOT EXISTS collection_status VARCHAR(30) NOT NULL DEFAULT 'LEGACY';

ALTER TABLE payment_service.counter_payment_receipts
    ADD CONSTRAINT counter_receipt_collection_status_check
    CHECK (collection_status IN ('PENDING', 'ACCEPTED', 'CANCELLED', 'EXPIRED', 'SUPERSEDED', 'STALE_VERSION', 'LEGACY'));

CREATE UNIQUE INDEX IF NOT EXISTS one_counter_receipt_collection
    ON payment_service.counter_payment_receipts(collection_id)
    WHERE collection_id IS NOT NULL;
