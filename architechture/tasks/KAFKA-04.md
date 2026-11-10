## KAFKA-04 — Phát sự kiện promotion.approved sau khi Admin duyệt voucher chi nhánh, kèm định danh để truy vết và chống xử lý lặp

**Phụ trách:** Cao Tất Thành · **Sprint:** 3 · **Ước lượng:** 2 SP
**Phụ thuộc:** BE-35, KAFKA-01

### 1. User Story

- **Là người phát triển dịch vụ**, tôi muốn phát sự kiện promotion.approved sau khi Admin duyệt voucher chi nhánh, kèm định danh để truy vết và chống xử lý lặp.

### 2. Công việc

- Chốt fields của approval event
- Phát sau approve commit
- Retry giữ ID và không phát cho proposal chưa duyệt

**Không bao gồm:** tự duyệt voucher hoặc gửi email trong producer.

### 3. Contract và đầu ra

| Thành phần | Chi tiết cần bàn giao |
| --- | --- |
| Đầu vào / nguồn tin cậy | BE-35 approve transaction, promotion ID/store, actor và DomainEvent. |
| Đầu ra / contract | Producer promotion.approved có idempotency/correlation theo contract. |
| Điểm giao tiếp / deliverable đã cam kết | KafkaTemplate |

### 4. Tiêu chí hoàn thành

- Producer promotion.approved có idempotency/correlation theo contract.
- Approve rollback: Không event success
- Replay approve: Không tạo event nghiệp vụ trùng
- Scope STORE: Payload giữ đúng store
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Chốt version/recipient semantics với KAFKA-11; task backlog không nằm luồng voucher thường sprint.
