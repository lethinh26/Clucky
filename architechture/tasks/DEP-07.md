## DEP-07 — Thiết lập sao lưu database hằng ngày, giữ bảy bản và thực hiện khôi phục thử để xác nhận bản sao lưu sử dụng được

**Phụ trách:** Mai Sơn Việt · **Sprint:** BACKLOG — chưa gán sprint · **Ước lượng:** 5 SP
**Phụ thuộc:** DEP-02

### 1. User Story

- **Là người vận hành**, tôi muốn thiết lập sao lưu database hằng ngày, giữ bảy bản và thực hiện khôi phục thử để xác nhận bản sao lưu sử dụng được.

### 2. Công việc

- Tạo dump với kiểm tra exit/integrity
- Chỉ rotate bản cũ sau backup mới thành công
- Restore vào môi trường riêng để đối chiếu

**Không bao gồm:** restore đè production hoặc recursive delete đường dẫn chưa xác minh.

### 3. Contract và đầu ra

| Thành phần | Chi tiết cần bàn giao |
| --- | --- |
| Đầu vào / nguồn tin cậy | PostgreSQL connection cấp quyền, lịch chạy, thư mục backup ngoài public và dung lượng. |
| Đầu ra / contract | Backup script/schedule, retention 7 bản thành công và restore procedure. |
| Điểm giao tiếp / deliverable đã cam kết | scripts/backup.sh |

### 4. Tiêu chí hoàn thành

- Backup script/schedule, retention 7 bản thành công và restore procedure.
- Dump thất bại: Không xóa bản tốt để đủ retention
- Khôi phục thử: Có schema/data cần thiết
- Script log/config: Không lộ password hoặc ghi vào web public
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Chốt lịch/timezone/storage/quyền đọc và retention đúng 7 bản; không tự backup Cloudinary binary như DB.
