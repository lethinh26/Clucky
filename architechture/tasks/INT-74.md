# [INT-74] Google login E2E: popup → ID token → JWT; link tài khoản email đã tồn tại; complete-password flow 

**Loại:** Task
**Sprint:** Sprint 3 — Tích hợp FE↔BE
**Story Point (SP):** 3
**PIC:** M4 + M1 
**Deliverable:** `Google auth E2E `

## Mô tả

Thực hiện **Google login E2E: popup → ID token → JWT; link tài khoản email đã tồn tại; complete-password flow ** xuyên suốt phần được giao, đúng domain và contract của Clucky.

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
2. E2E user mới: popup Google → `REQUIRES_PASSWORD` → nhập password → JWT + user ACTIVE.
3. E2E user cũ (đã link) → popup → JWT thẳng không hỏi password.
4. E2E email đã đăng ký thường + login Google lần đầu → link `firebase_uid`, JWT.
5. Sau complete: login lại bằng email+password vẫn được (song song Google).
6. Input lỗi/unauthorized/dependency lỗi trả error rõ ràng.
7. Không cross-service DB join, secret hard-code hoặc frontend gọi thẳng service.
8. Có evidence kiểm tra thực tế.

## Ghi chú kỹ thuật

- Cloudinary config: `CLOUDINARY_ENABLED`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER`.
- Gmail config: `MAIL_SENDER_ENABLED`, `MAIL_SENDER_USERNAME`, `MAIL_SENDER_APP_PASSWORD`.
- Firebase config: `FIREBASE_ENABLED`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_PROJECT_ID`.
