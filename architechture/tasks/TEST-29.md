# [TEST-29] Google auth: register email trùng tài khoản Google → 409; `firebase_uid` unique; `pendingToken` hết hạn; login bằng cả email+password sau complete 

**Loại:** Task
**Sprint:** Sprint 3 — Test + fix
**Story Point (SP):** 3
**PIC:** M4 
**Deliverable:** `Google auth test `

## Mô tả

Thực hiện **Google auth: register email trùng tài khoản Google → 409; `firebase_uid` unique; `pendingToken` hết hạn; login bằng cả email+password sau complete ** xuyên suốt phần được giao, đúng domain và contract của Clucky.

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

1. `POST /api/auth/register` với email đã tồn tại qua Google → 409 `EMAIL_EXISTS`.
2. Hai `firebase_uid` khác nhau không link vào cùng user; cùng `firebase_uid` không tạo user thứ hai (unique constraint).
3. `pendingToken` quá 10 phút → `/google/complete` trả 410; token dùng lại → 401/410.
4. ID token giả/sai `aud`/email unverified → 401.
5. Sau `/google/complete`: `/api/auth/login` bằng email+password hoạt động song song Google.
6. Có evidence kiểm tra thực tế.

## Ghi chú kỹ thuật

- Mock Firebase Admin verifier trong test (không gọi Google thật).
- Cloudinary config: `CLOUDINARY_ENABLED`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER`.
- Gmail config: `MAIL_SENDER_ENABLED`, `MAIL_SENDER_USERNAME`, `MAIL_SENDER_APP_PASSWORD`.
- Firebase config: `FIREBASE_ENABLED`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_PROJECT_ID`.
