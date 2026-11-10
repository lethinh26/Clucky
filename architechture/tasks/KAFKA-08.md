## KAFKA-08 — Retry, DLQ và xử lý sự kiện không lặp hiệu ứng cho Kafka consumer, hỗ trợ phát lại có kiểm soát khi khôi phục lỗi

**Phụ trách:** Mai Sơn Việt · **Sprint:** 3 · **Ước lượng:** 8 SP
**Phụ thuộc:** KAFKA-01

### 1. User Story

- **Là người phát triển dịch vụ**, tôi muốn retry, DLQ và xử lý sự kiện không lặp hiệu ứng cho Kafka consumer, hỗ trợ phát lại có kiểm soát khi khôi phục lỗi để triển khai và tích hợp đúng dữ liệu, quyền và contract của hệ thống.

### 2. Công việc

- Cấu hình/recovery contract dùng chung, consumer checklist, dead-letter metadata và runbook
- Phối hợp domain owners áp dụng transaction/idempotency trong service của họ
- Không thay business dedup bằng correlationId hoặc thêm platform mới chỉ để gom config
- config-repo
- backend
- Lập config matrix theo consumer, phân loại lỗi và ownership
- Hoàn thiện retry/DLQ recoverer và kiểm publish fail/ack windows
- Soạn replay procedure nhỏ có dry-run/selection/record phù hợp tool hiện có
- Cùng owner domain xác nhận idempotent effect và trace

### 3. Contract và đầu ra

- Topic/group/serializer/ack/retry/DLQ từ Config Server theo KAFKA-01
- Transient/permanent/unknown categories, bounded backoff/max attempt và retention theo cấu hình chốt
- ACK chỉ sau durable business outcome hoặc durable failure routing; DLQ publish lỗi không được ack im lặng
- Replay được phép có identity gốc, operator/criteria/phạm vi rõ, không dump secret trong DLT headers

### 4. Tiêu chí hoàn thành

- Transient failure rồi dependency hồi phục: Retry hữu hạn và xử lý thành công một effect
- Permanent/malformed event: Theo policy đi DLQ có cause/IDs, không busy loop
- Hết max retries: DLQ/failure bền vững, không mất event
- DLQ publish lỗi hoặc ACK bị mất: Không ack thành công giả, recovery còn nguồn
- Replay được cho phép từ DLQ: Identity giữ đúng, effect không nhân, có thao tác/owner trace
- Replay event đã xử lý thành công: Domain dedup, không nhân shipment/points/revenue/email
- Restart/rebalance giữa xử lý và ACK: Theo transaction/identity contract, không lost event
- DLT header/exception có token/PII marker: Đã sanitize, vẫn đủ error/category/source để điều tra
- Cấu hình thiếu/sai retry/group/topic: Fail rõ hoặc policy đã duyệt, không tự consume nhầm group
- Consumer domain chưa bàn giao dedup: Ghi BLOCKED coverage domain đó, không nhận shared config là toàn hệ thống đạt
- Hai operation dùng cùng correlationId và một operation bị retry: Correlation chỉ trace; mỗi operation có identity riêng, retry cùng operation giữ eventId/operation key theo contract
- Đối chiếu đầu ra qua API/domain readback sau event và recovery: Nguồn sự thật persisted khớp expected, không chỉ log consumed/sent; thiếu downstream ghi BLOCKED phạm vi đó
- Config runtime hoặc payload lỗi có dữ liệu nhạy cảm: Config Server/Eureka và error policy được giữ; không log secret/raw sensitive payload khi báo lỗi
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Owner Kafka/domain chốt topic retention, attempt/backoff/timeout và quyền replay
- Chốt handling unknown schema/poison, DLT payload masking và business-key dedup riêng từng domain

**Cập nhật phạm vi 10/11:** đã áp dụng retry/DLT cho Payment, Order, Shipping, Notification, Report; tài liệu liên quan. Không tự replay thật, không thay retention broker hoặc chứng nhận tất cả domain consumer; task vẫn cần nghiệm thu tích hợp/phạm vi còn lại.
