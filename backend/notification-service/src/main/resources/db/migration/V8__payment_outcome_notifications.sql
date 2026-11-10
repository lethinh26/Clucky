CREATE TABLE notification_service.payment_outcomes (
    order_id BIGINT PRIMARY KEY, outcome VARCHAR(20) NOT NULL,
    confirmed BOOLEAN NOT NULL DEFAULT FALSE, failed BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
