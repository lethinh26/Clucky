SET search_path TO order_service, public;

-- V8: Seed realistic counter orders for fast-food staff workspace and POS
INSERT INTO orders (
    id, order_code, customer_id, store_id, type, status,
    subtotal, discount_amount, points_used, points_amount, shipping_fee, total_amount,
    receiver_name, receiver_phone, delivery_address, note,
    payment_method, payment_status, order_source, dining_option, queue_number,
    created_at, updated_at
) VALUES
 (10, 'CLK-POS-0010', NULL, 1, 'PICKUP', 'CONFIRMED', 188000, 0, 0, 0, 0, 188000,
  'Khách tại quầy #010', 'Tại quầy', 'Clucky Lê Lợi (Quầy thu ngân)', 'Ăn tại chỗ, sốt phô mai để riêng',
  'CASH', 'PENDING', 'COUNTER', 'DINE_IN', 10,
  now() - interval '2 minutes', now() - interval '2 minutes'),

 (11, 'CLK-POS-0011', NULL, 1, 'PICKUP', 'CONFIRMED', 134000, 0, 0, 0, 0, 134000,
  'Khách mang về #011', 'Tại quầy', 'Clucky Lê Lợi (Quầy thu ngân)', 'Mang về, tương cà nhiều',
  'BANK_TRANSFER', 'PENDING', 'COUNTER', 'TAKE_AWAY', 11,
  now() - interval '4 minutes', now() - interval '4 minutes'),

 (12, 'CLK-POS-0012', NULL, 1, 'PICKUP', 'PREPARING', 218000, 0, 0, 0, 0, 218000,
  'Khách tại quầy #012', 'Tại quầy', 'Clucky Lê Lợi (Bàn số 3)', 'Gà giòn cay nóng, nước ngọt không đá',
  'CASH', 'COLLECTED', 'COUNTER', 'DINE_IN', 12,
  now() - interval '13 minutes', now() - interval '10 minutes'),

 (13, 'CLK-POS-0013', NULL, 1, 'PICKUP', 'PREPARING', 129000, 0, 0, 0, 0, 129000,
  'Khách mang về #013', 'Tại quầy', 'Clucky Lê Lợi (Quầy thu ngân)', 'Mang đi ngay sau khi xong',
  'BANK_TRANSFER', 'PAID', 'COUNTER', 'TAKE_AWAY', 13,
  now() - interval '6 minutes', now() - interval '5 minutes'),

 (14, 'CLK-POS-0014', NULL, 1, 'PICKUP', 'READY', 164000, 0, 0, 0, 0, 164000,
  'Khách tại quầy #014', 'Tại quầy', 'Clucky Lê Lợi (Bàn số 5)', 'Bàn số 5, gọi loa khi sẵn sàng',
  'CASH', 'COLLECTED', 'COUNTER', 'DINE_IN', 14,
  now() - interval '8 minutes', now() - interval '2 minutes'),

 (15, 'CLK-POS-0015', NULL, 1, 'PICKUP', 'READY', 329000, 0, 0, 0, 0, 329000,
  'Khách mang về #015', 'Tại quầy', 'Clucky Lê Lợi (Quầy thu ngân)', 'Đóng hộp giấy quà tặng',
  'BANK_TRANSFER', 'PAID', 'COUNTER', 'TAKE_AWAY', 15,
  now() - interval '10 minutes', now() - interval '3 minutes'),

 (16, 'CLK-POS-0016', NULL, 1, 'PICKUP', 'COMPLETED', 144000, 0, 0, 0, 0, 144000,
  'Khách tại quầy #016', 'Tại quầy', 'Clucky Lê Lợi (Bàn số 2)', 'Đã hoàn tất bàn giao tại bàn',
  'CASH', 'COLLECTED', 'COUNTER', 'DINE_IN', 16,
  now() - interval '30 minutes', now() - interval '20 minutes'),

 (17, 'CLK-POS-0017', NULL, 1, 'PICKUP', 'COMPLETED', 129000, 0, 0, 0, 0, 129000,
  'Khách mang về #017', 'Tại quầy', 'Clucky Lê Lợi (Quầy thu ngân)', 'Đã nhận đủ và mang đi',
  'SPLIT', 'PAID', 'COUNTER', 'TAKE_AWAY', 17,
  now() - interval '45 minutes', now() - interval '35 minutes'),

 (18, 'CLK-POS-0018', NULL, 1, 'PICKUP', 'CANCELLED', 105000, 0, 0, 0, 0, 105000,
  'Khách tại quầy #018', 'Tại quầy', 'Clucky Lê Lợi (Quầy thu ngân)', 'Khách bận việc đột xuất hủy trước khi chế biến',
  'CASH', 'PENDING', 'COUNTER', 'DINE_IN', 18,
  now() - interval '60 minutes', now() - interval '58 minutes')
ON CONFLICT (id) DO NOTHING;

-- Order Items
INSERT INTO order_items (
    id, order_id, item_type, product_id, combo_id, item_name, unit_price, quantity, line_total, options_snapshot, toppings_snapshot, note
) VALUES
 (10, 10, 'PRODUCT', 1, NULL, 'Gà rán giòn truyền thống', 89000, 1, 89000, '[{"groupName":"Mức cay","name":"Cay vừa","extraPrice":0}]'::jsonb, '[]'::jsonb, 'Để sốt riêng'),
 (11, 10, 'PRODUCT', 2, NULL, 'Cánh gà cay sốt mật ong', 99000, 1, 99000, '[{"groupName":"Kích thước","name":"Tiêu chuẩn","extraPrice":0}]'::jsonb, '[]'::jsonb, NULL),

 (12, 11, 'PRODUCT', 3, NULL, 'Clucky Crispy Burger', 69000, 1, 69000, '[{"groupName":"Loại bánh","name":"Brioche bơ Pháp","extraPrice":0}]'::jsonb, '[]'::jsonb, NULL),
 (13, 11, 'PRODUCT', 5, NULL, 'Khoai tây chiên muối biển', 35000, 1, 35000, '[]'::jsonb, '[]'::jsonb, NULL),
 (14, 11, 'PRODUCT', 6, NULL, 'Trà đào cam sả thanh nhiệt', 30000, 1, 30000, '[{"groupName":"Độ ngọt","name":"50% đường","extraPrice":0}]'::jsonb, '[]'::jsonb, NULL),

 (15, 12, 'PRODUCT', 1, NULL, 'Gà rán giòn truyền thống', 109000, 2, 218000, '[{"groupName":"Kích thước","name":"Lớn (Thêm 30% thịt)","extraPrice":20000},{"groupName":"Mức cay","name":"Siêu cay","extraPrice":0}]'::jsonb, '[{"name":"Sốt phô mai cay","extraPrice":15000}]'::jsonb, 'Cay nhiều'),

 (16, 13, 'COMBO', NULL, 1, 'Combo Clucky Classic', 129000, 1, 129000, '[{"groupName":"Đổi nước","name":"7Up","extraPrice":0}]'::jsonb, '[]'::jsonb, 'Mang về'),

 (17, 14, 'PRODUCT', 4, NULL, 'Burger phô mai gà tan chảy', 79000, 1, 79000, '[]'::jsonb, '[{"name":"Phô mai Cheddar thêm","extraPrice":12000}]'::jsonb, NULL),
 (18, 14, 'PRODUCT', 2, NULL, 'Cánh gà cay sốt mật ong', 85000, 1, 85000, '[]'::jsonb, '[]'::jsonb, NULL),

 (19, 15, 'COMBO', NULL, 2, 'Combo Family Feast', 329000, 1, 329000, '[{"groupName":"Đổi món phụ","name":"Bắp cải trộn","extraPrice":0}]'::jsonb, '[]'::jsonb, 'Phần ăn gia đình'),

 (20, 16, 'PRODUCT', 1, NULL, 'Gà rán giòn truyền thống', 89000, 1, 89000, '[]'::jsonb, '[]'::jsonb, NULL),
 (21, 16, 'PRODUCT', 5, NULL, 'Khoai tây chiên muối biển', 55000, 1, 55000, '[]'::jsonb, '[{"name":"Bột rong biển lắc","extraPrice":8000}]'::jsonb, NULL),

 (22, 17, 'COMBO', NULL, 1, 'Combo Clucky Classic', 129000, 1, 129000, '[]'::jsonb, '[]'::jsonb, NULL),

 (23, 18, 'PRODUCT', 7, NULL, 'Gà sốt cay lửa Habanero', 105000, 1, 105000, '[]'::jsonb, '[]'::jsonb, NULL)
ON CONFLICT (id) DO NOTHING;

-- Order Status History
INSERT INTO order_status_history (id, order_id, from_status, to_status, changed_by, changed_role, reason, created_at)
VALUES
 (20, 10, NULL, 'CONFIRMED', 3, 'STAFF', 'Tạo đơn quầy nhanh #010', now() - interval '2 minutes'),
 (21, 11, NULL, 'CONFIRMED', 3, 'STAFF', 'Tạo đơn quầy nhanh #011', now() - interval '4 minutes'),
 (22, 12, NULL, 'CONFIRMED', 3, 'STAFF', 'Tạo đơn quầy #012', now() - interval '13 minutes'),
 (23, 12, 'CONFIRMED', 'PREPARING', 3, 'STAFF', 'Bếp nhận chế biến', now() - interval '10 minutes'),
 (24, 13, NULL, 'CONFIRMED', 3, 'STAFF', 'Tạo đơn quầy #013', now() - interval '6 minutes'),
 (25, 13, 'CONFIRMED', 'PREPARING', 3, 'STAFF', 'Bếp nhận chế biến', now() - interval '5 minutes'),
 (26, 14, NULL, 'CONFIRMED', 3, 'STAFF', 'Tạo đơn quầy #014', now() - interval '8 minutes'),
 (27, 14, 'CONFIRMED', 'PREPARING', 3, 'STAFF', 'Bếp chế biến', now() - interval '6 minutes'),
 (28, 14, 'PREPARING', 'READY', 3, 'STAFF', 'Món sẵn sàng gọi khách #014', now() - interval '2 minutes'),
 (29, 15, NULL, 'CONFIRMED', 3, 'STAFF', 'Tạo đơn quầy #015', now() - interval '10 minutes'),
 (30, 15, 'CONFIRMED', 'PREPARING', 3, 'STAFF', 'Bếp chế biến', now() - interval '7 minutes'),
 (31, 15, 'PREPARING', 'READY', 3, 'STAFF', 'Món sẵn sàng gọi khách #015', now() - interval '3 minutes'),
 (32, 16, NULL, 'CONFIRMED', 3, 'STAFF', 'Tạo đơn quầy #016', now() - interval '30 minutes'),
 (33, 16, 'CONFIRMED', 'PREPARING', 3, 'STAFF', 'Bếp chế biến', now() - interval '28 minutes'),
 (34, 16, 'PREPARING', 'READY', 3, 'STAFF', 'Sẵn sàng giao', now() - interval '23 minutes'),
 (35, 16, 'READY', 'COMPLETED', 3, 'STAFF', 'Đã thu tiền & bàn giao thành công', now() - interval '20 minutes'),
 (36, 17, NULL, 'CONFIRMED', 3, 'STAFF', 'Tạo đơn quầy #017', now() - interval '45 minutes'),
 (37, 17, 'CONFIRMED', 'PREPARING', 3, 'STAFF', 'Bếp chế biến', now() - interval '43 minutes'),
 (38, 17, 'PREPARING', 'READY', 3, 'STAFF', 'Sẵn sàng giao', now() - interval '38 minutes'),
 (39, 17, 'READY', 'COMPLETED', 3, 'STAFF', 'Đã thu tiền & bàn giao thành công', now() - interval '35 minutes'),
 (40, 18, NULL, 'CONFIRMED', 3, 'STAFF', 'Tạo đơn quầy #018', now() - interval '60 minutes'),
 (41, 18, 'CONFIRMED', 'CANCELLED', 3, 'STAFF', 'Khách đổi ý hủy đơn', now() - interval '58 minutes')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('order_service.orders', 'id'), COALESCE((SELECT MAX(id) FROM order_service.orders), 1));
SELECT setval(pg_get_serial_sequence('order_service.order_items', 'id'), COALESCE((SELECT MAX(id) FROM order_service.order_items), 1));
SELECT setval(pg_get_serial_sequence('order_service.order_status_history', 'id'), COALESCE((SELECT MAX(id) FROM order_service.order_status_history), 1));
