CREATE TABLE IF NOT EXISTS payment_service.counter_payment_receipts (
    id BIGSERIAL PRIMARY KEY,
    receipt_code VARCHAR(60) NOT NULL UNIQUE,
    order_id BIGINT NOT NULL,
    order_code VARCHAR(40) NOT NULL,
    queue_number INT,
    store_id BIGINT NOT NULL,
    method VARCHAR(30) NOT NULL CHECK (method IN ('CASH', 'BANK_TRANSFER', 'SPLIT')),
    
    -- Các dòng tiền tính toán
    total_due NUMERIC(12, 0) NOT NULL CHECK (total_due >= 0),
    cash_amount NUMERIC(12, 0) NOT NULL DEFAULT 0 CHECK (cash_amount >= 0),
    cash_tendered NUMERIC(12, 0) DEFAULT 0 CHECK (cash_tendered >= 0),
    cash_change NUMERIC(12, 0) DEFAULT 0 CHECK (cash_change >= 0),
    rounding_difference NUMERIC(12, 0) NOT NULL DEFAULT 0,
    
    -- Tiền chuyển khoản & đối soát
    bank_amount_declared NUMERIC(12, 0) NOT NULL DEFAULT 0 CHECK (bank_amount_declared >= 0),
    bank_amount_reconciled NUMERIC(12, 0) NOT NULL DEFAULT 0 CHECK (bank_amount_reconciled >= 0),
    bank_ref_code VARCHAR(100),
    bank_tx_id VARCHAR(160),
    
    -- Trạng thái & Ngoại lệ
    status VARCHAR(30) NOT NULL CHECK (status IN ('PENDING_RECONCILIATION', 'RECONCILED', 'DISCREPANCY', 'VOIDED')),
    manual_acceptance BOOLEAN NOT NULL DEFAULT FALSE,
    discrepancy_amount NUMERIC(12, 0) DEFAULT 0,
    exception_reason TEXT,
    
    -- Nhân sự & Audit
    staff_id BIGINT NOT NULL,
    staff_name VARCHAR(120),
    print_count INT NOT NULL DEFAULT 0,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chỉ mục tra cứu
CREATE INDEX IF NOT EXISTS idx_counter_receipts_store_created 
    ON payment_service.counter_payment_receipts(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_counter_receipts_order_code 
    ON payment_service.counter_payment_receipts(order_code);
CREATE INDEX IF NOT EXISTS idx_counter_receipts_status 
    ON payment_service.counter_payment_receipts(status);
