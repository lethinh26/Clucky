SET search_path TO payment_service, public;

CREATE TABLE IF NOT EXISTS payment_service.refund_reservations (
    id BIGSERIAL PRIMARY KEY,
    refund_request_id BIGINT NOT NULL UNIQUE,
    order_id BIGINT NOT NULL,
    order_code VARCHAR(40) NOT NULL,
    amount NUMERIC(12,0) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'HELD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmed_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refund_reservations_order_id ON payment_service.refund_reservations(order_id);

