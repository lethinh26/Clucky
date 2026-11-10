## DEP-04 — Cấu hình tên miền, CORS và trusted origins để chỉ hai frontend được phép gọi API với thông tin xác thực

**Phụ trách:** Mai Sơn Việt · **Sprint:** BACKLOG — chưa gán sprint · **Ước lượng:** 2 SP
**Phụ thuộc:** DEP-03

### 1. User Story

- **Là người vận hành**, tôi muốn cấu hình tên miền, CORS và trusted origins để chỉ hai frontend được phép gọi API với thông tin xác thực.

### 2. Công việc

- Đối chiếu domain→upstream
- Khai báo origins/methods/headers cần thiết
- Thử browser preflight/auth và origin không được phép

**Không bao gồm:** coi CORS là thay thế auth/RBAC hoặc tự cấp domain mới.

### 3. Contract và đầu ra

| Thành phần | Chi tiết cần bàn giao |
| --- | --- |
| Đầu vào / nguồn tin cậy | Customer/Admin/API origins, reverse proxy và auth/Firebase origin requirements khi áp dụng. |
| Đầu ra / contract | DNS/config CORS/trusted-origin matrix và preflight behavior hợp lệ. |
| Điểm giao tiếp / deliverable đã cam kết | Domain works |

### 4. Tiêu chí hoàn thành

- DNS/config CORS/trusted-origin matrix và preflight behavior hợp lệ.
- Allowed origin: Request/preflight hoạt động
- Origin lạ: Không được cấp CORS credential trái phép
- HTTPS frontend: Không mixed-content API URL
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Chốt DNS owner/TTL và các origin môi trường; không dùng wildcard credentials để sửa lỗi nhanh.
