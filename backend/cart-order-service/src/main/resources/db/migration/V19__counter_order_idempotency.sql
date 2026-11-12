CREATE TABLE IF NOT EXISTS order_service.counter_order_operations (
    idempotency_key VARCHAR(128) NOT NULL,
    store_id BIGINT NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    order_id BIGINT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (store_id, idempotency_key)
);
