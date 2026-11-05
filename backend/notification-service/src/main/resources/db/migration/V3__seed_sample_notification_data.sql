SET search_path TO notification_service, public;

INSERT INTO mail_templates (id, template_key, subject_template, body_template, is_active)
VALUES
 (1, 'ORDER_CONFIRMED', 'Clucky — Đơn hàng {{orderCode}} đã được xác nhận', 'Xin chào {{customerName}}, đơn {{orderCode}} đã được xác nhận và đang được chuẩn bị.', TRUE),
 (2, 'PAYMENT_CONFIRMED', 'Clucky — Thanh toán thành công cho đơn {{orderCode}}', 'Clucky đã ghi nhận thanh toán {{amount}} cho đơn hàng của bạn.', TRUE),
 (3, 'OTP_REGISTER', 'Clucky — Mã xác thực tài khoản', 'Mã xác thực của bạn là {{otp}}. Mã có hiệu lực trong 5 phút.', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO notifications (id, user_id, title, content, type, ref_id, is_read, created_at)
VALUES
 (1, 4, 'Đơn hàng đã hoàn thành', 'Đơn CLK-DEMO-0001 đã hoàn thành. Cảm ơn bạn đã đặt món tại Clucky!', 'ORDER', 1, TRUE, now() - interval '2 days'),
 (2, 5, 'Đơn hàng đã được xác nhận', 'Đơn CLK-DEMO-0002 đang được chi nhánh chuẩn bị.', 'ORDER', 2, FALSE, now() - interval '1 hour')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('notification_service.mail_templates', 'id'), COALESCE((SELECT MAX(id) FROM notification_service.mail_templates), 1));
SELECT setval(pg_get_serial_sequence('notification_service.notifications', 'id'), COALESCE((SELECT MAX(id) FROM notification_service.notifications), 1));
