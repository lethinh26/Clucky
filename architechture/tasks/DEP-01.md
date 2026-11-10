## DEP-01 — Chuẩn bị VPS với Docker, Compose và cấu hình cổng mạng, chỉ công khai dịch vụ cần thiết để triển khai hệ thống

**Phụ trách:** Mai Sơn Việt · **Sprint:** BACKLOG — chưa gán sprint · **Ước lượng:** 3 SP
**Phụ thuộc:** UI-06

### 1. User Story

- **Là người vận hành**, tôi muốn chuẩn bị VPS với Docker, Compose và cấu hình cổng mạng, chỉ công khai dịch vụ cần thiết để triển khai hệ thống.

### 2. Công việc

- Kiểm kê OS/resource và quyền thao tác
- Cài/cấu hình runtime theo môi trường được duyệt
- Kiểm tra kết nối cần thiết, giữ SSH và nội bộ an toàn

**Không bao gồm:** triển khai business hay mua VPS/domain thay người dùng.

### 3. Contract và đầu ra

| Thành phần | Chi tiết cần bàn giao |
| --- | --- |
| Đầu vào / nguồn tin cậy | VPS được chủ sở hữu cấp, tài khoản vận hành, danh sách port/service và dung lượng cần dùng. |
| Đầu ra / contract | Host preparation/runbook, Docker/Compose hoạt động và firewall theo đường truy cập được duyệt. |
| Điểm giao tiếp / deliverable đã cam kết | VPS ready |

### 4. Tiêu chí hoàn thành

- Host preparation/runbook, Docker/Compose hoạt động và firewall theo đường truy cập được duyệt.
- Port public: Chỉ những cổng cần thiết được mở
- Thiếu disk/memory: Báo điều kiện chưa đạt, không deploy ép
- Firewall thay đổi: Không tự khóa đường quản trị
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Chốt IP/domain/SSH/recovery với owner trước thao tác; không tự mở Postgres/Redis/Kafka ra Internet.
