## DEP-08 — README hướng dẫn cài đặt, cấu hình và chạy dự án, kèm kiến trúc và tài liệu API đúng bản bàn giao

**Phụ trách:** Mai Sơn Việt · **Sprint:** BACKLOG — chưa gán sprint · **Ước lượng:** 3 SP
**Phụ thuộc:** DEP-06, DEP-09

### 1. User Story

- **Là người vận hành**, tôi muốn rEADME hướng dẫn cài đặt, cấu hình và chạy dự án, kèm kiến trúc và tài liệu API đúng bản bàn giao để triển khai và vận hành hệ thống ổn định.

### 2. Công việc

- Đối chiếu lệnh với cấu trúc repo
- Viết thứ tự startup/profile/env và Gateway entry
- Ghi phần MVP/Phase 2, known gaps và link tài liệu còn tồn tại

**Không bao gồm:** thay tài liệu bằng screenshot không có lệnh hoặc claim test chưa chạy.

### 3. Contract và đầu ra

| Thành phần | Chi tiết cần bàn giao |
| --- | --- |
| Đầu vào / nguồn tin cậy | Repo modules/config/env examples, startup sequence và API/docs hiện hành. |
| Đầu ra / contract | README final với prerequisites, run commands, architecture ownership và troubleshooting. |
| Điểm giao tiếp / deliverable đã cam kết | README.md |

### 4. Tiêu chí hoàn thành

- README final với prerequisites, run commands, architecture ownership và troubleshooting.
- Làm theo từ môi trường sạch: Không thiếu bước tạo DB/config trọng yếu
- Env example: Không chứa secret
- Link/path: Trỏ đúng file/endpoint hiện hành
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Chốt môi trường hỗ trợ và cấu hình đang dùng; không ghi backend hoàn thiện nếu chỉ scaffold.
