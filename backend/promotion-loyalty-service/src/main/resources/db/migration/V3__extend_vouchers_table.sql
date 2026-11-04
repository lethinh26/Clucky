ALTER TABLE promotion_service.vouchers
    ADD COLUMN title VARCHAR(255),
    ADD COLUMN description TEXT,
    ADD COLUMN created_by BIGINT,
    ADD COLUMN approved_by BIGINT,
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_scope_store ON vouchers(scope, store_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);

-- Seed initial voucher data
INSERT INTO vouchers (code, title, description, type, value, min_order_amount, max_discount, total_limit, used_count, start_at, end_at, scope, store_id, status)
VALUES 
('CLUCKYGIAM20', 'Giảm 20.000đ cho đơn từ 99.000đ', 'Áp dụng cho toàn bộ thực đơn tại tất cả chi nhánh Clucky.', 'AMOUNT', 20000, 99000, NULL, 1000, 0, now() - INTERVAL '1 day', now() + INTERVAL '90 days', 'ALL', NULL, 'ACTIVE'),
('CLUCKYFREESHIP', 'Miễn phí vận chuyển 20.000đ', 'Miễn phí vận chuyển cho đơn giao tận nơi có giá trị từ 150.000đ.', 'AMOUNT', 20000, 150000, NULL, 500, 0, now() - INTERVAL '1 day', now() + INTERVAL '60 days', 'ALL', NULL, 'ACTIVE'),
('CLUCKYPROMO15', 'Giảm 15% tối đa 50.000đ', 'Thưởng thức gà sốt cay nồng cùng ưu đãi giảm 15% tổng hóa đơn.', 'PERCENT', 15, 120000, 50000, 800, 0, now() - INTERVAL '1 day', now() + INTERVAL '45 days', 'ALL', NULL, 'ACTIVE'),
('CLUCKYQ1VIP', 'Giảm 30.000đ tại Clucky Quận 1', 'Đặc quyền cho khách ghé hoặc đặt món tại chi nhánh Quận 1.', 'AMOUNT', 30000, 180000, NULL, 200, 0, now() - INTERVAL '1 day', now() + INTERVAL '60 days', 'STORE', 1, 'ACTIVE')
ON CONFLICT (code) DO NOTHING;

