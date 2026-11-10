## DEP-11 — Rà soát phạm vi phát hành, lỗi còn mở và khả năng rollback, sau đó gắn tag cho đúng phiên bản được duyệt

**Phụ trách:** Mai Sơn Việt · **Sprint:** BACKLOG — chưa gán sprint · **Ước lượng:** 2 SP
**Phụ thuộc:** DEP-06, DEP-07, DEP-08, DEP-10

### 1. User Story

- **Là người vận hành**, tôi muốn rà soát phạm vi phát hành, lỗi còn mở và khả năng rollback, sau đó gắn tag cho đúng phiên bản được duyệt để triển khai và vận hành hệ thống ổn định.

### 2. Công việc

- Kiểm kê changes/evidence/open issues
- Xác nhận target commit và điều kiện release
- Tạo tag khi được duyệt, ghi artifact/rollback target

**Không bao gồm:** force-push lịch sử hoặc tag lại release đang dùng mà chưa được phép.

### 3. Contract và đầu ra

| Thành phần | Chi tiết cần bàn giao |
| --- | --- |
| Đầu vào / nguồn tin cậy | PR/checks, commit SHA, nghiệm thu, release notes và approval của owner. |
| Đầu ra / contract | Final review record, release tag/version và artifact mapping theo chính sách repo. |
| Điểm giao tiếp / deliverable đã cam kết | Release |

### 4. Tiêu chí hoàn thành

- Final review record, release tag/version và artifact mapping theo chính sách repo.
- Check bắt buộc chưa đạt: Không bypass để release
- Tag target khác bản test: Không coi evidence còn hợp lệ
- Known issue: Ghi trong release notes
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Chốt version/tag naming và ai phê duyệt; không tự merge/tag/deploy chỉ vì task detail được viết.
