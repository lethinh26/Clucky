UPDATE notification_service.mail_templates
SET body_template = 'Mã xác minh / Verification code: {{otp}}
Challenge: {{challengeId}}
Account: {{accountId}}
Login: {{login}} / {{role}}
Purpose: {{purpose}}
Expires (UTC): {{expiresAt}}
Không chia sẻ mã. Chỉ dùng cho đúng tài khoản và mục đích hiển thị. / Do not share this code.',
    updated_at = now()
WHERE template_key = 'branch-security';
