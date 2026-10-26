-- Clucky sample data dump for local/demo only.
-- Password for all demo accounts is: 123456789
-- BCrypt hash generated for this dump; never use this password in production.

BEGIN;

INSERT INTO identity_service.users (id,email,phone,password_hash,full_name,role,store_id,status,email_verified)
VALUES
 (1,'admin@clucky.local','0901000001','$2b$12$DJTOZD9Ss4nedpOdoaDtEOm4y017xLeY5Gr5S2X83X58PWK8PnWJS','Clucky HQ Admin','ADMIN',NULL,'ACTIVE',TRUE),
 (2,'manager.d1@clucky.local','0901000002','$2b$12$DJTOZD9Ss4nedpOdoaDtEOm4y017xLeY5Gr5S2X83X58PWK8PnWJS','Nguyễn Minh Anh','STORE_MANAGER',1,'ACTIVE',TRUE),
 (3,'staff.d1@clucky.local','0901000003','$2b$12$DJTOZD9Ss4nedpOdoaDtEOm4y017xLeY5Gr5S2X83X58PWK8PnWJS','Trần Quốc Bảo','STAFF',1,'ACTIVE',TRUE),
 (4,'customer1@clucky.local','0901000004','$2b$12$DJTOZD9Ss4nedpOdoaDtEOm4y017xLeY5Gr5S2X83X58PWK8PnWJS','Lê Thu Hà','CUSTOMER',NULL,'ACTIVE',TRUE),
 (5,'customer2@clucky.local','0901000005','$2b$12$DJTOZD9Ss4nedpOdoaDtEOm4y017xLeY5Gr5S2X83X58PWK8PnWJS','Phạm Gia Huy','CUSTOMER',NULL,'ACTIVE',TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO catalog_service.stores (id,name,address,phone,open_time,close_time,status,delivery_area)
VALUES
 (1,'Clucky Lê Lợi','128 Lê Lợi, Quận 1, TP. Hồ Chí Minh','02873001234','09:00','22:30','ACTIVE','Quận 1, Quận 3'),
 (2,'Clucky Phan Văn Trị','245 Phan Văn Trị, Gò Vấp, TP. Hồ Chí Minh','02873005678','09:00','22:00','ACTIVE','Gò Vấp, Bình Thạnh')
ON CONFLICT (id) DO NOTHING;

INSERT INTO catalog_service.categories (id,name,sort_order,is_active)
VALUES (1,'Gà rán',1,TRUE),(2,'Burger',2,TRUE),(3,'Combo',3,TRUE),(4,'Đồ uống',4,TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO catalog_service.products (id,category_id,name,description,base_price,image_url,image_public_id,kcal,spicy_level,is_active)
VALUES
 (1,1,'Gà rán giòn truyền thống','Miếng gà mọng nước, phủ lớp vỏ giòn vàng đặc trưng của Clucky.','89000','https://images.unsplash.com/photo-1562967916-eb82221dfb92?w=1200','clucky/products/fried-chicken',520,1,TRUE),
 (2,1,'Cánh gà cay mật ong','Cánh gà giòn phủ sốt cay nhẹ và mật ong thơm.','79000','https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=1200','clucky/products/honey-wings',460,2,TRUE),
 (3,2,'Clucky Crispy Burger','Burger gà giòn, xà lách, phô mai và sốt đặc biệt.','99000','https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=1200','clucky/products/crispy-burger',610,1,TRUE),
 (4,4,'Trà đào cam sả','Trà đào thanh mát, dùng kèm lát cam tươi.','35000','https://images.unsplash.com/photo-1551024506-0bccd828d307?w=1200','clucky/products/peach-tea',180,0,TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO catalog_service.combos (id,name,description,combo_price,image_url,image_public_id,start_at,is_active)
VALUES
 (1,'Combo Clucky Classic','Gà rán giòn, khoai tây chiên và nước ngọt.','129000','https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=1200','clucky/combos/classic',now(),TRUE),
 (2,'Combo Family Feast','Phần ăn gia đình cho 3–4 người, nhiều lựa chọn món.','329000','https://images.unsplash.com/photo-1601050690597-df0568f70950?w=1200','clucky/combos/family',now(),TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO catalog_service.store_products (store_id,product_id,store_price,is_available,is_sold_out)
SELECT s.id,p.id,p.base_price,TRUE,FALSE FROM catalog_service.stores s CROSS JOIN catalog_service.products p
ON CONFLICT (store_id,product_id) DO NOTHING;

INSERT INTO catalog_service.store_inventory (store_id,product_id,quantity_available,low_stock_threshold)
SELECT s.id,p.id,100,10 FROM catalog_service.stores s CROSS JOIN catalog_service.products p
ON CONFLICT (store_id,product_id) DO NOTHING;

INSERT INTO identity_service.addresses (id,user_id,receiver_name,phone,province,district,ward,detail,is_default)
VALUES (1,4,'Lê Thu Hà','0901000004','TP. Hồ Chí Minh','Quận 1','Bến Nghé','12 Nguyễn Huệ',TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO promotion_service.vouchers (id,code,type,value,min_order_amount,max_discount,total_limit,used_count,start_at,end_at,scope,status)
VALUES (1,'CLUCKY10','PERCENT',10,150000,50000,1000,0,now()-interval '1 day',now()+interval '90 days','ALL','ACTIVE'),
       (2,'WELCOME30','AMOUNT',30000,199000,30000,500,0,now()-interval '1 day',now()+interval '30 days','ALL','ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO promotion_service.member_points (id,customer_id,total_points,tier)
VALUES (1,4,240,'SILVER'),(2,5,80,'MEMBER')
ON CONFLICT (id) DO NOTHING;

INSERT INTO notification_service.mail_templates (id,template_key,subject_template,body_template,is_active)
VALUES
 (1,'ORDER_CONFIRMED','Clucky — Đơn hàng {{orderCode}} đã được xác nhận','Xin chào {{customerName}}, đơn {{orderCode}} đã được xác nhận và đang được chuẩn bị.',TRUE),
 (2,'PAYMENT_CONFIRMED','Clucky — Thanh toán thành công cho đơn {{orderCode}}','Clucky đã ghi nhận thanh toán {{amount}} cho đơn hàng của bạn.',TRUE),
 (3,'OTP_REGISTER','Clucky — Mã xác thực tài khoản','Mã xác thực của bạn là {{otp}}. Mã có hiệu lực trong 5 phút.',TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_service.orders (id,order_code,customer_id,store_id,type,status,subtotal,discount_amount,points_used,points_amount,shipping_fee,total_amount,receiver_name,receiver_phone,delivery_address,note)
VALUES (1,'CLK-DEMO-0001',4,1,'DELIVERY','COMPLETED',178000,17800,0,0,15000,175200,'Lê Thu Hà','0901000004','12 Nguyễn Huệ, Quận 1','Không cay'),
       (2,'CLK-DEMO-0002',5,2,'PICKUP','CONFIRMED',129000,0,0,0,0,129000,'Phạm Gia Huy','0901000005','Clucky Phan Văn Trị','Lấy sau 18:30')
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_service.order_items (id,order_id,item_type,product_id,item_name,unit_price,quantity,line_total)
VALUES (1,1,'PRODUCT',1,'Gà rán giòn truyền thống',89000,2,178000),(2,2,'COMBO',NULL,'Combo Clucky Classic',129000,1,129000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO payment_service.payments (id,order_id,order_code,method,amount,status,paid_at)
VALUES (1,1,'CLK-DEMO-0001','BANK_TRANSFER',175200,'PAID',now()-interval '2 hours'),(2,2,'CLK-DEMO-0002','COD',129000,'PENDING',NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO shipping_service.shipments (id,order_id,store_id,customer_name,phone,address,fee,status,cod_amount)
VALUES (1,1,1,'Lê Thu Hà','0901000004','12 Nguyễn Huệ, Quận 1',15000,'DELIVERED',0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO notification_service.notifications (id,user_id,title,content,type,ref_id,is_read)
VALUES (1,4,'Đơn hàng đã hoàn thành','Đơn CLK-DEMO-0001 đã hoàn thành. Cảm ơn bạn đã đặt món tại Clucky!','ORDER',1,TRUE),
       (2,5,'Đơn hàng đã được xác nhận','Đơn CLK-DEMO-0002 đang được chi nhánh chuẩn bị.','ORDER',2,FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO review_report_service.reviews (id,customer_id,product_id,order_id,rating,comment,status)
VALUES (1,4,1,1,5,'Gà giòn, nóng và giao đúng thời gian. Sốt rất vừa miệng.','VISIBLE')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('identity_service.users','id'),COALESCE((SELECT MAX(id) FROM identity_service.users),1));
SELECT setval(pg_get_serial_sequence('catalog_service.products','id'),COALESCE((SELECT MAX(id) FROM catalog_service.products),1));
SELECT setval(pg_get_serial_sequence('order_service.orders','id'),COALESCE((SELECT MAX(id) FROM order_service.orders),1));

COMMIT;
