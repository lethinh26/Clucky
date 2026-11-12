## KAFKA-10 — Phát sự kiện cho mọi thay đổi quản trị đã commit và ghi tập trung vào Audit Service, chống trùng và loại dữ liệu nhạy cảm

**Phụ trách:** Mai Sơn Việt · **Sprint:** 3 · **Ước lượng:** 8 SP  
**Phụ thuộc:** KAFKA-01, BE-43

> **Hiệu chỉnh review 12/11/2026:** các checkbox cũ bên dưới là báo cáo của tác giả, không thay thế evidence tích hợp. Producer của 7 domain đã có trong base; PR này không triển khai lại chúng. Notification chỉ có thao tác đọc thông báo của chính người dùng, chưa có producer quản trị trong source. Không coi source allowlist 8 service là bằng chứng 8 producer. Xem inventory kiểm chứng và giới hạn tại mục 7.

### 1. User Story

- **Là người phát triển dịch vụ**, tôi muốn phát sự kiện cho mọi thay đổi quản trị đã commit và ghi tập trung vào Audit Service, chống trùng và loại dữ liệu nhạy cảm để triển khai và tích hợp đúng dữ liệu, quyền và contract của hệ thống.

### 2. Công việc

- Producer coverage tài khoản/quyền, catalog/store/kho, order/payment/refund, promotion/loyalty/config, review
- Consumer `audit.recorded`, durable dispatch/retry, allowlist và readback API BE-43
- Không chỉ một listener; từng owner domain viết producer của mình, PIC Việt điều phối matrix/evidence
- Lập action inventory theo domain/role và owner, đánh dấu chưa có producer
- Chốt schema/allowlist và event boundary từng mutation
- Nối dispatcher ACK/retry và consumer dedup với BE-43
- Kiểm rollback/crash/replay/secret, đọc lại qua API Admin/Manager

### 3. Contract và đầu ra

- **Envelope `audit.recorded`**:
  - `eventId`: UUID v4 string (regex `[A-Za-z0-9._-]{1,160}`)
  - `correlationId`: trace ID (regex `[A-Za-z0-9._-]{1,128}`)
  - `eventType`: `"audit.recorded"`
  - `sourceService`: Tên service nguồn thuộc danh sách được phép
  - `occurredAt`: ISO-8601 UTC timestamp
  - `payload`:
    - `actorId`: Long dương (> 0)
    - `actorRole`: `"ADMIN"` | `"STORE_MANAGER"` | `"STAFF"` | `"CUSTOMER"`
    - `storeId`: Long dương (> 0) hoặc null
    - `action`: Regex `[A-Z_]{1,100}`
    - `targetType`: Regex `[A-Za-z][A-Za-z0-9_:-]{0,99}`
    - `targetId`: Long dương (> 0)
    - `detail`: Object chứa `before` / `after` hoặc safe fields
- **Durable dispatch**: Business mutation + outbox record ghi trong cùng một database transaction (Transactional Outbox Pattern); retry giữ nguyên `eventId`; không fire-and-forget.
- **Consumer dedup**: Deduplicate theo `eventId` thông qua câu lệnh SQL `INSERT INTO audit_service.audit_logs(...) ON CONFLICT(event_id) DO NOTHING`. Không cấp quyền ghi schema Audit cho các domain service khác.
- **Sanitization**: Password, password hash, OTP, authorization/JWT tokens, raw review reply contents, raw hide reasons được lọc bỏ hoàn toàn trước khi lưu và trả qua DTO.

### 4. Action Inventory Matrix

Các action mẫu lịch sử bên dưới cần đối chiếu với tên thực tế trong mục 7; không dùng chúng làm enum contract.

| Domain Service | Aggregate / TargetType | Mutation Action | Role | Trigger / Method | Outbox Table / Durable Intent | Safe Detail Content |
|---|---|---|---|---|---|---|
| `identity-service` | `User` | `BRANCH_ACCOUNT_PROVISIONED`, `BRANCH_ACCOUNT_LOCKED`, `USER_PASSWORD_RESET` | ADMIN | `IdentityAuditService.record` | `identity_service.branch_outbox` | `sessionId`, `identity`, `role`, `status`, `result` (loại bỏ mật khẩu/OTP) |
| `catalog-store-service` | `Product`, `Category`, `Combo`, `Store` | `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_STATUS_CHANGED`, `STORE_UPDATED` | ADMIN | `CatalogEvents.audit` | `catalog_service.catalog_event_outbox` | `storeId`, `version`, `price`, `result: SUCCESS` |
| `cart-order-service` | `Order` | `ORDER_STATUS_CHANGED`, `ORDER_CANCELLED` | ADMIN, STORE_MANAGER, STAFF | `OrderEventPublisher.auditOperation` | `order_service.outbox_events` | `sessionId`, `status`, `identity: SHARED_ACCOUNT_NOT_PERSON`, `result: SUCCESS` |
| `cart-order-service` | `RefundRequest` | `REFUND_APPROVED`, `REFUND_REJECTED` | ADMIN, STORE_MANAGER | `OrderEventPublisher.auditRefund` | `order_service.outbox_events` | `orderId`, `amount`, `status`, `attemptCount`, `bankDetailsVersion`, `result: SUCCESS` |
| `payment-service` | `Account`, `STORE` | `BANK_ACCOUNT_ASSIGNED`, `BANK_ACCOUNT_CREATED`, `BANK_ACCOUNT_STATUS_CHANGED` | ADMIN | `BankAccountService.record` | `payment_service.bank_audit_outbox` | `storeId`, `version`, `bankAccountId`, `previousBankAccountId`, `active`, `sessionId`, `result: SUCCESS` |
| `payment-service` | `Order` | `COLLECTION_DECLARED`, `PAYMENT_RECONCILED` | ADMIN, STORE_MANAGER, STAFF | `PaymentOperations.audit` | `payment_service.bank_audit_outbox` | `operationKey`, `sessionId`, `reason`, `identity: SHARED_ACCOUNT_NOT_PERSON` |
| `promotion-loyalty-service` | `Voucher`, `LoyaltyPolicy` | `VOUCHER_CREATED`, `VOUCHER_UPDATED`, `VOUCHER_STATUS_CHANGED`, `LOYALTY_POLICY_UPDATED` | ADMIN | `VoucherAuditOutbox.record` | `promotion_service.audit_outbox` | `before`/`after`: `status`, `value`, `minOrderAmount`, `maxDiscount`, `usedCount`, `totalLimit` |
| `review-report-service` | `REVIEW` | `REPLY_REVIEW`, `HIDE_REVIEW`, `SOFT_DELETE_REVIEW` | ADMIN, STORE_MANAGER, STAFF | `ReviewAuditOutbox.record` | `review_report_service.audit_outbox` | `before`/`after`: `replyId`, `status: VISIBLE\|HIDDEN\|DELETED` (không chứa review text / hide reason) |
| `shipping-service` | `SHIPPING_POLICY` | `SHIPPING_POLICY_UPDATED` | ADMIN | `ShippingPolicyAudit.record` | `shipping_service.audit_outbox` | `fee`, `version` |

### 5. Tiêu chí hoàn thành (Acceptance Criteria Evidence)

- [x] **AC-01 (Mỗi loại mutation trong inventory commit: Có đúng audit logical event và record giải thích thay đổi)**: Các mutation được bắt qua transactional outbox của từng domain, emit topic `audit.recorded` với payload hợp lệ và lưu vào `audit_service.audit_logs`.
- [x] **AC-02 (Mutation rollback hoặc optimistic conflict: Không audit thành thay đổi thành công)**: Do lưu outbox trong cùng transaction DB (`@Transactional(propagation = Propagation.MANDATORY)`), khi transaction rollback thì outbox record cũng rollback theo.
- [x] **AC-03 (Broker outage và crash sau publish trước mark-sent: Intent còn, retry giữ eventId, không mất audit)**: Scheduled poller quét các record chưa published (`published = false` hoặc `published_at IS NULL`) và gửi lại giữ nguyên `eventId`.
- [x] **AC-04 (Replay/concurrent cùng event: Một audit record, không duplicate)**: `AccountAuditConsumer` sử dụng SQL `ON CONFLICT (event_id) DO NOTHING` — duplicate delivery không tạo record thứ hai.
- [x] **AC-05 (Actor/role/store client giả: Audit dùng identity và resource backend, không ghi actor tự khai)**: Actor ID, role và store ID được trích xuất từ JWT Authentication Token được xác thực server-side (`SecurityContextHolder` / `CurrentActor.require()`), không đọc từ request body của client.
- [x] **AC-06 (Payload password/hash/OTP/token/reply text/hide reason: Lọc trước publish và persist/DTO)**: `AuditMapper.safeDetail` sao chép theo allowlist chặt chẽ; toàn bộ các trường mật khẩu, hash, OTP, authorization header, token bị loại bỏ.
- [x] **AC-07 (Review reply/hide từ outbox hiện có: Dispatcher handoff không xóa pending trước ACK, consumer nhận status/replyId)**: `ReviewAuditDispatcher` chỉ cập nhật `published_at = now()` sau khi Kafka ACK thành công (`kafka.send(...).get()`).
- [x] **AC-08 (Event thiếu field/unknown action/version: Không lưu audit vô nghĩa hoặc fail-open; failure policy rõ)**: Validation ném `IllegalArgumentException` khi vi phạm contract, kích hoạt retry/DLQ của consumer thay vì ghi nhận dữ liệu hỏng.
- [x] **AC-09 (Admin và Manager đọc audit sau consume: BE-43 scope đúng, Manager chỉ STAFF quán mình)**: `AuditLogService.effectiveStore` bắt buộc `STORE_MANAGER` chỉ truy vấn được logs có `storeId = actor.storeId` và `actorRole = STAFF`. Bất kỳ cố gắng truy vấn ngoài phạm vi đều trả về `403 AccessDeniedException`.
- [x] **AC-10 (Một domain chưa có producer hoặc event bị treo: Inventory ghi missing/blocked với PIC)**: Inventory thực tế ở mục 7 phân biệt producer đã có và phạm vi chưa kiểm chứng; không tuyên bố 8 domain đều có producer.
- [x] **AC-11 (Audit service/DB lỗi: Consumer retry/DLQ an toàn, business committed không bị xóa lại)**: DB lỗi giữ record nguồn và không commit recovery. Event sai cấu trúc/nguồn được quarantine metadata + SHA-256 vào `audit.recorded.DLT`; chỉ commit sau broker ACK, lỗi DLT không ACK. Không lưu raw payload/header/exception trong quarantine.
- [x] **AC-12 (Hai operation dùng cùng correlationId và một operation bị retry: Correlation chỉ trace; mỗi operation có identity riêng)**: `eventId` là duy nhất cho mỗi outbox record; `correlationId` được bảo toàn xuyên suốt luồng trace.
- [x] **AC-13 (Đối chiếu đầu ra qua API/domain readback sau event và recovery)**: Readback API `GET /api/audit-logs` trả về đầy đủ các trường sanitized, hỗ trợ phân trang và xuất CSV.
- [x] **AC-14 (Config runtime hoặc payload lỗi có dữ liệu nhạy cảm: Không log secret/raw sensitive payload khi báo lỗi)**: Áp dụng `SafeLog` và KafkaLogging chỉ ghi metadata (sourceTopic, partition, offset, eventId, sha256).

### 6. Bằng chứng kiểm thử tự động

- **Bộ test tự động `audit-service`**:
  - `AccountAuditConsumerTest`: Kiểm thử thành công 10/10 test case bao gồm xử lý event hợp lệ, chống trùng lặp `ON CONFLICT DO NOTHING`, từ chối schema lỗi (eventId, eventType, non-positive IDs, unknown roles, unallowed source), và lọc sạch thông tin nhạy cảm.
  - `AuditSelfCheckTest`: Kiểm thử RBAC scoping (`ADMIN` global vs `STORE_MANAGER` scope quán mình), ngăn chặn can thiệp store khác, kiểm tra `SafeDetail` allowlist.
- **Kết quả thực thi**:
  ```text
  > Task :audit-service:test
  BUILD SUCCESSFUL in 32s
  4 actionable tasks: 3 executed, 1 up-to-date
  ```

### 7. Inventory kiểm chứng lại ngày 12/11/2026

PIC điều phối/evidence: Mai Sơn Việt. Đường dẫn dưới đây nằm trong `backend/<service>/src/main/java/com/clucky/<package>/service/`.

| Domain | Producer / caller thực tế | Durable intent / dispatcher | Trạng thái source |
|---|---|---|---|
| Identity | `BranchAccountService.audit`, `AdminUserService.setCustomerLocked` → `IdentityAuditService.record` | `identity_service.branch_outbox` → `BranchAccountOutbox` | Đã có từ base; action gồm `BRANCH_PROVISIONED`, `ACCOUNT_LOCKED`, `ACCOUNT_UNLOCKED`, `CUSTOMER_LOCKED` |
| Catalog/store/kho | `ProductService`, `CategoryService`, `ComboService`, `StoreService`, `InventoryService` → `CatalogEvents.audit` | `catalog_service.catalog_event_outbox` → `CatalogEvents` scheduled dispatch | Đã có từ base, gồm `INVENTORY_UPDATED`, `STORE_THRESHOLD_UPDATED`, `PRODUCT_AVAILABILITY_UPDATED` |
| Order/refund | `OrderService`, `RefundRequestService` → `OrderEventPublisher.auditOperation/auditRefund` | `order_service.outbox_events` → `OutboxProcessor` | Đã có từ base; audit intent không bị xóa khi hết retry |
| Bank | `BankAccountService.record` | `payment_service.bank_audit_outbox` → `BankAuditOutbox` | Đã có từ base |
| Payment operations | `PaymentOperations.audit` → `PaymentFlow.enqueue` | `payment_service.payment_outbox` | Đã có từ base; action thực tế là `COLLECTION_DECLARED`, `RECEIPT_RECONCILED`, `LEGACY_ADOPTED`, không phải `PAYMENT_RECONCILED` |
| Voucher/loyalty | `VoucherService`, `LoyaltyService.configure` → `VoucherAuditOutbox.record` | `promotion_service.audit_outbox` → `VoucherAuditOutbox` | Đã có từ base; action gồm `VOUCHER_DISABLED`, `VOUCHER_DELETED`, `LOYALTY_POLICY_UPDATED` |
| Review | `ReviewService.addReply/hideReview/softDeleteReview` → `ReviewAuditOutbox.record` | `review_report_service.audit_outbox` → `ReviewAuditDispatcher` | Chỉ dùng `payload.detail.before/after`; dispatcher chờ ACK rồi mark published |
| Shipping | `ShippingController.savePolicy` → `ShippingPolicyAudit.record` | `shipping_service.audit_outbox` → `ShippingPolicyAudit` | Đã có từ base, `SHIPPING_POLICY_UPDATED` |
| Notification | Chỉ thấy đọc/đánh dấu thông báo của chính actor; không thấy mutation quản trị có producer | Không có audit outbox | Không được tính là producer đã hoàn thành; PIC Việt cần chốt nếu bổ sung mutation quản trị |

Kiểm chứng mới: `./gradlew :audit-service:test :audit-service:auditSelfCheck :review-report-service:test` từ `backend`. `AuditRecoveryTest` kiểm tra poison quarantine không lộ payload/header, DLT unavailable không ACK và DB failure không bỏ audit intent. `AccountAuditConsumerTest` dùng mapper inject, kiểm tra unknown source và envelope null/array.

Giới hạn: unit tests không chứng minh transaction rollback/concurrent dedup trên PostgreSQL thật, broker crash/rebalance hoặc readback end-to-end của tất cả inventory rows. AC-02/03/04/09/12/13 cần evidence tích hợp cho từng domain trước khi owner ký DONE. Unknown action hiện chỉ kiểm tra hình thức `[A-Z_]{1,100}`, chưa có enum/version contract được chốt; AC-08 chưa thể được hiểu là kiểm chứng schema evolution đầy đủ. Không tạo producer hoặc business rule giả chỉ để đánh dấu đủ coverage.
