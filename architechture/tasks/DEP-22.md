## DEP-22 — Xác minh upload, đọc ảnh và sao lưu metadata trên production, bảo đảm cleanup không xóa asset vẫn đang được sử dụng

**Phụ trách:** Mai Sơn Việt · **Sprint:** BACKLOG — chưa gán sprint · **Ước lượng:** 3 SP
**Phụ thuộc:** DEP-06, BE-72

### 1. User Story

- **Là người vận hành**, tôi muốn xác minh upload, đọc ảnh và sao lưu metadata trên production, bảo đảm cleanup không xóa asset vẫn đang được sử dụng để triển khai và vận hành hệ thống ổn định.

### 2. Công việc

- Upload/replace tài nguyên test được phép
- Đối chiếu DB URL/publicId và asset thực
- Kiểm tra backup metadata và cleanup sau commit

**Không bao gồm:** batch destructive cleanup production hoặc thay chính sách retention chưa duyệt.

### 3. Contract và đầu ra

| Thành phần | Chi tiết cần bàn giao |
| --- | --- |
| Đầu vào / nguồn tin cậy | Release media flow, Cloudinary test resource được phép, DB metadata backup và cleanup policy. |
| Đầu ra / contract | Media smoke/backup-cleanup verification thuộc backlog. |
| Điểm giao tiếp / deliverable đã cam kết | Media deployment evidence |

### 4. Tiêu chí hoàn thành

- Media smoke/backup-cleanup verification thuộc backlog.
- Upload lỗi: Ảnh cũ còn dùng
- Cleanup retry: Không destroy asset hiện hành
- DB restore: Metadata có đối chiếu asset, không giả DB dump chứa file Cloudinary
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Chốt phạm vi backup asset/provider retention và quyền cleanup; không tự xóa folder cloud toàn hệ thống.
