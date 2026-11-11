## KAFKA-09 — Xử lý payment.failed để hủy đơn và giải phóng voucher, điểm đã giữ, bảo đảm các bước bù trừ không thực hiện trùng

**Phụ trách:** Trần Đức Anh · **Sprint:** 2 · **Ước lượng:** 8 SP
**Phụ thuộc:** KAFKA-03, BE-26, BE-34, BE-37

### 1. User Story

- **Là người phát triển dịch vụ**, tôi muốn xử lý payment.failed để hủy đơn và giải phóng voucher, điểm đã giữ, bảo đảm các bước bù trừ không thực hiện trùng.

### 2. Công việc

- Saga/compensation Payment→Order→Promotion, state/operation trace và recovery
- Dùng BE-26 cancel, BE-34 usage và BE-37 points contract; không transaction SQL liên DB
- Không hủy đơn PAID/terminal vì failure cũ, không tự triển khai bank refund hoặc policy late transfer hoãn
- Chốt failure eligibility và compensation state matrix với ba owners
- Lưu tiến độ từng bước và outcome bền vững
- Gọi idempotent domain ops, retry có giới hạn và handoff failure
- Kiểm crash/restart/partial success/confirmed race

### 3. Contract và đầu ra

- Input failure identity/order/payment/state/version theo KAFKA-03
- Mỗi bước compensation có operation key ổn định, retry riêng outcome, correlation nối toàn luồng
- Thứ tự cancel/release và final status được owner chốt; timeout không có nghĩa chưa commit
- Balance/quota release không vượt phần đã giữ/trừ

### 4. Tiêu chí hoàn thành

- Failure đủ điều kiện cho pending order: Cancel và release đúng quota/điểm, trạng thái cuối nhất quán
- Failure stale sau confirmed/PAID: Không hủy/hoàn ưu đãi sai, xử lý theo version policy
- Replay cùng failure hoặc hai consumer: Không cancel history/release effect hai lần
- Cancel thành công, voucher release lỗi: Ghi partial progress, retry bước còn thiếu, không làm lại mù
- Voucher release thành công, points timeout sau commit: Tra/retry cùng operation, không cộng điểm hai lần
- Restart ở mỗi boundary: Khôi phục từ state bền vững, không bỏ saga dang dở
- Usage/points chưa từng reserve hoặc đã release: No-op/conflict theo contract, không tạo credit ngoài nguồn
- Thiếu order/payment hoặc payload mâu thuẫn: Không đoán liên kết; failure có owner/trace
- Permanent failure/hết retry: Handoff DLQ/manual recovery theo quyền, không báo compensated giả
- Notification lỗi sau compensation: Không rollback business và không email state sai
- Hai operation dùng cùng correlationId và một operation bị retry: Correlation chỉ trace; mỗi operation có identity riêng, retry cùng operation giữ eventId/operation key theo contract
- Đối chiếu đầu ra qua API/domain readback sau event và recovery: Nguồn sự thật persisted khớp expected, không chỉ log consumed/sent; thiếu downstream ghi BLOCKED phạm vi đó
- Config runtime hoặc payload lỗi có dữ liệu nhạy cảm: Config Server/Eureka và error policy được giữ; không log secret/raw sensitive payload khi báo lỗi
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Chốt timeout/mismatch/expired mapping nào được trigger, canceled/refunded states và guard confirmed
- Chốt retry/durable saga record, lượng giữ/trừ và reversal policy; chưa rõ không tự refund tiền
