SET search_path TO catalog_service, public;

INSERT INTO stores (id, name, address, phone, open_time, close_time, status, delivery_area)
VALUES
 (1, 'Clucky Lê Lợi (Flagship Store)', '128 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', '02873001234', '09:00', '22:30', 'ACTIVE', 'Quận 1, Quận 3, Quận 4, Bình Thạnh (bán kính 5km)'),
 (2, 'Clucky Phan Văn Trị', '245 Phan Văn Trị, Phường 11, Quận Gò Vấp, TP. Hồ Chí Minh', '02873005678', '09:00', '22:00', 'ACTIVE', 'Gò Vấp, Bình Thạnh, Phú Nhuận, Quận 12'),
 (3, 'Clucky Nguyễn Trãi', '192 Nguyễn Trãi, Phường 3, Quận 5, TP. Hồ Chí Minh', '02873009012', '10:00', '23:00', 'ACTIVE', 'Quận 5, Quận 10, Quận 11, Quận 6 (bán kính 6km)'),
 (4, 'Clucky Lê Văn Việt (Thủ Đức)', '88 Lê Văn Việt, Phường Hiệp Phú, TP. Thủ Đức, TP. Hồ Chí Minh', '02873003456', '10:00', '22:00', 'ACTIVE', 'Khu công nghệ cao, Làng Đại học, TP. Thủ Đức, Quận 9'),
 (5, 'Clucky Landmark 81 (Tạm đóng bảo trì)', 'Tầng B1, TTTM Landmark 81, 720A Điện Biên Phủ, Bình Thạnh, TP. Hồ Chí Minh', '02873007890', '09:30', '22:00', 'CLOSED_TEMP', 'Vinhomes Central Park, Bình Thạnh, Thảo Điền TP. Thủ Đức')
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, name, sort_order, is_active)
VALUES
 (1, 'Gà rán', 1, TRUE),
 (2, 'Burger', 2, TRUE),
 (3, 'Combo', 3, TRUE),
 (4, 'Món phụ', 4, TRUE),
 (5, 'Đồ uống', 5, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, category_id, name, description, base_price, image_url, image_public_id, kcal, spicy_level, is_active)
VALUES
 (1, 1, 'Gà rán giòn truyền thống', 'Miếng gà tươi ướp 12 loại gia vị độc quyền, chiên áp suất vàng rụm bên ngoài và mềm mọng nước bên trong.', 89000, 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=900&q=85', 'clucky/products/fried-chicken', 520, 1, TRUE),
 (2, 1, 'Cánh gà cay sốt mật ong', 'Cánh gà chiên giòn áo đều lớp sốt cay dịu quyện mật ong rừng thơm lừng, rắc mè rang thơm bùi.', 99000, 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=900&q=85', 'clucky/products/honey-wings', 460, 2, TRUE),
 (3, 2, 'Clucky Crispy Burger', 'Bánh mì brioche mềm xốp, kẹp ức gà chiên giòn rụm cỡ lớn, bắp cải tím, dưa leo chua và xốt mayonnaise truffle.', 69000, 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=900&q=85', 'clucky/products/crispy-burger', 610, 1, TRUE),
 (4, 2, 'Burger phô mai gà tan chảy', 'Ức gà phi lê chiên vàng giòn phủ đôi lát phô mai Cheddar béo ngậy kèm sốt phô mai ấm nồng.', 79000, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=85', 'clucky/products/cheese-burger', 650, 0, TRUE),
 (5, 4, 'Khoai tây chiên muối biển', 'Khoai tây nhập khẩu cắt bản lớn, chiên vàng ươm giòn rụm bên ngoài và mềm bùi bên trong.', 35000, 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=900&q=85', 'clucky/products/french-fries', 320, 0, TRUE),
 (6, 5, 'Trà đào cam sả thanh nhiệt', 'Trà ô long thượng hạng ủ lạnh, kết hợp tinh chất cam tươi, sả đập dập thơm mát và miếng đào giòn ngọt.', 35000, 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=85', 'clucky/products/peach-tea', 180, 0, TRUE),
 (7, 1, 'Gà sốt cay lửa Habanero', 'Dành riêng cho tín đồ ăn cay cực hạn. Sốt ớt Habanero cay bùng nổ nhưng hậu vị đậm đà khó cưỡng.', 105000, 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=900&q=85', 'clucky/products/habanero-chicken', 540, 2, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Product Options
INSERT INTO product_options (id, product_id, group_name, name, extra_price)
VALUES
 (1, 1, 'Kích thước', 'Tiêu chuẩn (Vừa)', 0),
 (2, 1, 'Kích thước', 'Lớn (Thêm 30% thịt)', 20000),
 (3, 1, 'Mức cay theo yêu cầu', 'Không cay (Ngọt thơm)', 0),
 (4, 1, 'Mức cay theo yêu cầu', 'Cay vừa (Tiêu chuẩn)', 0),
 (5, 1, 'Mức cay theo yêu cầu', 'Siêu cay (Ớt Habanero)', 0),
 (6, 2, 'Kích thước', 'Tiêu chuẩn (Vừa)', 0),
 (7, 2, 'Kích thước', 'Lớn (Thêm 30% thịt)', 20000),
 (8, 3, 'Loại bánh', 'Brioche bơ Pháp', 0),
 (9, 3, 'Loại bánh', 'Vỏ mè truyền thống', 0),
 (10, 6, 'Độ đá', '100% đá (Tiêu chuẩn)', 0),
 (11, 6, 'Độ đá', '50% đá', 0),
 (12, 6, 'Độ đá', 'Không đá', 0),
 (13, 6, 'Độ ngọt', '100% đường (Vừa miệng)', 0),
 (14, 6, 'Độ ngọt', '50% đường (Ít ngọt)', 0),
 (15, 6, 'Độ ngọt', 'Không thêm đường', 0)
ON CONFLICT (id) DO NOTHING;

-- Product Toppings
INSERT INTO product_toppings (id, product_id, topping_name, extra_price)
VALUES
 (1, 1, 'Sốt phô mai cay hảo hạng', 15000),
 (2, 1, 'Khoai tây nghiền sốt gravy', 25000),
 (3, 1, 'Bột phô mai tuyết phủ giòn', 10000),
 (4, 1, 'Trứng ốp la lòng đào', 10000),
 (5, 2, 'Sốt phô mai cay hảo hạng', 15000),
 (6, 3, 'Phô mai Cheddar lát thêm', 12000),
 (7, 3, 'Thịt xông khói áp chảo', 18000),
 (8, 5, 'Bột rong biển lắc', 8000),
 (9, 5, 'Bột phô mai tuyết', 10000),
 (10, 6, 'Thêm 2 lát đào giòn', 12000),
 (11, 6, 'Hạt chia organic', 8000)
ON CONFLICT (id) DO NOTHING;

-- Combos
INSERT INTO combos (id, name, description, combo_price, image_url, image_public_id, start_at, is_active)
VALUES
 (1, 'Combo Clucky Classic', '1 Miếng đùi gà giòn tan + 1 Phần khoai tây chiên giòn vàng + 1 Ly nước ngọt mát lạnh.', 129000, 'https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?auto=format&fit=crop&w=900&q=85', 'clucky/combos/classic', now(), TRUE),
 (2, 'Combo Family Feast', 'Phần ăn gia đình: 4 Miếng gà rán + 2 Burger Clucky + 2 Khoai tây chiên + 4 Ly nước.', 329000, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85', 'clucky/combos/family', now(), TRUE)
ON CONFLICT (id) DO NOTHING;

-- Combo Items
INSERT INTO combo_items (combo_id, product_id, quantity)
VALUES
 (1, 1, 1),
 (1, 5, 1),
 (2, 1, 4),
 (2, 3, 2),
 (2, 5, 2)
ON CONFLICT DO NOTHING;

-- Store Products (Availability per store)
INSERT INTO store_products (store_id, product_id, store_price, is_available, is_sold_out)
SELECT s.id, p.id, p.base_price, TRUE,
  CASE WHEN s.id = 1 AND p.id = 7 THEN TRUE ELSE FALSE END
FROM stores s CROSS JOIN products p
ON CONFLICT (store_id, product_id) DO NOTHING;

-- Store Inventory
INSERT INTO store_inventory (store_id, product_id, quantity_available, low_stock_threshold, updated_by, updated_at)
SELECT s.id, p.id,
  CASE
    WHEN s.id = 1 AND p.id = 7 THEN 0
    WHEN s.id = 1 AND p.id = 2 THEN 9
    WHEN s.id = 1 AND p.id = 4 THEN 5
    ELSE 50
  END,
  10, 1, now()
FROM stores s CROSS JOIN products p
ON CONFLICT (store_id, product_id) DO NOTHING;

-- Sequence alignment
SELECT setval(pg_get_serial_sequence('stores', 'id'), COALESCE((SELECT MAX(id) FROM stores), 1));
SELECT setval(pg_get_serial_sequence('categories', 'id'), COALESCE((SELECT MAX(id) FROM categories), 1));
SELECT setval(pg_get_serial_sequence('products', 'id'), COALESCE((SELECT MAX(id) FROM products), 1));
SELECT setval(pg_get_serial_sequence('product_options', 'id'), COALESCE((SELECT MAX(id) FROM product_options), 1));
SELECT setval(pg_get_serial_sequence('product_toppings', 'id'), COALESCE((SELECT MAX(id) FROM product_toppings), 1));
SELECT setval(pg_get_serial_sequence('combos', 'id'), COALESCE((SELECT MAX(id) FROM combos), 1));
SELECT setval(pg_get_serial_sequence('combo_items', 'id'), COALESCE((SELECT MAX(id) FROM combo_items), 1));
