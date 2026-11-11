CREATE TABLE shipping_service.shipping_policy (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    fee NUMERIC(12,0) CHECK (fee > 0),
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO shipping_service.shipping_policy(id) VALUES (1);
