INSERT INTO notification_service.mail_templates(template_key,subject_template,body_template,is_active)
VALUES ('REFUND_REJECTED','Clucky — Kết quả yêu cầu hoàn tiền đơn {{orderCode}}',
    'Yêu cầu hoàn tiền cho đơn {{orderCode}} đã bị từ chối. Lý do: {{reason}}. Xem chi tiết: {{orderUrl}}',true),
    ('REFUND_WAITING_BANK_DETAILS','Clucky — Cần cập nhật thông tin nhận hoàn tiền đơn {{orderCode}}',
    'Đơn {{orderCode}} cần cập nhật thông tin nhận hoàn tiền. Lý do: {{reason}}. Đăng nhập và cập nhật tại: {{orderUrl}}. Không gửi thông tin ngân hàng qua email.',true)
ON CONFLICT(template_key) DO NOTHING;
