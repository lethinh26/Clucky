## DEP-06 — Xác minh bản triển khai trên VPS bằng luồng đăng nhập, duyệt menu, tạo đơn COD và chuyển khoản trong phạm vi được phép

**Phụ trách:** Mai Sơn Việt · **Sprint:** BACKLOG — chưa gán sprint · **Ước lượng:** 5 SP
**Phụ thuộc:** DEP-04, DEP-05, BE-25, BE-17, BE-20, BE-23, BE-24, BE-32, UI-09, UI-11, UI-17, UI-18, UI-30, BE-29, BE-30, UI-19, UI-44

### 1. User Story

- **Là người vận hành**, tôi muốn xác minh bản triển khai trên VPS bằng luồng đăng nhập, duyệt menu, tạo đơn COD và chuyển khoản trong phạm vi được phép để triển khai và vận hành hệ thống ổn định.

### 2. Công việc

- Kiểm tra phiên bản/domain/health
- Login→menu→checkout COD và payment transfer theo kế hoạch
- Đối chiếu persisted states và dọn test data an toàn

**Không bao gồm:** load/stress VPS hoặc dùng mock webhook để chứng minh tiền thật.

### 3. Contract và đầu ra

| Thành phần | Chi tiết cần bàn giao |
| --- | --- |
| Đầu vào / nguồn tin cậy | Deployment SHA/release ID, test accounts/store/data, SMTP/payment environment được chủ sở hữu chấp thuận. |
| Đầu ra / contract | Production-like smoke report với từng flow expected/actual và rollback blockers. |
| Điểm giao tiếp / deliverable đã cam kết | Smoke pass |

### 4. Tiêu chí hoàn thành

- Production-like smoke report với từng flow expected/actual và rollback blockers.
- API lỗi trong flow: Ghi failed đúng bước, không dùng demo fallback
- Payment chỉ hiện QR: Chưa coi luồng đối soát hoàn tất
- Scope sai role/store: Báo lỗi trước bàn giao
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Cần phê duyệt khoản chuyển thử/recipient trước giao dịch thật; không tự tạo đơn thu tiền trên production.
