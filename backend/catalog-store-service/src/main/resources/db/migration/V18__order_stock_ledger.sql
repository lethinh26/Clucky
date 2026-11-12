CREATE TABLE catalog_service.inventory_projection_start (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO catalog_service.inventory_projection_start (id) VALUES (TRUE);

CREATE TABLE catalog_service.order_stock_ledger (
    order_id BIGINT PRIMARY KEY CHECK (order_id > 0),
    store_id BIGINT NOT NULL CHECK (store_id > 0),
    status VARCHAR(16) NOT NULL CHECK (status IN ('PENDING', 'DEDUCTED', 'CANCELLED')),
    quantities JSONB NOT NULL DEFAULT '{}',
    event_id VARCHAR(160) NOT NULL,
    correlation_id VARCHAR(128) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
