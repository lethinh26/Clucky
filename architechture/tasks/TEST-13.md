# [TEST-13] Performance: menu <500ms (Redis cache)

> Detail biên soạn lại ngày 02/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới là lịch sử, không phải xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Nguyễn Duy Quang Nhật |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | BACKLOG — chưa gán sprint |
| Bắt đầu → deadline (UTC+7) | Chưa xếp lịch → Chưa xếp lịch |
| SP / giờ công dự kiến | 8 SP / 12 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Đo menu cache có đạt mục tiêu dưới 500ms trong điều kiện được định nghĩa, không chỉ chọn request nhanh nhất.

## 2. Phạm vi

### Bao gồm

- Báo cáo cold/warm cache latency, cache correctness và kết luận theo metric đã chốt.
- Bàn giao theo phạm vi gốc: Cache verified.

### Không bao gồm

Backlog; không thêm Redis tuning không đo hoặc dùng mock endpoint.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | BE-54, endpoint menu thực tế, dataset/store/query và môi trường đo. |
| Đầu ra / contract | Báo cáo cold/warm cache latency, cache correctness và kết luận theo metric đã chốt. |
| Điểm giao tiếp / deliverable đã cam kết | Cache verified |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

## 4. Luồng xử lý / cách thực hiện

1. Ghi máy/network/dataset/concurrency
2. Đo cold rồi warm với query/store đại diện
3. Mutation/invalidate và đo lại không hy sinh dữ liệu đúng

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Cần chốt metric p95/average/max, số mẫu và client-vs-server latency; không tự tuyên bố 500ms là p95.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-54](BE-54.md) | Nguyễn Duy Quang Nhật | Cache read/invalidation và availability contract dùng cho menu/checkout. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** Chưa có task khai báo phụ thuộc trong snapshot.

## 7. Tiêu chí nghiệm thu

| AC | Điều kiện / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Đủ đầu vào hợp lệ và contract đã được xác nhận | Báo cáo cold/warm cache latency, cache correctness và kết luận theo metric đã chốt. |
| AC-02 | Warm cache | So với ngưỡng <500ms theo metric duyệt |
| AC-03 | Đổi store/query | Không trộn cache để nhanh giả |
| AC-04 | Mutation sau warm | Dữ liệu mới xuất hiện đúng policy freshness |

Các AC chưa có kết quả trong lần biên soạn này. Với task UI, fixture chỉ nghiệm thu giao diện; E2E thật thuộc task INT/TEST tương ứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] AC-01: Đủ đầu vào hợp lệ và contract đã được xác nhận — ghi kết quả và evidence.
- [ ] AC-02: Warm cache — ghi kết quả và evidence.
- [ ] AC-03: Đổi store/query — ghi kết quả và evidence.
- [ ] AC-04: Mutation sau warm — ghi kết quả và evidence.
- [ ] Bàn giao bằng chứng cụ thể: Raw timings, summary distributions, dataset/env và invalidation check.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Chưa cam kết trong Sprint 1/2; chưa có Start Date/End Date. Chỉ xếp lịch khi được đưa vào sprint sau.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu nguồn

- [SRS.md](../../architechture/docs/SRS.md)
- [Đặc tả API.md](../../architechture/docs/%C4%90%E1%BA%B7c%20t%E1%BA%A3%20API.md)
- [Kiến trúc hệ thống.md](../../architechture/docs/Ki%E1%BA%BFn%20tr%C3%BAc%20h%E1%BB%87%20th%E1%BB%91ng.md)
- [Ma trận phân quyền.md](../../architechture/docs/Ma%20tr%E1%BA%ADn%20ph%C3%A2n%20quy%E1%BB%81n.md)
- [Thiết kế cơ sở dữ liệu.md](../../architechture/docs/Thi%E1%BA%BFt%20k%E1%BA%BF%20c%C6%A1%20s%E1%BB%9F%20d%E1%BB%AF%20li%E1%BB%87u.md)
- [schema.sql](../../architechture/database/schema.sql)
- [Kế hoạch gốc trong Git (lịch sử)](https://github.com/lethinh26/Clucky/blob/2cc31a09689e718fb49d2d0a80f5813057547c17/architechture/plans/BACKLOG-REPLAN-PROPOSAL-2026-10-29.md)
- [Danh mục lỗi và quy tắc sinh mã](../../contracts/README.md)
- [Danh mục error code](../../contracts/errors.json)
- [Backlog tổng hợp và quy ước ước lượng](../../docs/backlog.md)

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Nguyễn Duy Quang Nhật
**Trạng thái trên Lark:** TO DO
**Sprint:** BACKLOG — chưa gán sprint
**Khoảng sprint:** Chưa cam kết
**Bắt đầu:** Chưa xếp lịch
**Deadline:** Chưa xếp lịch
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4556 / reczz28Rid5XjTFd
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5XjTFd
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 8 SP
**Time Estimated:** 12 giờ công
**Remaining Estimate:** 12 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Tính chuẩn bị dữ liệu, chạy kịch bản nghiệm thu độc lập và ghi evidence/retest; sửa lỗi implementation thuộc task domain, không cộng hai lần.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../docs/backlog.md#quy-ước-ước-lượng).

Chỉ sizing backlog; không cam kết ngày bắt đầu/deadline và không kéo vào phạm vi phải xong 05/11.

</details>

## Quy ước kiểm chứng

Việc cập nhật detail không chạy test, lint, typecheck, build, Docker hoặc trình duyệt. Checklist là điều kiện nghiệm thu để người phụ trách thực hiện, không phải báo cáo PASS. Giữ trạng thái snapshot, kể cả DONE; chưa xác nhận lại trên Lark.
