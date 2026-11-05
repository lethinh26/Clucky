CREATE TABLE IF NOT EXISTS review_report_service.order_projection_trackers (
    order_id BIGINT PRIMARY KEY,
    order_code VARCHAR(64),
    store_id BIGINT NOT NULL,
    stat_date DATE NOT NULL,
    payment_method VARCHAR(30),
    revenue_amount NUMERIC(12, 0) NOT NULL DEFAULT 0,
    cod_amount NUMERIC(12, 0) NOT NULL DEFAULT 0,
    transfer_amount NUMERIC(12, 0) NOT NULL DEFAULT 0,
    order_completed BOOLEAN NOT NULL DEFAULT FALSE,
    payment_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    contributed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_projection_store_date 
ON review_report_service.order_projection_trackers (store_id, stat_date);

CREATE TABLE IF NOT EXISTS review_report_service.processed_events (
    event_id VARCHAR(160) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    order_id BIGINT,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_processed_events_order_id
ON review_report_service.processed_events (order_id);
