# PR4 — Nội dung pháp lý và ghi nhận chấp thuận

## Phụ thuộc và thứ tự triển khai

1. **Merge PR5 #85 trước**: identity-service đã dùng Flyway V14__account_device_sessions.sql.
2. Merge PR4 sau PR5; migration pháp lý là V15__legal_documents_and_consents.sql, tạo legal_documents, legal_revisions, legal_consents trong identity_service. Không sửa migration đã chạy.
3. Không tự publish văn bản mẫu: nội dung gợi ý trong React Admin là **khung soạn thảo, chưa được kiểm duyệt pháp lý**. Chỉ người chịu trách nhiệm pháp chế/chủ sản phẩm mới quyết định nội dung chính thức.

## Rollout không gián đoạn đăng ký

**PR chỉ đưa mã lên GitHub; không triển khai production trong phiên làm việc này.**
Workflow Clucky full-stack CI/CD trên main có gate tại preflight, trước build và mọi thao tác VPS; nếu V15 tồn tại nhưng chưa được phê duyệt stage, job dừng. Không tự xuất bản văn bản giả.

**Stage 1: bootstrap (tạm cho phép đăng ký trong khi Admin chuẩn bị văn bản đã được duyệt)**

1. Sau khi merge PR5 rồi PR4 và có phê duyệt chủ sản phẩm, đặt GitHub Actions **Variable** LEGAL_CONTENT_ROLLOUT_STAGE=bootstrap và Secret BACKEND_ENV_JSON chứa chuỗi LEGAL_CONSENT_REQUIRED=false; giữ nguyên các secret còn lại.
2. Trigger workflow main. Gate yêu cầu stage bootstrap cùng flag false rồi triển khai **full stack** (backend, React Admin, Next.js). Identity áp dụng V15. Next.js gọi GET /api/legal/public/status; khi consentRequired=false, hiện thông báo tạm chuyển tiếp, không tạo checkbox chấp thuận giả và vẫn cho phép đăng ký điện thoại/Google cũ. Backend **không tạo bản ghi legal_consents giả**. Chế độ này chỉ phục vụ bootstrap, không phải mặc định.
3. ADMIN mở /admin/legal, chỉnh sửa đầy đủ **tiếng Việt và tiếng Anh** cho **Điều khoản dịch vụ** và **Chính sách quyền riêng tư**; lần lượt **Lưu bản nháp mới → Xem trước → Xuất bản**. Mẫu khung phải được pháp chế/chủ sản phẩm kiểm duyệt trước khi xuất bản. Kiểm tra hai GET:
   - GET /api/legal/public/TERMS_OF_SERVICE
   - GET /api/legal/public/PRIVACY_POLICY
   Phải trả 200, kèm version và HTML đúng bản được duyệt.

**Stage 2: enforce (bắt buộc chấp thuận sau khi công bố đủ hai chính sách)**

4. Xác nhận GET /api/legal/public/status trả documentsPublished=true. Đặt GitHub Actions **Variable** LEGAL_CONTENT_ROLLOUT_STAGE=enforce, Secret BACKEND_ENV_JSON có chuỗi LEGAL_CONSENT_REQUIRED=true, và cấu hình FRONTEND_API_URL trỏ đúng origin Gateway public (HTTPS).
5. Trigger workflow main lại. Gate yêu cầu stage enforce cùng flag true và kiểm tra public status của hệ thống **đang chạy** trước build/deploy. Nếu thiếu văn bản, sai URL hoặc Gateway lỗi, job dừng **trước khi chạm VPS**. Sau đó identity bắt buộc chấp thuận; Next.js hiển thị checkbox và liên kết thật tại /terms-of-service và /privacy-policy.
6. Smoke test: đăng ký phone/Google bỏ tick (400), tick phiên bản đang publish (thành công), phiên bản stale (409), legal_consents lưu revision IDs và accepted_at do PostgreSQL sinh. Google sign-in cho tài khoản hiện hữu vẫn hoạt động.

**Cảnh báo:** Thiếu LEGAL_CONTENT_ROLLOUT_STAGE hoặc flag không khớp stage thì preflight fail sớm, giữ nguyên production. Nếu tự bật enforce trước khi xuất bản đủ hai bản, đăng ký mới trả 409 (fieldErrors.consent=NOT_PUBLISHED); gate không thay thế việc kiểm tra nội dung pháp lý.

## Thiết kế và bảo mật

- **ADMIN-only**: /api/legal/admin/{type}, /{type}/history, /{type}/revisions/{version}, /{type}/draft, /{type}/publish, /{type}/restore/{version}. Mỗi lần lưu nháp tạo một phiên bản mới bất biến; publish chỉ nhận phiên bản draft hiện hành; khôi phục sao chép phiên bản cũ thành **draft phiên bản mới**, không sửa lịch sử. Lưu nháp và khôi phục cần gửi **expectedRevision** (revision_counter) và **expectedDraftVersion** (nullable): backend so sánh dưới row lock, trả 409 nếu Admin khác đã thay đổi.
- **Public read-only**: GET /api/legal/public/{type} cho phiên bản đã publish; không trả thông tin admin người tạo hoặc bản nháp. GET /api/legal/public/status cho biết consentRequired và documentsPublished phục vụ chuyển tiếp/gate. Không có public write API.
- Các request tạo tài khoản nhận consent: accepted=true, termsVersion, privacyVersion. Identity đối chiếu **hai published revisions** với SELECT FOR SHARE trong cùng transaction đăng ký; thay đổi publish đợi commit. Bản ghi legal_consents gắn tới cả hai revision IDs bất biến, với accepted_at DEFAULT now() do PostgreSQL sinh và source (PHONE_REGISTER/GOOGLE_COMPLETE). OTP điện thoại xác minh sau khi chấp thuận đã được ghi nhận. Google cũ dùng /google đăng nhập trực tiếp, **không bị ràng buộc chấp thuận mới**.
- Google pending token chỉ được dọn bằng Redis sau khi transaction tạo user, ghi consent và cấp session **commit thành công**; lỗi DB trước commit giữ token để có thể thử lại. Nếu dọn Redis sau commit thất bại, TTL và unique firebase_uid/email vẫn ngăn tạo tài khoản trùng.
- HTML đầu vào được **server** lọc bằng JSoup safelist, chỉ giữ nội dung văn bản/định dạng cơ bản và liên kết HTTP(S); event handlers, script, iframe, ảnh và javascript: bị loại. Preview phía Admin dùng iframe sandbox và CSP hạn chế; public Next chỉ render HTML đã lưu qua sanitizer.
- Dữ liệu HTML cả hai ngôn ngữ tối đa 100 KB/khối; lịch sử API giới hạn 100 revisions gần nhất. Không có API xóa revisions hoặc chấp thuận.

## Xác minh và giới hạn

Các bài test unit kiểm tra sanitization/XSS, consent bắt buộc, bản đã xuất bản, stale version, rollout flag, khả năng tái sử dụng pending Google token khi consent lỗi. Cần tiếp tục xác minh tích hợp trên staging với PostgreSQL thực, Flyway V14→V15, Redis, API Gateway, thiết bị thực và hai ứng dụng trước khi production.
