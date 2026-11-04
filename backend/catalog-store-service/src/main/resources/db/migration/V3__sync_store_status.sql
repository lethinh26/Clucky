SET search_path TO catalog_service, public;

-- Đồng bộ trạng thái cũ ACTIVE sang OPEN
UPDATE stores SET status = 'OPEN' WHERE status = 'ACTIVE';

-- Cập nhật giá trị mặc định cho cột status thành OPEN
ALTER TABLE stores ALTER COLUMN status SET DEFAULT 'OPEN';

-- Thêm CHECK constraint để đảm bảo dữ liệu chỉ nhận OPEN, CLOSED_TEMP, INACTIVE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_stores_status'
    ) THEN
        ALTER TABLE stores ADD CONSTRAINT chk_stores_status CHECK (status IN ('OPEN', 'CLOSED_TEMP', 'INACTIVE'));
    END IF;
END $$;
