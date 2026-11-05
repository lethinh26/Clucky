SET search_path TO notification_service, public;

-- Add operation_key to notifications for in-app idempotency
ALTER TABLE notification_service.notifications
    ADD COLUMN IF NOT EXISTS operation_key VARCHAR(180);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_operation_key
    ON notification_service.notifications (operation_key)
    WHERE operation_key IS NOT NULL;

-- Add correlation_id and variables to email_logs for traceability and retry rendering
ALTER TABLE notification_service.email_logs
    ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(128),
    ADD COLUMN IF NOT EXISTS variables TEXT;

-- Seed additional standard templates if not present
INSERT INTO notification_service.mail_templates (id, template_key, subject_template, body_template, is_active)
VALUES
 (4, 'ORDER_COMPLETED', 'Clucky — Đơn hàng {{orderCode}} đã hoàn tất', 'Xin chào {{customerName}}, đơn hàng {{orderCode}} của bạn đã hoàn tất thành công. Cảm ơn bạn đã đồng hành cùng Clucky!', TRUE),
 (5, 'ORDER_CANCELLED', 'Clucky — Đơn hàng {{orderCode}} đã bị hủy', 'Xin chào {{customerName}}, đơn hàng {{orderCode}} đã bị hủy. Lý do: {{reason}}.', TRUE),
 (6, 'PAYMENT_FAILED', 'Clucky — Thanh toán thất bại cho đơn {{orderCode}}', 'Thanh toán cho đơn hàng {{orderCode}} không thành công. Vui lòng thử lại hoặc chọn phương thức khác.', TRUE)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('notification_service.mail_templates', 'id'), COALESCE((SELECT MAX(id) FROM notification_service.mail_templates), 1));

