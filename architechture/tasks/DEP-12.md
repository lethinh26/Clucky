## DEP-12 — Bàn giao cấu hình môi trường, quyền truy cập và quy trình rollback cho người vận hành qua kênh an toàn, không lộ secret

**Phụ trách:** Mai Sơn Việt · **Sprint:** BACKLOG — chưa gán sprint · **Ước lượng:** 3 SP
**Phụ thuộc:** DEP-11

### 1. User Story

- **Là người vận hành**, tôi muốn bàn giao cấu hình môi trường, quyền truy cập và quy trình rollback cho người vận hành qua kênh an toàn, không lộ secret để triển khai và vận hành hệ thống ổn định.

### 2. Công việc

- Liệt kê quyền/config cần bàn giao
- Truyền credential qua kênh được duyệt, tài liệu chỉ tên biến
- Diễn tập rollback ở môi trường được phép và ghi caveat migration

**Không bao gồm:** commit .env thật hoặc restore production không được phép.

### 3. Contract và đầu ra

| Thành phần | Chi tiết cần bàn giao |
| --- | --- |
| Đầu vào / nguồn tin cậy | Deployment topology, secret store/access owner, env keys, backup và previous release. |
| Đầu ra / contract | Handover runbook, secure credential transfer checklist và rollback procedure đã đối chiếu. |
| Điểm giao tiếp / deliverable đã cam kết | Handover doc |

### 4. Tiêu chí hoàn thành

- Handover runbook, secure credential transfer checklist và rollback procedure đã đối chiếu.
- Thiếu quyền người nhận: Ghi blocker, không công khai credential để khắc phục
- Rollback app với schema mới: Kiểm tra tương thích, không tự down migration phá data
- Người nhận xác nhận: Có checklist tiếp nhận rõ
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Chốt kênh secret và recovery owner; schema rollback cần kế hoạch riêng nếu không backward-compatible.
