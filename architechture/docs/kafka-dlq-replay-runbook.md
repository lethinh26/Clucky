# Kafka Retry, DLQ & Controlled Replay Runbook

> **Tài liệu hướng dẫn vận hành, xử lý Dead-Letter Queue (DLQ) và phát lại sự kiện có kiểm soát cho nền tảng Clucky.**
> Áp dụng cho các domain: `Order` (`cart-order-service`), `Payment` (`payment-service`), `Shipping` (`shipping-service`), `Notification` (`notification-service`), `Promotion & Loyalty` (`promotion-loyalty-service`), `Review & Report` (`review-report-service`).

---

## 1. Mục tiêu & Nguyên tắc cốt lõi

1. **Bảo toàn dữ liệu (Zero Event Loss)**: Không nuốt lỗi (silent swallow). Khi consumer thất bại, chỉ ACK sau khi xử lý thành công hoặc đã đẩy vào topic Dead-Letter (`.DLT`) bền vững. Nếu publish vào DLT thất bại, container ngừng tiến trình offset để giữ nguyên bản ghi nguồn.
2. **Không bận vòng lặp vô ích (No Busy-Loop on Poison Messages)**: Phân loại lỗi rõ ràng. Các lỗi cú pháp, schema không hợp lệ, dữ liệu malformed đi thẳng vào DLT mà không retry. Lỗi tạm thời (transient) được retry có chặn trên (`FixedBackOff`).
3. **Idempotency & Không nhân đôi hiệu ứng (No Duplicate Side-Effects)**: Replay từ DLT giữ nguyên `eventId` và `correlationId` gốc. Từng domain consumer chịu trách nhiệm khử trùng nghiệp vụ (business deduplication).
4. **Bảo mật & Che giấu thông tin nhạy cảm (Sanitization)**: Headers và logs trong DLT tuyệt đối không chứa token, password, apiKey, credit card hoặc PII thô.

---

## 2. Ma trận Cấu hình & Deduplication theo Domain Consumer

| Domain / Service | Consumer Group | Topic Lắng nghe | Topic DLT | Business Dedup Key | Cơ chế bảo vệ Idempotent |
|---|---|---|---|---|---|
| **Notification** (`notification-service`) | `notification-group` | `order.*`, `payment.*`, `promotion.approved` | `<topic>.DLT` | `operationKey = UUID(channel:eventType:eventId:recipient)` | Kiểm tra `notificationRepository.findByOperationKey`. Nếu tồn tại -> skip ghi DB và skip gửi email. |
| **Order** (`cart-order-service`) | `cart-order-service-group` | `payment.failed` | `payment.failed.DLT` | `orderId` / `orderCode` | Kiểm tra `OrderStatus`. Nếu đơn hàng đã `CANCELLED` hoặc trạng thái không hợp lệ -> skip bù trừ. |
| **Report** (`review-report-service`) | `review-report-service` | `order.completed`, `payment.confirmed`, `order.cancelled` | `<topic>.DLT` | `eventId` + `eventType` + `orderId` | Kiểm tra bảng `processed_events.claim(...)`. Nếu eventId đã claim -> return `false`, không cộng doanh thu lần 2. |
| **Loyalty** (`promotion-loyalty-service`) | `promotion-loyalty-service` | `order.completed`, `order.cancelled` | `<topic>.DLT` | `eventId` + `orderId` | Kiểm tra giao dịch tích/trừ điểm trong `loyalty_transactions`. Tránh nhân đôi điểm thưởng. |
| **Payment** (`payment-service`) | `payment-service` | `order.cancelled` | `order.cancelled.DLT` | `paymentId` / `transactionCode` | Kiểm tra trạng thái giao dịch (`REFUNDED` / `FAILED`). |
| **Shipping** (`shipping-service`) | `shipping-service` | `order.created`, `order.cancelled` | `<topic>.DLT` | `orderId` | Kiểm tra bản ghi shipment. Đơn vị chuyển phát chỉ tạo 1 shipment duy nhất. |

---

## 3. Phân loại Ngoại lệ (Exception Classification)

```mermaid
flowchart TD
    EventReceived["Nhận ConsumerRecord từ Kafka"] --> Process{"Consumer xử lý sự kiện"}
    Process -->|Thành công| Ack["ACK & Commit Offset"]
    Process -->|Xảy ra Ngoại lệ| CheckType{"Phân loại Ngoại lệ"}
    
    CheckType -->|Non-Retryable / Poison| DLT["Chuyển thẳng vào <topic>.DLT<br/>(0 retry, không busy loop)"]
    CheckType -->|Transient Error| Retry{"Retry hữu hạn<br/>(FixedBackOff max=3, 1000ms)"}
    
    Retry -->|Hồi phục thành công| Ack
    Retry -->|Hết số lần Retry| DLT
    
    DLT --> SendDLT{"Publish vào Kafka DLT"}
    SendDLT -->|Gửi DLT Thành công| AckDLT["ACK & Commit Record nguồn"]
    SendDLT -->|Gửi DLT Thất bại| AbortAck["Ném IllegalStateException<br/>(KHÔNG ACK - Giữ record nguồn)"]
```

### A. Non-Retryable / Permanent / Poison (Không retry, đi thẳng DLT)
- `java.lang.IllegalArgumentException`: Thiếu trường bắt buộc, payload không đúng business contract.
- `com.fasterxml.jackson.core.JsonProcessingException`: JSON malformed, hỏng cú pháp.
- `org.springframework.messaging.converter.MessageConversionException`: Sai kiểu dữ liệu envelope.
- `org.springframework.kafka.support.serializer.DeserializationException`: Lỗi giải mã message.
- `java.lang.ClassCastException`: Lỗi ép kiểu payload.

### B. Transient / Retryable (Retry hữu hạn có backoff)
- `org.springframework.web.client.RestClientException` / `ResourceAccessException`: Lỗi mạng, timeout khi gọi downstream REST.
- `java.net.ConnectException`, `java.util.concurrent.TimeoutException`: Kết nối tạm thời gián đoạn.
- `org.springframework.dao.TransientDataAccessException`: Deadlock cơ sở dữ liệu, connection pool cạn tạm thời.
- `java.lang.IllegalStateException`: Có thể bao bọc lỗi dependency tạm thời; không phân loại toàn bộ nhóm này là poison.

---

## 4. Đặc tả Headers trong Topic Dead-Letter (.DLT)

Mỗi record khi chuyển vào topic `<topic>.DLT` chỉ giữ các headers định danh an toàn (`X-Event-ID`, `X-Correlation-ID`) và bổ sung các header chẩn đoán sau; không sao chép headers tùy ý từ input để tránh lộ secret/PII:

| Header Key | Kiểu dữ liệu | Ý nghĩa | Ví dụ |
|---|---|---|---|
| `X-DLT-Original-Topic` | String | Topic ban đầu mà consumer lắng nghe | `order.completed` |
| `X-DLT-Original-Partition` | String | Partition nguồn | `1` |
| `X-DLT-Original-Offset` | String | Offset của bản ghi gặp lỗi | `10542` |
| `X-DLT-Original-Timestamp` | String | Thời điểm message gốc được tạo (epoch ms) | `1731244800000` |
| `X-DLT-Exception-Class` | String | Tên lớp exception gốc gây ra lỗi (sanitized) | `java.lang.IllegalArgumentException` |
| `X-DLT-Exception-Message` | String | Thông báo cố định, không sao chép nội dung exception | `Consumer processing failed` |
| `X-DLT-Failed-At` | String | Thời điểm đưa vào DLT (ISO-8601 Instant) | `2026-11-10T13:45:00.123Z` |

---

## 5. Quy trình 5 bước Phát lại có kiểm soát (Controlled Replay Procedure)

### Bước 1: Giám sát và Trích xuất sự kiện lỗi từ DLT
Sử dụng Kafka Console Consumer hoặc công cụ quản trị Kafka để đọc các bản ghi trong topic `<topic>.DLT`:
```bash
# Đọc 10 bản ghi gần nhất từ topic DLT kèm headers
kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic order.completed.DLT \
  --from-beginning \
  --property print.key=true \
  --property print.headers=true \
  --property print.timestamp=true \
  --max-messages 10
```
- Đọc giá trị `X-DLT-Exception-Class` và `X-DLT-Exception-Message` để chẩn đoán nguyên nhân (lỗi code, lỗi schema, hoặc downstream sập).

### Bước 2: Dry-run & Xác định Phạm vi Replay
- **Không bao giờ replay hàng loạt toàn bộ topic DLT khi chưa rõ nguyên nhân.**
- Lọc các record cần replay theo:
  - Danh sách `X-Event-ID` cụ thể.
  - Hoặc khoảng thời gian phát sinh sự cố (`X-DLT-Failed-At`).
- Đối chiếu trạng thái hiện tại của cơ sở dữ liệu đích (DB Readback) để xác định xem sự kiện đã từng được xử lý một phần hay chưa.

### Bước 3: Phê duyệt & Ghi nhận Thao tác (Audit Trail)
- Replay phải được thực hiện bởi người có thẩm quyền (System Admin / Technical Lead).
- Ghi nhận thông tin vào log bảo trì:
  - **Operator**: Tên người thực hiện.
  - **Reason**: Lý do replay (ví dụ: đã sửa bug BE-xx, downstream payment đã hồi phục).
  - **Target Event IDs**: Danh sách `eventId` được duyệt replay.
  - **Timestamp**: Thời điểm tiến hành.

### Bước 4: Thực thi Replay (Đẩy lại Topic gốc)
DLT value là quarantine envelope (`sourceTopic`, `sourceKey`, `partition`, `offset`, `consumerService`, `sha256`, `replayable`, và `event` nếu hợp lệ), **không phải raw event**. Chỉ giữ các trường numeric/boolean cần thiết trong payload; không lưu chuỗi tự do, email, địa chỉ, OTP hoặc nested payload. Poison/malformed có `replayable: false`, cần điều tra tại nguồn.

Chạy công cụ có sẵn từ repo root để dry-run một quarantine record:
```bash
python scripts/replay-kafka-dlt.py secrets/dlt-record.json
```

Chỉ sau phê duyệt mới thêm `--publish --source-record secrets/original-event.json --expected-sha256 <fileSha256-tu-dry-run> --reason <ly-do>`. Công cụ yêu cầu original value có SHA-256 khớp quarantine, giữ nguyên key/eventId/correlationId, xác nhận broker ACK và ghi audit trail. Không đẩy trực tiếp quarantine hoặc partial payload vào topic gốc. Công cụ chỉ hỗ trợ các order/payment topics trong allowlist; các topic khác cần quy trình domain riêng, không nới allowlist chỉ để ép replay.

### Bước 5: Kiểm tra Hậu Replay & Xác minh Tính Toàn vẹn (Post-Verification)
1. Kiểm tra log consumer đích xem đã log `kafka_listener_returned` thành công hay chưa.
2. Kiểm tra log domain dedup:
   - Nếu là replay lần 2 sau khi đã từng thành công: Quan sát log `*_replay_skipped` (không nhân đôi số tiền, không gửi 2 email, không tích 2 lần điểm).
3. Đọc lại API / DB của service:
   - Khớp trạng thái đơn hàng (`COMPLETED`).
   - Khớp số dư ví điểm.
   - Báo cáo doanh thu chỉ ghi nhận đúng 1 lần cho `orderId`.

---

## 6. Chính sách Bảo mật Dữ liệu (Sanitization & Masking)

1. **Loại bỏ Secret trong DLT Headers**:
   - Không lưu raw exception message; `X-DLT-Exception-Message` luôn là `Consumer processing failed`. Điều tra bằng exception class, ID và source topic/partition/offset.
   - Chỉ chuyển tiếp `X-Event-ID`/`X-Correlation-ID` hợp lệ; không sao chép authorization hoặc DLT headers cũ.
2. **Không in Raw Payload nhạy cảm vào log lỗi**:
   - Log lỗi trong consumer tuân thủ tiêu chuẩn `SafeLog`, chỉ ghi ID, type và partition/offset, không log toàn bộ body chứa thông tin cá nhân.
