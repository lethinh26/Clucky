SET search_path TO order_service, public;

INSERT INTO orders (id, order_code, customer_id, store_id, type, status, subtotal, discount_amount, points_used, points_amount, shipping_fee, total_amount, receiver_name, receiver_phone, delivery_address, note, payment_method, created_at, updated_at)
VALUES
 (1, 'CLK-DEMO-0001', 4, 1, 'DELIVERY', 'COMPLETED', 178000, 17800, 0, 0, 15000, 175200, 'Lê Thu Hà', '0901000004', '12 Nguyễn Huệ, Quận 1', 'Không cay', 'BANK_TRANSFER', now() - interval '2 days', now() - interval '2 days'),
 (2, 'CLK-DEMO-0002', 5, 2, 'PICKUP', 'CONFIRMED', 129000, 0, 0, 0, 0, 129000, 'Phạm Gia Huy', '0901000005', 'Clucky Phan Văn Trị', 'Lấy sau 18:30', 'COD', now() - interval '1 hour', now() - interval '1 hour'),
 (3, 'CLK-DEMO-0003', 4, 1, 'DELIVERY', 'PREPARING', 198000, 0, 0, 0, 15000, 213000, 'Lê Thu Hà', '0901000004', '12 Nguyễn Huệ, Phường Bến Nghé, Quận 1', 'Để sốt riêng giúp mình', 'BANK_TRANSFER', now() - interval '30 minutes', now() - interval '15 minutes'),
 (4, 'CLK-DEMO-0004', 5, 1, 'PICKUP', 'READY', 129000, 0, 0, 0, 0, 129000, 'Phạm Gia Huy', '0901000005', 'Nhận tại quầy Clucky Lê Lợi', 'Ghé lấy lúc 12h', 'COD', now() - interval '45 minutes', now() - interval '5 minutes'),
 (5, 'CLK-DEMO-0005', 4, 1, 'DELIVERY', 'PENDING_PAYMENT', 105000, 0, 0, 0, 15000, 120000, 'Lê Thu Hà', '0901000004', '12 Nguyễn Huệ, Phường Bến Nghé, Quận 1', 'Chuyển khoản VietQR', 'BANK_TRANSFER', now() - interval '10 minutes', now() - interval '10 minutes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (id, order_id, item_type, product_id, combo_id, item_name, unit_price, quantity, line_total, options_snapshot, toppings_snapshot, note)
VALUES
 (1, 1, 'PRODUCT', 1, NULL, 'Gà rán giòn truyền thống', 89000, 2, 178000, '[]'::jsonb, '[]'::jsonb, NULL),
 (2, 2, 'COMBO', NULL, 1, 'Combo Clucky Classic', 129000, 1, 129000, '[]'::jsonb, '[]'::jsonb, NULL),
 (3, 3, 'PRODUCT', 2, NULL, 'Cánh gà cay sốt mật ong', 99000, 2, 198000, '[]'::jsonb, '[]'::jsonb, 'Để sốt riêng'),
 (4, 4, 'COMBO', NULL, 1, 'Combo Clucky Classic', 129000, 1, 129000, '[]'::jsonb, '[]'::jsonb, NULL),
 (5, 5, 'PRODUCT', 7, NULL, 'Gà sốt cay lửa Habanero', 105000, 1, 105000, '[]'::jsonb, '[]'::jsonb, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_status_history (id, order_id, from_status, to_status, changed_by, changed_role, reason, created_at)
VALUES
 (1, 1, NULL, 'CONFIRMED', NULL, 'SYSTEM', 'Đơn hàng mới', now() - interval '2 days'),
 (2, 1, 'CONFIRMED', 'PREPARING', 3, 'STAFF', 'Bắt đầu chế biến', now() - interval '2 days' + interval '5 minutes'),
 (3, 1, 'PREPARING', 'READY', 3, 'STAFF', 'Món ăn đã sẵn sàng', now() - interval '2 days' + interval '20 minutes'),
 (4, 1, 'READY', 'SHIPPING', 3, 'STAFF', 'Bàn giao tài xế', now() - interval '2 days' + interval '25 minutes'),
 (5, 1, 'SHIPPING', 'COMPLETED', 3, 'STAFF', 'Giao hàng thành công', now() - interval '2 days' + interval '45 minutes'),
 (6, 2, NULL, 'CONFIRMED', NULL, 'SYSTEM', 'Đơn hàng mới', now() - interval '1 hour'),
 (7, 3, NULL, 'CONFIRMED', NULL, 'SYSTEM', 'Đơn hàng mới', now() - interval '30 minutes'),
 (8, 3, 'CONFIRMED', 'PREPARING', 3, 'STAFF', 'Bắt đầu chế biến', now() - interval '15 minutes'),
 (9, 4, NULL, 'CONFIRMED', NULL, 'SYSTEM', 'Đơn hàng mới', now() - interval '45 minutes'),
 (10, 4, 'CONFIRMED', 'PREPARING', 3, 'STAFF', 'Bắt đầu chế biến', now() - interval '30 minutes'),
 (11, 4, 'PREPARING', 'READY', 3, 'STAFF', 'Món ăn đã sẵn sàng tại quầy', now() - interval '5 minutes'),
 (12, 5, NULL, 'PENDING_PAYMENT', NULL, 'SYSTEM', 'Chờ khách chuyển khoản', now() - interval '10 minutes')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('order_service.orders', 'id'), COALESCE((SELECT MAX(id) FROM order_service.orders), 1));
SELECT setval(pg_get_serial_sequence('order_service.order_items', 'id'), COALESCE((SELECT MAX(id) FROM order_service.order_items), 1));
SELECT setval(pg_get_serial_sequence('order_service.order_status_history', 'id'), COALESCE((SELECT MAX(id) FROM order_service.order_status_history), 1));
