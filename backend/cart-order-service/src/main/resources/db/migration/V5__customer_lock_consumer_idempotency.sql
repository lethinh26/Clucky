CREATE TABLE order_service.consumed_events (
    event_id VARCHAR(160) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    consumed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
