## KAFKA-06 — Xử lý sự kiện order.completed để cộng điểm cho đúng khách, lưu biến động điểm và không cộng lại khi nhận sự kiện trùng

**Phụ trách:** Cao Tất Thành · **Sprint:** 2 · **Ước lượng:** 3 SP
**Phụ thuộc:** KAFKA-02, BE-37

### 1. User Story

- **Là người phát triển dịch vụ**, tôi muốn xử lý sự kiện order.completed để cộng điểm cho đúng khách, lưu biến động điểm và không cộng lại khi nhận sự kiện trùng.

### 2. Công việc

- Consume order.completed, validate snapshot và gọi nghiệp vụ earn BE-37
- Dedup/transaction, replay, ordering/failure mapping
- Không cộng điểm khi chỉ payment.confirmed hoặc tự đặt earn/tier policy
- Chốt event amount/base và config version với Order/BE-37
- Nối consumer→earn operation, giữ atomic outcome/ACK
- Triển khai retry/DLQ và trace
- Kiểm replay/concurrent/cancel-ordering và amount boundaries

### 3. Contract và đầu ra

- Event order/customer/eligible amount/version từ KAFKA-02
- Ledger operation gắn order/action, eventId dedup; correlation chỉ trace
- Dùng rate/version/rounding từ BE-37, balance và ledger atomic trong service sở hữu

### 4. Tiêu chí hoàn thành

- Completed hợp lệ: Một earn đúng customer/order/amount/rate
- Payment confirmed nhưng chưa completed: Không earn nhầm từ event khác
- Replay hoặc hai consumer cùng completed: Không cộng điểm hai lần
- EventId mới nhưng cùng order/earn operation: Theo business identity không nhân ledger
- Amount invalid/customer thiếu/version không hỗ trợ: Reject/route failure, không cộng sai người
- DB lỗi giữa ledger và balance: Rollback/retry không lệch số dư
- Crash sau effect trước ACK: Replay đọc lại outcome, không effect lần hai
- Config rate đổi trước xử lý delayed event: Áp đúng version/time policy đã chốt
- Completed/cancel/refund sai thứ tự: Không tự đoán reversal, outcome theo state policy hoặc blocked xử lý
- Khách đọc điểm sau consume: BE-37/UI phản ánh ledger thật theo owner
- Hai operation dùng cùng correlationId và một operation bị retry: Correlation chỉ trace; mỗi operation có identity riêng, retry cùng operation giữ eventId/operation key theo contract
- Đối chiếu đầu ra qua API/domain readback sau event và recovery: Nguồn sự thật persisted khớp expected, không chỉ log consumed/sent; thiếu downstream ghi BLOCKED phạm vi đó
- Config runtime hoặc payload lỗi có dữ liệu nhạy cảm: Config Server/Eureka và error policy được giữ; không log secret/raw sensitive payload khi báo lỗi
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Chốt eligible base amount, rate version theo thời điểm nào và canceled/refunded sau completed
- Chưa có reversal policy không tự trừ điểm hoặc sửa lịch sử
