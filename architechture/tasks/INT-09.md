# [INT-09] Payment: QR hiển thị, webhook → CONFIRMED, COD confirm 

**Loại:** INT
**Sprint:** Sprint 2 — Integration
**Story Point (SP):** 7
**PIC:** M4 
**Deliverable:** `Payment flow works `

## Mô tả

Thực hiện **Payment: QR hiển thị, webhook → CONFIRMED, COD confirm ** xuyên suốt phần được giao, đúng domain và contract của Clucky.

## Phạm vi

- Đối chiếu SRS/API/database docs.
- Giữ Config Server, Eureka, Gateway, database/schema riêng, RBAC/storeId.
- Mail Sender nằm trong Notification Service, Gmail SMTP App Password từ env/Config Server.
- Cloudinary là external media provider; không lưu binary trong PostgreSQL, không lộ `CLOUDINARY_API_SECRET`.

## Subtask checklist

- [ ] Đọc SRS/API/dependency của task.
- [ ] Hoàn thành deliverable đúng domain.
- [ ] Thêm validation, error/loading/empty state hoặc RBAC.
- [ ] Thêm migration/test và cập nhật contract nếu cần.
- [ ] Chạy formatter, typecheck/compile/test và lưu evidence.
- [ ] Review chéo rồi merge.

## Acceptance Criteria

1. Deliverable tồn tại đúng vị trí và build không lỗi.
2. Luồng chính hoạt động với input hợp lệ.
3. Input lỗi/unauthorized/dependency lỗi trả error rõ ràng.
4. Không cross-service DB join, secret hard-code hoặc frontend gọi thẳng service.
5. Có evidence kiểm tra thực tế.
6. Nếu media: validate MIME/size, lưu `secure_url` + `public_id`, cleanup sau commit và không lộ secret.
7. Nếu mail: Gmail SMTP STARTTLS, retry hữu hạn, email_logs, không rollback nghiệp vụ khi gửi lỗi.

## Ghi chú kỹ thuật

- Cloudinary config: `CLOUDINARY_ENABLED`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER`.
- Gmail config: `MAIL_SENDER_ENABLED`, `MAIL_SENDER_USERNAME`, `MAIL_SENDER_APP_PASSWORD`.
