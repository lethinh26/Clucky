## KAFKA-03 — Phát sự kiện xác nhận hoặc thất bại thanh toán và dữ liệu hết hạn, sai lệch, hoàn tiền theo contract cho các service nhận

**Phụ trách:** Lê Phú Thịnh · **Sprint:** 3 · **Ước lượng:** 5 SP
**Phụ thuộc:** BE-30, BE-32, KAFKA-01

### 1. User Story

- **Là người phát triển dịch vụ**, tôi muốn phát sự kiện xác nhận hoặc thất bại thanh toán và dữ liệu hết hạn, sai lệch, hoàn tiền theo contract cho các service nhận để triển khai và tích hợp đúng dữ liệu, quyền và contract của hệ thống.

### 2. Công việc

- Producer Payment after-commit, snapshot/state mapping và email handoff INT-57 cũ
- Durable publication/retry/version với Order/Report/Notification
- Không tự đặt event/topic mới cho trạng thái chưa chốt, không viết webhook hoặc refund handler thay BE-30/32
- Lập state/event matrix từ BE-29/30/32
- Gắn intent bền vững và publish ACK/retry
- Chốt failure không hủy nhầm PAID với KAFKA-09
- Bàn giao fixtures và đối chiếu consumer outcomes

### 3. Contract và đầu ra

- Payment state và Order state tách biệt; confirmed chỉ khi nghiệp vụ xác nhận tiền đủ điều kiện
- Envelope chuẩn eventId/correlationId, dedup theo logical operation không theo request retry
- Mapping expiry/mismatch/refund→event/notification phải được owner chốt, không mặc định mọi lỗi là payment.failed

### 4. Tiêu chí hoàn thành

- Webhook/manual/COD/refund mutation hợp lệ: Event đúng mapping operation, không dùng state Order thay Payment
- Chỉ tạo QR PENDING hoặc webhook không xác thực: Không phát confirmed
- Payment rollback: Không publish success event
- Broker lỗi sau commit và publish ACK mất: Intent/retry bền vững, giữ eventId
- Duplicate webhook/manual retry: Một logical event effect cho cùng mutation
- Confirmed rồi failure cũ/expired race: Consumers xử lý theo version/state contract, không tự hủy PAID
- Refund mới APPROVED so với REFUNDED: Email/report nhận trạng thái chính xác, không thông báo đã hoàn sớm
- Payload thiếu amount/reference/source hoặc secret: Validate, không rò raw bank payload/credential
- Notification/Report unavailable: Payment không rollback, event còn có thể replay
- Hai operation dùng cùng correlationId và một operation bị retry: Correlation chỉ trace; mỗi operation có identity riêng, retry cùng operation giữ eventId/operation key theo contract
- Đối chiếu đầu ra qua API/domain readback sau event và recovery: Nguồn sự thật persisted khớp expected, không chỉ log consumed/sent; thiếu downstream ghi BLOCKED phạm vi đó
- Config runtime hoặc payload lỗi có dữ liệu nhạy cảm: Config Server/Eureka và error policy được giữ; không log secret/raw sensitive payload khi báo lỗi
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Chốt expiry/mismatch/refund event mapping, amount/transaction/order fields và version
- Payment/Order chốt stale failure sau confirmed và đảm bảo event không khiến hủy đơn đã thu tiền

**Cập nhật phạm vi 10/11:** bổ sung payment.failed terminal, C4 confirmed sau Order acceptance, bảo vệ stale failure và dedup downstream; tài liệu liên quan. Sai lệch giữ evidence, không hủy toàn đơn; refund execution vẫn chờ upstream, APPROVED không phải REFUNDED. Chưa đủ điều kiện DONE toàn bộ.
