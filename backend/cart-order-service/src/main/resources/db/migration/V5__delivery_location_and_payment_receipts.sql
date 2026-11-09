ALTER TABLE order_service.orders
    ADD COLUMN latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
    ADD COLUMN longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
    ADD COLUMN distance_km DOUBLE PRECISION CHECK (distance_km BETWEEN 0 AND 10),
    ADD COLUMN payment_id BIGINT,
    ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (payment_status IN ('PENDING', 'PAID', 'COLLECTED', 'REFUNDED'));

CREATE TABLE order_service.payment_event_receipts (
    event_id VARCHAR(160) PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES order_service.orders(id),
    correlation_id VARCHAR(128) NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
