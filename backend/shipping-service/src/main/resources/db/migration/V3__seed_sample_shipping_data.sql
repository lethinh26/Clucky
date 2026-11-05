SET search_path TO shipping_service, public;

INSERT INTO shipments (id, order_id, store_id, customer_name, phone, address, fee, status, cod_amount)
VALUES
 (1, 1, 1, 'Lê Thu Hà', '0901000004', '12 Nguyễn Huệ, Quận 1', 15000, 'DELIVERED', 0),
 (2, 3, 1, 'Lê Thu Hà', '0901000004', '12 Nguyễn Huệ, Phường Bến Nghé, Quận 1', 15000, 'CREATED', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO shipping_fee_config (id, store_id, base_fee, per_km_fee, free_from_amount, area_note)
VALUES
 (1, 1, 15000, 5000, 200000, 'Áp dụng chi nhánh Quận 1'),
 (2, 2, 15000, 5000, 200000, 'Áp dụng chi nhánh Gò Vấp')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('shipping_service.shipments', 'id'), COALESCE((SELECT MAX(id) FROM shipping_service.shipments), 1));
SELECT setval(pg_get_serial_sequence('shipping_service.shipping_fee_config', 'id'), COALESCE((SELECT MAX(id) FROM shipping_service.shipping_fee_config), 1));
