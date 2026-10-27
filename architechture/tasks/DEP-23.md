# [DEP-23] Firebase env + runbook: tạo Firebase project, enable Google provider, `FIREBASE_*` vào `.env.example` + Config Server 

**Loại:** Task
**Sprint:** Sprint 3 — Deploy + bàn giao
**Story Point (SP):** 2
**PIC:** M4 
**Deliverable:** `Firebase runbook `

## Mô tả

Thực hiện **Firebase env + runbook: tạo Firebase project, enable Google provider, `FIREBASE_*` vào `.env.example` + Config Server ** xuyên suốt phần được giao, đúng domain và contract của Clucky.

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

1. `.env.example` có `FIREBASE_ENABLED`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` — placeholder, không secrets.
2. Config Server `identity-service.yml` map env Firebase.
3. Runbook: tạo Firebase project → enable Google provider → lấy service account JSON → điền env.
4. `FIREBASE_ENABLED=false` mặc định; khi false thì endpoint `/api/auth/google` trả 503 rõ ràng.
5. Có evidence kiểm tra thực tế.

## Ghi chú kỹ thuật

- Service account JSON là secret: chỉ env/Config Server, không commit, không log.
- Cloudinary config: `CLOUDINARY_ENABLED`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER`.
- Gmail config: `MAIL_SENDER_ENABLED`, `MAIL_SENDER_USERNAME`, `MAIL_SENDER_APP_PASSWORD`.
