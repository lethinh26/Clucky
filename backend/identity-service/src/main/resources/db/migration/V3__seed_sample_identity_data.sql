SET search_path TO identity_service, public;

INSERT INTO users (id, email, phone, password_hash, full_name, role, store_id, status, email_verified)
VALUES
 (1, 'admin@clucky.local', '0901000001', '$2b$12$DJTOZD9Ss4nedpOdoaDtEOm4y017xLeY5Gr5S2X83X58PWK8PnWJS', 'Clucky HQ Admin', 'ADMIN', NULL, 'ACTIVE', TRUE),
 (2, 'manager.d1@clucky.local', '0901000002', '$2b$12$DJTOZD9Ss4nedpOdoaDtEOm4y017xLeY5Gr5S2X83X58PWK8PnWJS', 'Nguyễn Minh Anh', 'STORE_MANAGER', 1, 'ACTIVE', TRUE),
 (3, 'staff.d1@clucky.local', '0901000003', '$2b$12$DJTOZD9Ss4nedpOdoaDtEOm4y017xLeY5Gr5S2X83X58PWK8PnWJS', 'Trần Quốc Bảo', 'STAFF', 1, 'ACTIVE', TRUE),
 (4, 'customer1@clucky.local', '0901000004', '$2b$12$DJTOZD9Ss4nedpOdoaDtEOm4y017xLeY5Gr5S2X83X58PWK8PnWJS', 'Lê Thu Hà', 'CUSTOMER', NULL, 'ACTIVE', TRUE),
 (5, 'customer2@clucky.local', '0901000005', '$2b$12$DJTOZD9Ss4nedpOdoaDtEOm4y017xLeY5Gr5S2X83X58PWK8PnWJS', 'Phạm Gia Huy', 'CUSTOMER', NULL, 'ACTIVE', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO addresses (id, user_id, receiver_name, phone, province, district, ward, detail, is_default)
VALUES (1, 4, 'Lê Thu Hà', '0901000004', 'TP. Hồ Chí Minh', 'Quận 1', 'Bến Nghé', '12 Nguyễn Huệ', TRUE)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('identity_service.users', 'id'), COALESCE((SELECT MAX(id) FROM identity_service.users), 1));
SELECT setval(pg_get_serial_sequence('identity_service.addresses', 'id'), COALESCE((SELECT MAX(id) FROM identity_service.addresses), 1));
