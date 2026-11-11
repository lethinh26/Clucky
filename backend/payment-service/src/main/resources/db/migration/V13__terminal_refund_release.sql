CREATE TABLE payment_service.refund_releases (
    refund_request_id BIGINT PRIMARY KEY CHECK (refund_request_id > 0),
    released_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO payment_service.refund_releases(refund_request_id,released_at)
    SELECT refund_request_id,coalesce(released_at,now()) FROM payment_service.refund_reservations WHERE status='RELEASED';
