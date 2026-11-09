# [DEP-12] Bàn giao cấu hình môi trường, quyền truy cập và quy trình rollback cho người vận hành qua kênh an toàn, không lộ secret

> **Đã đồng bộ Lark 08/11/2026.** Title, scope, AC/DoD và SP kế hoạch đã cập nhật; giữ PIC/trạng thái/sprint/lịch thực tế trên Lark. Các ghi chú “chưa đồng bộ” và tiến độ bên dưới là snapshot lịch sử. [Kết quả đồng bộ và chênh lệch sprint](../docs/Lark_Backlog_Sync_2026-11-08.md).

## Phân loại hiện hành — 07/11/2026

| Thuộc tính | Giá trị hiện hành |
|---|---|
| Mã | DEP-12 |
| Loại | TASK — task chính, không có parent/subtask |
| Nhóm | DEP |
| Mã gốc | DEP-12 |
| Dependency triển khai | [DEP-11](DEP-11.md) |
| Nhận thêm phạm vi/AC/DoD | Không có gói gộp mới |
| Ước lượng | Giữ snapshot, chưa xác nhận remaining thực tế |

Áp dụng [phân loại 07/11](../docs/Backlog_Reclassification_2026-11-07.md). Metadata/lịch/nhãn cũ bên dưới là lịch sử, bị thay thế khi khác bảng hiện hành. AC/DoD nhận thêm ở cuối file thuộc TASK này, không phải subtask. Chưa đồng bộ Lark, chưa xác nhận nghiệm thu mới.


> Detail biên soạn lại ngày 02/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới là lịch sử, không phải xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Mai Sơn Việt |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | BACKLOG — chưa gán sprint |
| Bắt đầu → deadline (UTC+7) | Chưa xếp lịch → Chưa xếp lịch |
| SP / giờ công dự kiến | 5 SP / 6 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Người nhận vận hành có đủ config, quyền truy cập và quy trình rollback mà không truyền secret trong tài liệu công khai.

## 2. Phạm vi

### Bao gồm

- Handover runbook, secure credential transfer checklist và rollback procedure đã đối chiếu.
- Bàn giao theo phạm vi gốc: Handover doc.

### Không bao gồm

Không commit .env thật hoặc restore production không được phép.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | Deployment topology, secret store/access owner, env keys, backup và previous release. |
| Đầu ra / contract | Handover runbook, secure credential transfer checklist và rollback procedure đã đối chiếu. |
| Điểm giao tiếp / deliverable đã cam kết | Handover doc |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

## 4. Luồng xử lý / cách thực hiện

1. Liệt kê quyền/config cần bàn giao
2. Truyền credential qua kênh được duyệt, tài liệu chỉ tên biến
3. Diễn tập rollback ở môi trường được phép và ghi caveat migration

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt kênh secret và recovery owner; schema rollback cần kế hoạch riêng nếu không backward-compatible.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

## 6. Dependency và bàn giao

> Bảng handoff bên dưới giữ tham chiếu trước gộp. Dependency triển khai hiện hành là bảng đầu file; ID INT/TEST cũ chỉ là truy vết qua trang chuyển hướng, không phải task phải giao lại.

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [DEP-11](DEP-11.md) | Mai Sơn Việt | Final review record, release tag/version và artifact mapping theo chính sách repo. | Trước chạy trong môi trường đích; cần cấu hình và quyền truy cập được cấp. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** Chưa có task khai báo phụ thuộc trong snapshot.

## 7. Tiêu chí nghiệm thu

| AC | Điều kiện / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Đủ đầu vào hợp lệ và contract đã được xác nhận | Handover runbook, secure credential transfer checklist và rollback procedure đã đối chiếu. |
| AC-02 | Thiếu quyền người nhận | Ghi blocker, không công khai credential để khắc phục |
| AC-03 | Rollback app với schema mới | Kiểm tra tương thích, không tự down migration phá data |
| AC-04 | Người nhận xác nhận | Có checklist tiếp nhận rõ |

Các AC chưa có kết quả trong lần biên soạn này. Với task UI, fixture chỉ nghiệm thu giao diện; E2E thật thuộc task INT/TEST tương ứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] AC-01: Đủ đầu vào hợp lệ và contract đã được xác nhận — ghi kết quả và evidence.
- [ ] AC-02: Thiếu quyền người nhận — ghi kết quả và evidence.
- [ ] AC-03: Rollback app với schema mới — ghi kết quả và evidence.
- [ ] AC-04: Người nhận xác nhận — ghi kết quả và evidence.
- [ ] Bàn giao bằng chứng cụ thể: Handover sign-off, env inventory và rollback rehearsal/report đã mask.
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

**PIC:** Mai Sơn Việt
**Trạng thái trên Lark:** TO DO
**Sprint:** BACKLOG — chưa gán sprint
**Khoảng sprint:** Chưa cam kết
**Bắt đầu:** Chưa xếp lịch
**Deadline:** Chưa xếp lịch
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại (snapshot trước phân loại):** Sub Task
**Mã Lark:** Mail-4573 / reczz28Rid5XkNbW
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5XkNbW
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 5 SP
**Time Estimated:** 6 giờ công
**Remaining Estimate:** 6 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Tính cấu hình/tài liệu/vận hành và evidence đúng đầu ra; không tính lại triển khai ứng dụng ở BE/INT.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../docs/backlog.md#quy-ước-ước-lượng).

Chỉ sizing backlog; không cam kết ngày bắt đầu/deadline và không kéo vào phạm vi phải xong 05/11.

</details>

## Quy ước kiểm chứng

Việc cập nhật detail không chạy test, lint, typecheck, build, Docker hoặc trình duyệt. Checklist là điều kiện nghiệm thu để người phụ trách thực hiện, không phải báo cáo PASS. Giữ trạng thái snapshot, kể cả DONE; chưa xác nhận lại trên Lark.

## AC/DoD bắt buộc của TASK chính — 07/11/2026

- [ ] Dev tự kiểm thử từng AC thuộc phần mình triển khai: happy path, validation/boundary, lỗi dependency, quyền/ownership/storeId và retry/concurrency/idempotency khi có; ghi PASS/FAIL/BLOCKED, không đánh PASS vì có code hoặc UI mock.
- [ ] Ghi commit, môi trường, contract, fixture/actor/store, bước tái hiện, expected/actual và evidence đã mask. Dùng lại evidence hợp lệ; không chạy/tính công lặp giữa các task.
- [ ] UI gọi Gateway, đủ loading/empty/error/retry; backend kiểm quyền, DTO/error shape, Config Server/Eureka, schema riêng/migration mới. UI giữ brand, vi/en, responsive, keyboard/focus theo phạm vi.
- [ ] Event có eventId/correlationId, replay không nhân side effect; email lỗi không rollback Order/Payment; không lộ credential/OTP/token hoặc dữ liệu ngoài quyền.
- [ ] AC xuyên service: dev chịu phần mình sở hữu, đầu mối tổng hợp một bộ evidence chung. Thiếu handoff ghi BLOCKED/prerequisite/PIC, không kết luận toàn luồng từ kiểm thử cục bộ.
- [ ] Sửa lỗi trong phạm vi và tự retest tại TASK này; bug có một PIC. Bàn giao contract/evidence cho task phụ thuộc; không lập lại INT/TEST subtask để chuyển trách nhiệm kiểm thử.
- [ ] DONE snapshot là lịch sử, không xác nhận AC mới đã đạt. AC fail/blocked chưa được coi hoàn tất; mục hoãn có nhãn riêng, không tự kéo backlog/Phase 2 vào sprint.

Mục không áp dụng ghi N/A kèm lý do; không bỏ security/AC đã chỉ định. Đây là yêu cầu dev tự kiểm thử, không phải kết quả chạy của lần sửa tài liệu.
