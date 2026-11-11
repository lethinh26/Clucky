## KAFKA-12 — Xử lý sự kiện Order, Payment để tạo thông báo và yêu cầu gửi email đúng người, chống trùng và không rollback nghiệp vụ khi email lỗi

**Phụ trách:** Cao Tất Thành · **Sprint:** 2 · **Ước lượng:** 5 SP
**Phụ thuộc:** KAFKA-01, BE-38, BE-62, KAFKA-02, KAFKA-03

### 1. User Story

- **Là người phát triển dịch vụ**, tôi muốn xử lý sự kiện Order, Payment để tạo thông báo và yêu cầu gửi email đúng người, chống trùng và không rollback nghiệp vụ khi email lỗi.

### 2. Công việc

- Consumer orchestration, event→channel/recipient/template mapping, dedup và enqueue durable
- Nhận INT-42/59/TEST-21 lịch sử; phối hợp OTP/order/payment/refund email evidence
- Không làm SMTP/renderer BE-60, scheduler BE-62, failure API BE-63; promotion.approved/email vẫn backlog
- Lập supported-event matrix với producer và recipient source trusted
- Hoàn thiện validation/mapping và transaction dedup/inbox/enqueue
- Tích hợp BE-60/62/63, không gọi sender để block nghiệp vụ nguồn
- Kiểm channel partial failure/replay/restart/PII và readback cả inbox/email

### 3. Contract và đầu ra

- Envelope validated event/source/version và delivery identity; eventId/correlationId/messageId có vai trò riêng
- Một event có thể nhiều người/kênh/template: khóa logical delivery theo contract, không eventId-only làm mất recipient hợp lệ
- Inbox insert/dedup/email intent có boundary bền vững, không ack trước khi giữ việc cần làm
- Template từ state snapshot, APPROVED không gửi đã REFUNDED; auth OTP do Identity contract

### 4. Tiêu chí hoàn thành

- Order/payment event được hỗ trợ hợp lệ: Inbox/job đúng recipient/template/refId/state, trace nối được
- Một event cần nhiều recipient/kênh: Không dedup nhầm mất kênh/người, cũng không nhân job
- Replay/concurrent cùng event: Không duplicate inbox/email logical job
- Inbox commit nhưng enqueue email lỗi hoặc ngược lại: Recovery theo transaction/intent, không mất kênh âm thầm
- Crash sau effect trước ACK: Replay tiếp tục/no-op đúng, không nhân gửi logic
- SMTP failed/unknown hoặc BE-62 unavailable: Outcome bàn giao, không rollback Order/Payment
- Refund chỉ APPROVED: Không gửi nội dung đã hoàn; REFUNDED mới dùng template tương ứng
- OTP/register/reset evidence phối hợp: Đúng purpose/expiry/recipient, không lộ OTP; không nhận producer ngoài scope đã đạt
- Event malformed/unknown/không được hỗ trợ: Failure/ignore theo policy có trace, không gửi nhầm
- Payload chứa recipient giả hoặc dữ liệu nhạy cảm thừa: Nguồn recipient tin cậy, minimize/sanitize trước log/DLQ
- Promotion email đang backlog: Không tự bật consumer/campaign để hoàn matrix
- Customer/Staff đọc inbox sau xử lý: BE-38 trả đúng owner/read-state, không dùng inbox seed thay pipeline
- Hai operation dùng cùng correlationId và một operation bị retry: Correlation chỉ trace; mỗi operation có identity riêng, retry cùng operation giữ eventId/operation key theo contract
- Đối chiếu đầu ra qua API/domain readback sau event và recovery: Nguồn sự thật persisted khớp expected, không chỉ log consumed/sent; thiếu downstream ghi BLOCKED phạm vi đó
- Config runtime hoặc payload lỗi có dữ liệu nhạy cảm: Config Server/Eureka và error policy được giữ; không log secret/raw sensitive payload khi báo lỗi
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Chốt event nào gửi kênh nào, recipient/template/version và operation key đa recipient
- Chốt retry delivery khi SMTP accepted nhưng mất response với BE-62; không hứa mailbox exactly-once
- Map mismatch/expired/refund theo KAFKA-03 đã duyệt, không tự thêm topic hoặc campaign
