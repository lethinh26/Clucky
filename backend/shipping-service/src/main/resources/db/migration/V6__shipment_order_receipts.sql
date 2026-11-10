CREATE TABLE shipping_service.order_created_receipts (
    event_id VARCHAR(160) PRIMARY KEY,
    order_id BIGINT NOT NULL CHECK (order_id > 0),
    fingerprint CHAR(64) NOT NULL,
    correlation_id VARCHAR(128) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX shipment_order_receipts_order ON shipping_service.order_created_receipts(order_id);
