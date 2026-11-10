## DEP-02 — Toàn bộ hệ thống bằng Docker Compose, nạp đúng cấu hình và khởi động theo thứ tự phụ thuộc của các dịch vụ

**Phụ trách:** Mai Sơn Việt · **Sprint:** BACKLOG — chưa gán sprint · **Ước lượng:** 5 SP
**Phụ thuộc:** DEP-01

### 1. User Story

- **Là người vận hành**, tôi muốn toàn bộ hệ thống bằng Docker Compose, nạp đúng cấu hình và khởi động theo thứ tự phụ thuộc của các dịch vụ để triển khai và vận hành hệ thống ổn định.

### 2. Công việc

- Validate cấu hình môi trường
- Khởi động infra→Config→Eureka→business→Gateway→frontend
- Kiểm tra registration/routes và lỗi startup từng service

**Không bao gồm:** chạy down -v hoặc bỏ service lỗi để báo green.

### 3. Contract và đầu ra

| Thành phần | Chi tiết cần bàn giao |
| --- | --- |
| Đầu vào / nguồn tin cậy | Images/Dockerfiles, env secrets ngoài Git, DB/volume và Config/Eureka/Gateway/service manifests. |
| Đầu ra / contract | Stack startup runbook, service inventory và kết quả readiness theo thứ tự. |
| Điểm giao tiếp / deliverable đã cam kết | Running |

### 4. Tiêu chí hoàn thành

- Stack startup runbook, service inventory và kết quả readiness theo thứ tự.
- Dependency chưa ready: Không đánh toàn stack chạy được
- Restart với volume: Không mất dữ liệu hoặc chạy lại migration cũ
- Service thiếu secret: Báo đúng blocker, không hardcode để chạy
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Chốt manifest chứa đủ service thực tế; audit module chỉ deploy khi BE-43 có artifact, không giả có sẵn.
