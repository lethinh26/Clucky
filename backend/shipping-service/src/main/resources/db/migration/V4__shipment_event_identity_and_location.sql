ALTER TABLE shipping_service.shipments
    ADD COLUMN customer_id BIGINT,
    ADD COLUMN source_event_id VARCHAR(160) UNIQUE,
    ADD COLUMN latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
    ADD COLUMN longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180);
