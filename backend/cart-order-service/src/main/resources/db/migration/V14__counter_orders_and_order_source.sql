-- 1. Bỏ ràng buộc bắt buộc của customer_id để hỗ trợ khách vãng lai
ALTER TABLE order_service.orders ALTER COLUMN customer_id DROP NOT NULL;

-- 2. Bổ sung các trường phục vụ đơn quầy và vận hành Fast-food
ALTER TABLE order_service.orders 
    ADD COLUMN IF NOT EXISTS order_source VARCHAR(20) NOT NULL DEFAULT 'WEB',
    ADD COLUMN IF NOT EXISTS dining_option VARCHAR(20) NOT NULL DEFAULT 'TAKE_AWAY',
    ADD COLUMN IF NOT EXISTS queue_number INT;

-- 3. Ràng buộc bảo toàn tính toàn vẹn (Invariants):
-- Đơn tạo từ WEB bắt buộc phải có customer_id hợp lệ; Đơn quầy COUNTER cho phép NULL
ALTER TABLE order_service.orders 
    ADD CONSTRAINT chk_orders_source_customer 
    CHECK (
        (order_source = 'WEB' AND customer_id IS NOT NULL) OR 
        (order_source = 'COUNTER')
    );

-- 4. Ràng buộc enum cho order_source và dining_option
ALTER TABLE order_service.orders 
    ADD CONSTRAINT chk_orders_source_enum 
    CHECK (order_source IN ('WEB', 'COUNTER')),
    ADD CONSTRAINT chk_orders_dining_enum 
    CHECK (dining_option IN ('DINE_IN', 'TAKE_AWAY'));

-- 5. Tạo index phục vụ tìm kiếm số gọi món theo chi nhánh trong ngày
CREATE INDEX IF NOT EXISTS idx_orders_store_queue_created 
    ON order_service.orders(store_id, queue_number, created_at DESC);
