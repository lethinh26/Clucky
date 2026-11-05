SET search_path TO payment_service, public;

INSERT INTO payments (id, order_id, order_code, method, amount, status, paid_at)
VALUES
 (1, 1, 'CLK-DEMO-0001', 'BANK_TRANSFER', 175200, 'PAID', now() - interval '2 days'),
 (2, 2, 'CLK-DEMO-0002', 'COD', 129000, 'PENDING', NULL),
 (3, 3, 'CLK-DEMO-0003', 'BANK_TRANSFER', 213000, 'PAID', now() - interval '20 minutes'),
 (4, 4, 'CLK-DEMO-0004', 'COD', 129000, 'PENDING', NULL),
 (5, 5, 'CLK-DEMO-0005', 'BANK_TRANSFER', 120000, 'PENDING', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO bank_accounts_config (id, bank_name, account_no, account_name, is_active)
VALUES
 (1, 'Vietcombank', '0071001234567', 'CONG TY TNHH CLUCKY VIET NAM', TRUE)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('payment_service.payments', 'id'), COALESCE((SELECT MAX(id) FROM payment_service.payments), 1));
SELECT setval(pg_get_serial_sequence('payment_service.bank_accounts_config', 'id'), COALESCE((SELECT MAX(id) FROM payment_service.bank_accounts_config), 1));
