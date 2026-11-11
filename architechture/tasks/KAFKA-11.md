## KAFKA-11 — Thống nhất và tích hợp sự kiện khuyến mãi đã duyệt từ Promotion sang Notification, đủ dữ liệu chọn email và người nhận

**Phụ trách:** Cao Tất Thành · **Sprint:** 3 · **Ước lượng:** 2 SP
**Phụ thuộc:** KAFKA-04, KAFKA-12

### 1. User Story

- **Là người phát triển dịch vụ**, tôi muốn thống nhất và tích hợp sự kiện khuyến mãi đã duyệt từ Promotion sang Notification, đủ dữ liệu chọn email và người nhận để triển khai và tích hợp đúng dữ liệu, quyền và contract của hệ thống.

### 2. Công việc

- Chốt audience/recipient được phép
- Map event sang EmailMessage/template
- Kiểm tra replay và lỗi gửi không đảo approval

**Không bao gồm:** kéo promotion email vào TEST-22 sprint hoặc thêm campaign marketing ngoài SRS.

### 3. Contract và đầu ra

| Thành phần | Chi tiết cần bàn giao |
| --- | --- |
| Đầu vào / nguồn tin cậy | promotion.approved từ KAFKA-04, Promotion metadata và template/message contract. |
| Đầu ra / contract | Promotion→Notification email event contract/integration thuộc backlog. |
| Điểm giao tiếp / deliverable đã cam kết | Promotion email event |

### 4. Tiêu chí hoàn thành

- Promotion→Notification email event contract/integration thuộc backlog.
- Proposal chưa approve: Không gửi email đã duyệt
- Replay approval: Không gửi trùng theo idempotency
- SMTP lỗi: Promotion vẫn giữ state nghiệp vụ đúng
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Chốt audience/consent và template variables trước triển khai; không tự broadcast toàn bộ khách.
