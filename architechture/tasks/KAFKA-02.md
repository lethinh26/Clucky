## KAFKA-02 — Phát sự kiện tạo, đổi trạng thái, hoàn tất và hủy đơn sau khi Order commit, giữ eventId và correlationId khi gửi lại

**Phụ trách:** Trần Đức Anh · **Sprint:** 2 · **Ước lượng:** 5 SP
**Phụ thuộc:** BE-25, KAFKA-01

### 1. User Story

- **Là người phát triển dịch vụ**, tôi muốn phát sự kiện tạo, đổi trạng thái, hoàn tất và hủy đơn sau khi Order commit, giữ eventId và correlationId khi gửi lại để triển khai và tích hợp đúng dữ liệu, quyền và contract của hệ thống.

### 2. Công việc

- Producer order.created/status-changed/completed/cancelled, payload/version và durable publication
- Audit là KAFKA-10 riêng; phối hợp email contract từ INT-56 cũ
- Không viết thay business state machine hoặc Shipping/Promotion/Report consumers
- Lập operation→event→recipient/payload matrix với từng consumer
- Gắn durable intent vào đúng transaction Order và implement dispatcher/retry theo KAFKA-08
- Giữ ordering/version/partition policy được chốt
- Kiểm rollback, crash windows, broker outage và replay downstream

### 3. Contract và đầu ra

- Envelope eventId/correlationId/eventType/sourceService/occurredAt và payload snapshot đã chốt
- EventId ổn định khi retry cùng operation, khác operation có identity riêng dù cùng correlation
- Chỉ mutation committed, không fire-and-forget trước/afterCommit không có recovery bền vững
- Payload chỉ field downstream cần, không toàn PII/cart/entity

### 4. Tiêu chí hoàn thành

- Create/status/completed/cancelled thành công: Đủ event tương ứng operation đã commit, snapshot đúng
- Order mutation rollback: Không event thành công được consume
- Broker outage sau Order commit: Intent còn bền vững, gửi lại khi hồi phục
- Crash sau publish trước mark-sent: Retry giữ eventId, consumer có thể dedup
- Hai thay đổi liên tiếp cùng order: Sequence/state theo policy, không payload cũ ghi như state mới
- Cùng correlation nhưng hai operation khác: Không dedup nhầm hai sự kiện hợp lệ
- Replay order.created/completed: Shipping/points/report không nhân effect khi owner kiểm
- Payload thiếu required/sai schema hoặc chứa secret: Chặn/báo lỗi, không publish bản không dùng được hoặc rò dữ liệu
- Email downstream lỗi: Order không rollback và event không mất
- Hai operation dùng cùng correlationId và một operation bị retry: Correlation chỉ trace; mỗi operation có identity riêng, retry cùng operation giữ eventId/operation key theo contract
- Đối chiếu đầu ra qua API/domain readback sau event và recovery: Nguồn sự thật persisted khớp expected, không chỉ log consumed/sent; thiếu downstream ghi BLOCKED phạm vi đó
- Config runtime hoặc payload lỗi có dữ liệu nhạy cảm: Config Server/Eureka và error policy được giữ; không log secret/raw sensitive payload khi báo lỗi
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Order/consumers chốt payload schema/version/order sequence, key partition và compatibility
- Chốt durable mechanism và ACK/mark-sent, không yêu cầu outbox framework mới nếu cấu trúc hiện có đủ
