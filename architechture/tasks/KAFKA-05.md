## KAFKA-05 — Xử lý order.created để tạo một shipment CREATED cho mỗi đơn DELIVERY, không tạo trùng khi Kafka gửi lại

**Phụ trách:** Lê Phú Thịnh · **Sprint:** 3 · **Ước lượng:** 3 SP
**Phụ thuộc:** KAFKA-02, BE-06

### 1. User Story

- **Là người phát triển dịch vụ**, tôi muốn xử lý order.created để tạo một shipment CREATED cho mỗi đơn DELIVERY, không tạo trùng khi Kafka gửi lại.

### 2. Công việc

- Consume order.created, validate contract, map order/store/address/method snapshot phù hợp MVP
- Transaction dedup+shipment, retry/DLQ theo KAFKA-08
- Không gán shipper/tracking hoặc tính phí lại khác Order snapshot
- Chốt trường event và pickup policy với BE-33/Order
- Triển khai transactional dedup+create và error categories
- Bàn giao query readback cho BE-33
- Kiểm replay/concurrent/crash/poison và ownership của query qua owner API

### 3. Contract và đầu ra

- Input từ KAFKA-02 theo envelope/version; orderId/eventId không lấy correlationId thay dedup
- Shipment CREATED, rule pickup/create-record theo quyết định owner; không join Order DB
- ACK sau persistence boundary; effect uniqueness theo event và business order policy

### 4. Tiêu chí hoàn thành

- order.created delivery hợp lệ: Một shipment CREATED đúng order/store/snapshot
- Replay cùng event và hai consumer đồng thời: Không shipment trùng
- Hai eventId cho cùng logical order: Theo business identity policy, không nhân shipment
- Pickup event: Đúng policy đã chốt, không tự gán trạng thái giao
- Thiếu field/sai type/schema: Không tạo record nửa vời; retry/DLQ có trace
- DB lỗi trước commit: Không ack làm mất event, replay tiếp tục được
- Crash sau DB commit trước ACK: Replay không tạo side effect thứ hai
- Shipping query sau consume và user ngoài quyền: BE-33 trả đúng CREATED/deny theo scope, không giả delivered
- Event chứa extra PII/secret: Chỉ persist allowlist cần thiết, log an toàn
- Hai operation dùng cùng correlationId và một operation bị retry: Correlation chỉ trace; mỗi operation có identity riêng, retry cùng operation giữ eventId/operation key theo contract
- Đối chiếu đầu ra qua API/domain readback sau event và recovery: Nguồn sự thật persisted khớp expected, không chỉ log consumed/sent; thiếu downstream ghi BLOCKED phạm vi đó
- Config runtime hoặc payload lỗi có dữ liệu nhạy cảm: Config Server/Eureka và error policy được giữ; không log secret/raw sensitive payload khi báo lỗi
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- *Q01 áp dụng kế hoạch:** PICKUP không tạo shipment; DELIVERY bắt buộc owner/store/receiver/address/fee/paymentMethod/totalAmount, tọa độ đi cặp hoặc cùng vắng cho event cũ. Unique order_id/source_event_id và receipt event_id bảo vệ identity; snapshot khác nhau không ghi đè.
- Chốt điều gì retry được so với DLQ khi event contract sai

**Cập nhật phạm vi 10/11:** Shipping có durable DLT sau bounded retry, không ACK nếu publish DLT lỗi; tài liệu liên quan. DELIVERY/PICKUP policy không đổi. Chưa nghiệm thu broker/crash/concurrency, không đánh DONE từ healthcheck. DELIVERY tạo CREATED từ snapshot Order; PICKUP lưu receipt no-op, không tạo shipment. Consumer và API đọc có mã triển khai, chưa nghiệm thu runtime/replay/concurrency; durable DLQ/replay vẫn chờ KAFKA-08, không đánh DONE toàn bộ.
