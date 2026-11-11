## KAFKA-10 — Phát sự kiện cho mọi thay đổi quản trị đã commit và ghi tập trung vào Audit Service, chống trùng và loại dữ liệu nhạy cảm

**Phụ trách:** Mai Sơn Việt · **Sprint:** 3 · **Ước lượng:** 8 SP  
**Phụ thuộc:** KAFKA-01, BE-43

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
- [x] **AC-10 (Một domain chưa có producer hoặc event bị treo: Inventory ghi missing/blocked với PIC)**: Toàn bộ 8 domain business đã phủ producer outbox theo bảng inventory.
- [x] **AC-11 (Audit service/DB lỗi: Consumer retry/DLQ an toàn, business committed không bị xóa lại)**: `DefaultErrorHandler` xử lý retry bounded backoff, commit offset an toàn và chuyển tiếp DLT khi kiệt retry.
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
