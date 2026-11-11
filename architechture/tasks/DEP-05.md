## DEP-05 — Cấu hình và xác minh healthcheck, readiness của từng container cùng dependency, không chỉ kiểm tra tiến trình đang chạy

**Phụ trách:** Mai Sơn Việt · **Sprint:** BACKLOG — chưa gán sprint · **Ước lượng:** 3 SP
**Phụ thuộc:** DEP-02

### 1. User Story

- **Là người vận hành**, tôi muốn cấu hình và xác minh healthcheck, readiness của từng container cùng dependency, không chỉ kiểm tra tiến trình đang chạy để triển khai và vận hành hệ thống ổn định.

### 2. Công việc

- Liệt kê mỗi container và phép kiểm tra phù hợp
- Chạy readiness theo dependency
- Thu log lỗi đã mask và hướng xử lý

**Không bao gồm:** chứng nhận nghiệp vụ từ healthcheck hoặc tắt security health details để dò secret.

### 3. Contract và đầu ra

| Thành phần | Chi tiết cần bàn giao |
| --- | --- |
| Đầu vào / nguồn tin cậy | Deployed service inventory, health URLs và yêu cầu readiness từng loại. |
| Đầu ra / contract | Healthcheck/report cho infra, Config/Eureka/Gateway/business/frontends. |
| Điểm giao tiếp / deliverable đã cam kết | compose ps |

### 4. Tiêu chí hoàn thành

- Healthcheck/report cho infra, Config/Eureka/Gateway/business/frontends.
- Process còn chạy nhưng DB mất: Không báo toàn stack healthy
- Frontend trả trang nhưng API chết: Phân biệt rõ health UI và backend
- Startup chậm: Dùng window theo cấu hình, không bỏ check
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Chốt liveness vs readiness và timeout/grace period theo môi trường thực.
