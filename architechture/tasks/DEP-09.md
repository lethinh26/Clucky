## DEP-09 — Tổng hợp Postman collection từ từng service, cấu hình gọi qua Gateway và bàn giao request mẫu cho luồng chính cùng trường hợp lỗi

**Phụ trách:** Mai Sơn Việt · **Sprint:** 3 · **Ước lượng:** 3 SP
**Phụ thuộc:** BE-09, BE-17, UI-05, BE-54, BE-20, BE-25, BE-23, BE-24, UI-17, UI-18, BE-29, BE-30, BE-32, UI-19, UI-30, UI-44, BE-38, UI-32, BE-42, UI-14, UI-29

### 1. User Story

- **Là người vận hành**, tôi muốn tổng hợp Postman collection từ từng service, cấu hình gọi qua Gateway và bàn giao request mẫu cho luồng chính cùng trường hợp lỗi để triển khai và vận hành hệ thống ổn định.

### 2. Công việc

- Tổng hợp collection theo domain/role với environment placeholders, setup/cleanup an toàn và expected result
- Bao phủ positive/negative/auth/owner/retry của các task hiện hành, không tạo TEST task mới
- Không thay implementation hoặc coi export JSON là đã E2E; không gửi request tới production/khách thật khi chưa cho phép
- Nhận contract/evidence/collection từng owner và inventory endpoint
- Gộp folder/request name theo task/actor, environment placeholder và variables chain
- Bổ sung expected success/error và điều kiện dừng/retry, fixture safe cleanup
- Bàn giao manifest phiên bản/commit và run instructions; người dùng tự chạy khi ready

### 3. Contract và đầu ra

- Base URL Gateway, client header/cookie session theo Browser_Sessions; không hardcode business ports hoặc token/secret
- Request method/path/body/expected status+code theo API/contract owner, IDs từ fixture/response có liên kết
- Internal/webhook cases ghi rõ boundary và fixture riêng, không expose internal route để collection dễ gọi

### 4. Tiêu chí hoàn thành

- Import collection/environment trên profile sạch: Không thiếu biến bắt buộc, placeholder được hướng dẫn rõ
- Mỗi public/business request dùng base URL: Qua Gateway đúng route, không business service port hardcode
- Login/session/refresh/logout hai client: Đúng cookie/client/Origin, không lưu token thật vào file export
- Happy path mỗi domain có IDs chain: Expected status/body/data readback, không chỉ assert200
- Validation/unauth/forbidden/owner-store cases: Có expected code và side effect expectation, allow case đối chứng
- Retry/idempotency/webhook replay cases được phép: Fixture/identity giữ đúng, không phát sinh chuyển tiền thật
- Dependency chưa sẵn sàng: Runbook đánh BLOCKED và dừng chặng tương ứng, không fake success
- Collection/env/export/log có secret marker: Không credential/token/PII thật, secret chỉ nhập local runtime
- Cleanup fixture sau run: Chỉ resource thuộc run đã xác định, không reset DB/volume hoặc seed chung
- API contract đổi: Collection/version/expected cập nhật cùng task, owner rõ
- Handoff thiếu version hoặc artifact không mở/nhập được: Ghi blocker/PIC, không coi đã export là bàn giao xong; không sửa môi trường production để né
- Sửa artifact sau khi owner cập nhật evidence/contract: Các bản cùng version hoặc ghi rõ phần chưa đồng bộ, không dùng evidence cũ cho claim mới
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Owner thống nhất môi trường, tài khoản/quán fixture, safe recipients và cleanup phạm vi
- Auth API trong Postman không giống browser CSRF tự động: ghi explicit Origin/client/cookie, không nới backend để demo

### 6. Kết quả triển khai và Bằng chứng bàn giao

- **Artifacts đã tạo**:
  - Postman Collection v2.1.0: [`architechture/postman/Clucky-API-Gateway.postman_collection.json`](../postman/Clucky-API-Gateway.postman_collection.json)
  - Postman Environment: [`architechture/postman/Clucky-Local.postman_environment.json`](../postman/Clucky-Local.postman_environment.json)
  - Hướng dẫn vận hành và Runbook: [`architechture/docs/postman-gateway-handover.md`](../docs/postman-gateway-handover.md)
  - Script sinh collection tự động: [`scripts/generate-postman-collection.mjs`](../../scripts/generate-postman-collection.mjs)
  - Script kiểm thử tự động hợp đồng Gateway & RBAC: [`scripts/test-postman-collection.mjs`](../../scripts/test-postman-collection.mjs)
- **Độ bao phủ**:
  - Tổng số request: **48 requests** trên 9 domain dịch vụ (Auth, Catalog, Cart/Order, Payments, Promotions, Shipping, Reviews/Reports, Notifications/Audit, Safe Cleanup).
  - Ca kiểm thử tích cực (Happy Paths): 39 requests với đầy đủ assert status 200, kiểm tra cấu trúc JSON.
  - Ca kiểm thử tiêu cực & bảo mật (Negative & RBAC): 9 requests kiểm tra `VALIDATION_ERROR` (400), `INVALID_CREDENTIALS` (401), `FORBIDDEN` (403), `RESOURCE_CONFLICT` (409) tuân thủ `contracts/errors.json`.
  - Chuỗi liên kết ID tự động (IDs chain): 12 requests tự động trích xuất và gán biến môi trường (`storeId`, `productId`, `cartItemKey`, `orderId`, `orderCode`, `paymentId`, `reviewId`, `emailLogId`).
  - Toàn bộ 100% request đều gọi qua Gateway (`{{gateway_url}}`), không hardcode bất kỳ port dịch vụ nội bộ nào.
  - Phân tách header `X-Clucky-Client: customer` (`:3000`) và `admin` (`:5173`) chuẩn theo đặc tả `Browser_Sessions.md`.
  - Thư mục dọn dẹp fixture (`99. Safe Fixture Cleanup`) xóa giỏ hàng thử nghiệm mà không xóa database/volume chung.
- **Kết quả tự kiểm thử bằng Model AI**:
  - Đã chạy script `node scripts/test-postman-collection.mjs`:
    ```text
    --- RUNNING POSTMAN COLLECTION & ENVIRONMENT AUTOMATED VERIFICATION ---
    Verified 48 total requests:
     - Positive cases: 39
     - Negative/Security cases: 9
     - Requests with dynamic variable chaining: 12
    All Postman Collection and Environment verifications PASSED successfully!
    ```
  - Kiểm thử mã nguồn frontend/backend không bị ảnh hưởng. Backend gradle tests và frontend react tests (41/41 pass) tiếp tục duy trì trạng thái xanh 100%.
