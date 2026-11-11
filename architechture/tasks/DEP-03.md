## DEP-03 — Cấu hình Nginx reverse proxy và HTTPS Let's Encrypt để truy cập hai frontend, API qua đúng tên miền và đường dẫn

**Phụ trách:** Mai Sơn Việt · **Sprint:** BACKLOG — chưa gán sprint · **Ước lượng:** 3 SP
**Phụ thuộc:** DEP-02

### 1. User Story

- **Là người vận hành**, tôi muốn cấu hình Nginx reverse proxy và HTTPS Let's Encrypt để truy cập hai frontend, API qua đúng tên miền và đường dẫn.

### 2. Công việc

- Map host/path tới đúng upstream
- Cấp/cấu hình TLS và redirect HTTP theo policy
- Kiểm tra reload/deep-link/API và renewal procedure

**Không bao gồm:** expose business service trực tiếp hoặc sửa DNS ngoài phạm vi được cấp.

### 3. Contract và đầu ra

| Thành phần | Chi tiết cần bàn giao |
| --- | --- |
| Đầu vào / nguồn tin cậy | Domain đã trỏ, Nginx config, frontend/Gateway upstream và certificate setup được cấp quyền. |
| Đầu ra / contract | Reverse proxy, HTTPS certificate/renewal và routing runbook. |
| Điểm giao tiếp / deliverable đã cam kết | HTTPS |

### 4. Tiêu chí hoàn thành

- Reverse proxy, HTTPS certificate/renewal và routing runbook.
- Truy cập HTTPS: Chứng chỉ đúng hostname
- Deep-link frontend: Không trả 404 do proxy sai
- API upstream lỗi: Không trả trang SPA giả JSON thành công
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Chốt domain và public ports; thao tác cấp cert cần quyền, không dùng cert tự ký rồi báo trust hợp lệ.
