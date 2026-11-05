SET search_path TO promotion_service, public;

INSERT INTO member_points (id, customer_id, total_points, tier, updated_at)
VALUES
 (1, 4, 240, 'SILVER', now()),
 (2, 5, 80, 'MEMBER', now())
ON CONFLICT (customer_id) DO NOTHING;

INSERT INTO loyalty_config (id, earn_rate, redeem_rate, updated_by)
VALUES
 (1, 0.0100, 1000.0000, 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('promotion_service.member_points', 'id'), COALESCE((SELECT MAX(id) FROM promotion_service.member_points), 1));
SELECT setval(pg_get_serial_sequence('promotion_service.loyalty_config', 'id'), COALESCE((SELECT MAX(id) FROM promotion_service.loyalty_config), 1));
