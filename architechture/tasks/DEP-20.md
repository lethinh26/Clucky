## DEP-20 — Xác minh gửi email an toàn trên production và bảo đảm email_logs được sao lưu, khôi phục cùng database

**Phụ trách:** Mai Sơn Việt · **Sprint:** BACKLOG — chưa gán sprint · **Ước lượng:** 3 SP
**Phụ thuộc:** DEP-06, BE-60

### 1. User Story

- **Là người vận hành**, tôi muốn xác minh gửi email an toàn trên production và bảo đảm email_logs được sao lưu, khôi phục cùng database để triển khai và vận hành hệ thống ổn định.

### 2. Công việc

- Gửi một message kiểm soát
- Theo messageId tới SMTP outcome/email_logs
- Backup và restore thử email_logs ở môi trường riêng

**Không bao gồm:** đọc inbox khách hoặc restore đè DB production.

### 3. Contract và đầu ra

| Thành phần | Chi tiết cần bàn giao |
| --- | --- |
| Đầu vào / nguồn tin cậy | Production sender/recipient được phép, BE-60, BE-62, backup procedure và release version. |
| Đầu ra / contract | Email smoke + email_logs backup verification thuộc backlog. |
| Điểm giao tiếp / deliverable đã cam kết | Deployment evidence |

### 4. Tiêu chí hoàn thành

- Email smoke + email_logs backup verification thuộc backlog.
- Mail config sai: Báo failure, không ghi sent giả
- Backup thiếu email_logs: Chưa đạt checklist
- Evidence: Không chứa App Password/OTP
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Chốt người nhận/lịch test và secret access, không gửi thử hàng loạt khách.
