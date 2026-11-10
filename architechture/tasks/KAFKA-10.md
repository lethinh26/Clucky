## KAFKA-10 — Phát sự kiện cho mọi thay đổi quản trị đã commit và ghi tập trung vào Audit Service, chống trùng và loại dữ liệu nhạy cảm

**Phụ trách:** Mai Sơn Việt · **Sprint:** 3 · **Ước lượng:** 8 SP
**Phụ thuộc:** KAFKA-01, BE-43

### 1. User Story

- **Là người phát triển dịch vụ**, tôi muốn phát sự kiện cho mọi thay đổi quản trị đã commit và ghi tập trung vào Audit Service, chống trùng và loại dữ liệu nhạy cảm để triển khai và tích hợp đúng dữ liệu, quyền và contract của hệ thống.

### 2. Công việc

- Producer coverage tài khoản/quyền, catalog/store/kho, order/payment/refund, promotion/loyalty/config, review
- Consumer audit.recorded, durable dispatch/retry, allowlist và readback API BE-43
- Không chỉ một listener; từng owner domain viết producer của mình, PIC Việt điều phối matrix/evidence
- Lập action inventory theo domain/role và owner, đánh dấu chưa có producer
- Chốt schema/allowlist và event boundary từng mutation
- Nối dispatcher ACK/retry và consumer dedup với BE-43
- Kiểm rollback/crash/replay/secret, đọc lại qua API Admin/Manager

### 3. Contract và đầu ra

- Envelope audit.recorded và payload actorId/actorRole/storeId/action/targetType/targetId/before/after từ backend
- Business mutation+durable intent atomic; retry giữ eventId; không fire-and-forget làm mất audit
- Consumer dedup eventId vào audit_service.audit_logs; không write Audit schema từ domain
- Review outbox chỉ intent; status/replyId được allowlist, không audit reason/content tự do hoặc OTP/password

### 4. Tiêu chí hoàn thành

- Mỗi loại mutation trong inventory commit: Có đúng audit logical event và record giải thích thay đổi
- Mutation rollback hoặc optimistic conflict: Không audit thành thay đổi thành công
- Broker outage và crash sau publish trước mark-sent: Intent còn, retry giữ eventId, không mất audit
- Replay/concurrent cùng event: Một audit record, không duplicate
- Actor/role/store client giả: Audit dùng identity và resource backend, không ghi actor tự khai
- Payload password/hash/OTP/token/reply text/hide reason: Lọc trước publish và persist/DTO, vẫn giữ action/target cần thiết
- Review reply/hide từ outbox hiện có: Dispatcher handoff không xóa pending trước ACK, consumer nhận status/replyId
- Event thiếu field/unknown action/version: Không lưu audit vô nghĩa hoặc fail-open; failure policy rõ
- Admin và Manager đọc audit sau consume: BE-43 scope đúng, Manager chỉ STAFF quán mình
- Một domain chưa có producer hoặc event bị treo: Inventory ghi missing/blocked với PIC, không tuyên bố mọi admin action đã phủ
- Audit service/DB lỗi: Consumer retry/DLQ an toàn, business committed không bị xóa lại
- Hai operation dùng cùng correlationId và một operation bị retry: Correlation chỉ trace; mỗi operation có identity riêng, retry cùng operation giữ eventId/operation key theo contract
- Đối chiếu đầu ra qua API/domain readback sau event và recovery: Nguồn sự thật persisted khớp expected, không chỉ log consumed/sent; thiếu downstream ghi BLOCKED phạm vi đó
- Config runtime hoặc payload lỗi có dữ liệu nhạy cảm: Config Server/Eureka và error policy được giữ; không log secret/raw sensitive payload khi báo lỗi
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Owner từng domain xác nhận action/fields trước-sau và cách durable publish
- Chốt schema evolution/unknown action, migration audit legacy với BE-43
- Không bỏ action vì chưa có code; ghi BLOCKED coverage chưa bàn giao
