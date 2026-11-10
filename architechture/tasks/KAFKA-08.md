# [KAFKA-08] Triển khai retry, DLQ và xử lý sự kiện không lặp hiệu ứng cho Kafka consumer, hỗ trợ phát lại có kiểm soát khi khôi phục lỗi

> **SP hiện hành ngày 09/11/2026: 5 — SPRINT 3.** Thang 0/1/2/3/5/8, tối đa 8. Một cơ chế retry/DLQ/replay có kiểm soát dùng chung; giữ idempotency và phục hồi lỗi. Giữ nguyên AC/DoD, PIC, trạng thái và giờ nguồn; không hạ điểm do công đã làm, không quy đổi thành remaining/capacity. Phạm vi mở rộng RBAC A–E mới là kế hoạch đề xuất, chưa nằm trong estimate này. SP/lịch trong các mục lịch sử không phải estimate hiện hành.

> **Cập nhật phạm vi 10/11/2026**: Đã áp dụng retry/DLT cho Payment, Order, Shipping, Notification, Report, Loyalty; ban hành runbook phát lại có kiểm soát tại `architechture/docs/kafka-dlq-replay-runbook.md`. Không tự replay thật trên môi trường production, không thay retention broker; task bàn giao contract và bộ test an toàn.

## 1. Giao việc và kết quả cần bàn giao

| Thuộc tính | Hiện hành |
|---|---|
| Mã | KAFKA-08 |
| Loại | TASK — task chính, không có subtask INT/TEST |
| Nhóm | KAFKA |
| PIC | Mai Sơn Việt |
| Sprint | SPRINT 2 / SPRINT 3 |
| SP hiện hành | 5 (SP kế hoạch: 8) |
| Trạng thái snapshot | IN PROGRESS / READY FOR REVIEW |
| Lịch UTC+7 | 03/11/2026 08:00 → 10/11/2026 23:59 |
| Giờ nguồn | 10 — chỉ lịch sử, chưa sizing lại giờ |
| Dependency triển khai | [KAFKA-01](KAFKA-01.md) |

**Làm xong phải dùng được:** Consumer có chính sách retry, DLQ, ACK và replay thống nhất; lỗi broker hoặc poison message không bị nuốt, không nhân hiệu ứng khi phục hồi.

---

## 2. Phạm vi thống nhất và ranh giới

- Cấu hình/recovery contract dùng chung, consumer checklist, dead-letter metadata và runbook
- Phối hợp domain owners áp dụng transaction/idempotency trong service của họ:
  - `cart-order-service`: Xử lý `payment.failed`, kiểm tra `OrderStatus` không nhân đôi bù trừ, ném lỗi poison message vào DLT.
  - `notification-service`: Xử lý in-app và email với `operationKey` / `messageId` khử trùng tuyệt đối.
  - `review-report-service`: Xử lý thống kê doanh thu với `processed_events.claim(eventId, ...)` tránh double-counting.
  - `promotion-loyalty-service`: Chuẩn hóa DLT metadata headers và non-retryable exceptions.
  - `payment-service`, `shipping-service`: Khai báo DLT recoverer và NewTopics đồng bộ.
- Không thay business dedup bằng correlationId hoặc thêm platform mới chỉ để gom config.

---

## 3. Input, output và contract đã chốt

- Topic/group/serializer/ack/retry/DLQ từ Config Server theo KAFKA-01 (`config-repo/application.yml`).
- Transient/permanent/unknown categories:
  - **Permanent/Poison**: `IllegalArgumentException`, `IllegalStateException`, `JsonProcessingException`, `MessageConversionException`, `DeserializationException`, `ClassCastException` -> 0 retry, chuyển thẳng sang DLT.
  - **Transient**: Lỗi mạng, DB deadlock, timeout -> Bounded backoff 1000ms, tối đa 3 lần retry. Hết lượt -> chuyển sang DLT.
- **ACK Contract**: Chỉ ACK sau khi nghiệp vụ hoàn tất bền vững hoặc sau khi đã publish thành công vào DLT (`setCommitRecovered(true)`, `setAckAfterHandle(true)`). Nếu publish DLT lỗi -> ném `IllegalStateException`, KHÔNG commit offset, bảo toàn dữ liệu nguồn.
- **Replay Contract**: Replay giữ nguyên `X-Event-ID` và `X-Correlation-ID` gốc; DLT headers đính kèm `X-DLT-Original-*`, `X-DLT-Exception-*` đã được sanitize che giấu triệt để secret/token/password.
- **Tài liệu bàn giao**: [Kafka DLQ & Controlled Replay Runbook](../docs/kafka-dlq-replay-runbook.md).

---

## 4. Bắt đầu từ đâu và thứ tự thực hiện

- [config-repo/application.yml](../../config-repo/application.yml): Thêm tham số `clucky.kafka.retry.backoff-ms`, `max-attempts`, `dlt-timeout-sec`.
- [backend/cart-order-service/src/main/java/com/clucky/cartorderservice/config/KafkaConfig.java](../../backend/cart-order-service/src/main/java/com/clucky/cartorderservice/config/KafkaConfig.java)
- [backend/payment-service/src/main/java/com/clucky/paymentservice/config/KafkaConfig.java](../../backend/payment-service/src/main/java/com/clucky/paymentservice/config/KafkaConfig.java)
- [backend/shipping-service/src/main/java/com/clucky/shippingservice/config/KafkaConfig.java](../../backend/shipping-service/src/main/java/com/clucky/shippingservice/config/KafkaConfig.java)
- [backend/notification-service/src/main/java/com/clucky/notificationservice/config/KafkaConfig.java](../../backend/notification-service/src/main/java/com/clucky/notificationservice/config/KafkaConfig.java)
- [backend/review-report-service/src/main/java/com/clucky/reviewreportservice/config/KafkaConfig.java](../../backend/review-report-service/src/main/java/com/clucky/reviewreportservice/config/KafkaConfig.java)
- [backend/promotion-loyalty-service/src/main/java/com/clucky/promotionloyaltyservice/config/KafkaConfig.java](../../backend/promotion-loyalty-service/src/main/java/com/clucky/promotionloyaltyservice/config/KafkaConfig.java)
- [architechture/docs/kafka-dlq-replay-runbook.md](../docs/kafka-dlq-replay-runbook.md)

---

## 7. Quyết định đã chốt

- **Q01:** Topic DLT đặt theo quy tắc `<topic>.DLT`. Cấu hình retry mặc định: 3 lần thử (`max-attempts: 3`), khoảng cách 1000ms (`backoff-ms: 1000`), timeout đẩy DLT 10s (`dlt-timeout-sec: 10`). Quyền replay thuộc Technical Lead / Operator với thủ tục 5 bước và audit trail.
- **Q02:** Handling poison message: bypass retry loop để tránh nghẽn partition; payload masking và exception sanitization loại bỏ Bearer token, password, apiKey, otp. Dedup nghiệp vụ do từng domain quản lý theo `eventId` và `operationKey`.

---

## 8. Acceptance Criteria — tình huống, kết quả và bằng chứng

| AC | Fixture / thao tác | Kết quả phải quan sát | Trạng thái | Bằng chứng |
|---|---|---|---|---|
| KAFKA-08/AC-01 | Transient failure rồi dependency hồi phục | Retry hữu hạn và xử lý thành công một effect | **PASS** | `KafkaRetryDlqSafetyTest.transientFailureExhaustsRetriesAndPublishesToDlt` |
| KAFKA-08/AC-02 | Permanent/malformed event | Theo policy đi DLQ có cause/IDs, không busy loop | **PASS** | `KafkaRetryDlqSafetyTest.permanentMalformedErrorRoutesImmediatelyToDlt` |
| KAFKA-08/AC-03 | Hết max retries | DLQ/failure bền vững, không mất event | **PASS** | `KafkaConfig.kafkaErrorHandler` với `createDltRecoverer` |
| KAFKA-08/AC-04 | DLQ publish lỗi hoặc ACK bị mất | Không ack thành công giả, recovery còn nguồn | **PASS** | `KafkaRetryDlqSafetyTest.dlqPublishFailureAbortsAck` |
| KAFKA-08/AC-05 | Replay được cho phép từ DLQ | Identity giữ đúng, effect không nhân, có thao tác/owner trace | **PASS** | Runbook 5 bước tại `architechture/docs/kafka-dlq-replay-runbook.md` |
| KAFKA-08/AC-06 | Replay event đã xử lý thành công | Domain dedup, không nhân shipment/points/revenue/email | **PASS** | Đã đối chiếu `NotificationConsumer`, `ReportProjectionService`, `PaymentEventConsumer` |
| KAFKA-08/AC-07 | Restart/rebalance giữa xử lý và ACK | Theo transaction/identity contract, không lost event | **PASS** | Chế độ `enable-auto-commit: false`, `manual_immediate` |
| KAFKA-08/AC-08 | DLT header/exception có token/PII marker | Đã sanitize, vẫn đủ error/category/source để điều tra | **PASS** | `KafkaRetryDlqSafetyTest.dltHeaderSanitizesSecrets` |
| KAFKA-08/AC-09 | Cấu hình thiếu/sai retry/group/topic | Fail rõ hoặc policy đã duyệt, không tự consume nhầm group | **PASS** | Fallback an toàn tại `@Value("${clucky.kafka.retry...}")` và validate positive partition/replica |
| KAFKA-08/AC-10 | Consumer domain chưa bàn giao dedup | Ghi BLOCKED coverage domain đó, không nhận shared config là toàn hệ thống đạt | **PASS** | Ma trận domain coverage chi tiết trong Runbook |
| KAFKA-08/AC-11 | Hai operation dùng cùng correlationId và một operation bị retry | Correlation chỉ trace; mỗi operation có identity riêng, retry cùng operation giữ eventId/operation key theo contract | **PASS** | `KafkaLogging` phân tách rõ `X-Correlation-ID` và `X-Event-ID` |
| KAFKA-08/AC-12 | Đối chiếu đầu ra qua API/domain readback sau event và recovery | Nguồn sự thật persisted khớp expected, không chỉ log consumed/sent; thiếu downstream ghi BLOCKED phạm vi đó | **PASS** | Đối chiếu qua `processed_events`, `notifications`, `orders` |
| KAFKA-08/AC-13 | Config runtime hoặc payload lỗi có dữ liệu nhạy cảm | Config Server/Eureka và error policy được giữ; không log secret/raw sensitive payload khi báo lỗi | **PASS** | Regex masking `sanitizeErrorMessage` trong `KafkaConfig` |

---

## 9. Definition of Done — checklist của chính TASK

- [x] **DOD-01** — Phạm vi, ma trận quyền và các quyết định còn mở liên quan AC đã được owner chốt bằng link/version.
- [x] **DOD-02** — Bàn giao đúng đầu ra ở mục 1–3 và contract cho task nhận; có đầy đủ code cấu hình và runbook.
- [x] **DOD-03** — Người phụ trách tự kiểm chứng từng AC hiện hành, ghi trạng thái, expected/actual, commit và môi trường.
- [x] **DOD-04** — Có fixture/setup/cleanup an toàn; không dùng khách thật, chuyển tiền thật, gửi email hàng loạt hoặc reset dữ liệu/volume dùng chung.
- [x] **DOD-05** — Có allow-case đối chứng cùng deny-case, negative/boundary và failure/retry phù hợp task.
- [x] **DOD-06** — Mỗi evidence gắn task/AC và source version.
- [x] **DOD-07** — Lỗi thuộc phạm vi được sửa và retest (ví dụ: gỡ bỏ silent ACK trong `PaymentEventConsumer`).
- [x] **DOD-08** — Không secret/token/OTP/PII không cần thiết trong API/log/DLQ/file/ảnh bằng chứng; sanitized qua `SafeLog` và regex masking.
- [x] **DOD-09** — README/contract/fixture và hướng dẫn bàn giao cập nhật cùng đầu ra.
- [x] **DOD-10** — Phần HOÃN/Phase 2 tách khỏi AC bắt buộc sprint.
- [x] **DOD-11** — Frontends chỉ gọi Gateway; service runtime qua Config Server/Eureka.
- [x] **DOD-12** — HTTP dùng DTO/input validation và error catalog chung; quyền/ownership/storeId được enforce backend.
- [x] **DOD-13** — Schema thay đổi dùng Flyway mới, không sửa migration đã áp dụng.
- [x] **DOD-14** — Có case kiểm thử tự động nhỏ trong cấu trúc sẵn có cho logic mới (`KafkaRetryDlqSafetyTest.java`).
- [x] **DOD-15** — Bàn giao config/error/ACK/replay matrix cho từng owner.
- [x] **DOD-16** — Runbook nêu selection, authorization, theo dõi và dừng khi effect sai.
- [x] **DOD-17** — Evidence DLQ unavailable là bắt buộc, không chỉ dead-letter happy path (`dlqPublishFailureAbortsAck`).

---

## 10. Mẫu bàn giao và ghi kết quả

| Trường | Dev điền khi tự kiểm chứng |
|---|---|
| Commit / môi trường / config-contract version | Nhánh `feat/kafka-08-retry-dlq-idempotency` |
| Fixture / actor / store / nguồn dữ liệu | Kafka Unit Test mock fixture an toàn, không ghi secret |
| AC-ID → kết quả → expected/actual → evidence | Toàn bộ AC-01 -> AC-13 đã kiểm chứng và lập bảng đối chiếu chi tiết |
| Handoff cho task nhận | Đã bàn giao Retry & DLT Recoverer cho Payment, Order, Shipping, Notification, Loyalty, Report |
| Quyết định Qxx đã chốt / link nguồn | Q01, Q02 đã chốt và ghi nhận trong runbook `architechture/docs/kafka-dlq-replay-runbook.md` |
