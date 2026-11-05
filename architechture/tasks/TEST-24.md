# [TEST-24] Secret masking: App Password absent from logs/API

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Mai Sơn Việt |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 05/11/2026 08:00 → 05/11/2026 23:59 |
| SP / giờ công dự kiến | 3 SP / 3 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

App Password và credential sender không lọt vào Git, API, log hoặc artifact kiểm thử.

## 2. Phạm vi

### Bao gồm

- Security regression findings có vị trí/redaction và không lưu bản secret trong báo cáo.
- App Password không xuất hiện trong response/log/Git; evidence mask giá trị bí mật.

### Không bao gồm

Không tuyên bố security toàn hệ hoặc quét credential tài khoản ngoài scope.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Notification có SafeLog/config placeholders; phải rà cả API/email-log/DLQ/exception/artifact, không chỉ grep một biến trong source. Không đọc credential ngoài workspace/task được phép hoặc dán phát hiện secret thật vào report.

- [backend/notification-service](../../backend/notification-service)
- [.env.mail-sender.example](../../.env.mail-sender.example)
- [architechture/tasks/BE-57.md](../../architechture/tasks/BE-57.md)
- [architechture/tasks/BE-67.md](../../architechture/tasks/BE-67.md)
- [architechture/docs/observability.md](../../architechture/docs/observability.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | BE-57/67, secret inventory tên biến và luồng success/failure/config diagnostics. |
| Đầu ra / contract | Security regression findings có vị trí/redaction và không lưu bản secret trong báo cáo. |
| Điểm giao tiếp / deliverable đã cam kết | Security test |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Inventory chỉ tên biến/nguồn config/sink, dùng marker synthetic không phải secret thật. Coverage tracked files, example config, response/log/diagnostics/DLQ và evidence; findings ghi file/field/path/redacted context, không sao chép giá trị bí mật.

## 4. Thứ tự thực hiện cụ thể

1. Nhận secret inventory tên biến từ owner và phạm vi scan repository/runtime artifacts, không tự quét tài khoản/máy ngoài scope.
2. Lập checklist tracked files/env examples chỉ placeholder; nếu phát hiện thật báo owner riêng để rotate/revoke, không in toàn dòng secret.
3. Thiết kế synthetic marker trong cấu hình test để kích hoạt exception/sender lỗi có kiểm soát khi người dùng chạy.
4. Theo marker qua response, logs, email-log detail, diagnostic/config endpoint và DLQ headers/body; backend phải redact trước lưu/xuất, không chỉ UI che.
5. Rà screenshot/collection/report sau che và metadata/attachments có thể lộ; lưu evidence không chứa marker giá trị nhạy cảm thực.
6. Bàn giao coverage/negative evidence/findings/PIC/retest; không tuyên bố security toàn hệ thống từ bài kiểm App Password.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Dùng marker test hoặc secret-scanner an toàn; phát hiện secret thật phải xử lý/rotate theo owner, không dán vào task.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC security/Notification chốt marker và cách scan không echo secret; nếu cần lịch sử Git ghi phạm vi được duyệt. Secret thật phải rotate theo owner, xóa khỏi report không thay revocation.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-57](BE-57.md) | Cao Tất Thành | Typed configuration, validation bật/tắt và .env.example placeholder. | Chốt contract/cấu hình trước khi viết phần phụ thuộc; nghiệm thu bằng bản upstream đã bàn giao. |
| [BE-67](BE-67.md) | Mai Sơn Việt | Durable failure publication/DLQ và masked logging cho email delivery. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** Chưa có task khai báo phụ thuộc trong snapshot.

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Marker test đi qua sender failure và API/log/DLQ theo checklist | Không xuất marker/credential trong sink, vẫn đủ error category/correlation để debug |
| AC-02 | Exception chứa credential | Không xuất giá trị qua response/log |
| AC-03 | .env.example | Chỉ placeholder |
| AC-04 | Evidence screenshot/file | Không chứa secret sau che |
| AC-05 | Tracked .env.example/config và collection/evidence artifacts | Chỉ placeholder/redacted, không private key/token/password thật |
| AC-06 | Phát hiện secret thật trong phạm vi được phép | Ghi vị trí đã mask, thông báo owner xử lý/rotate; không chép secret vào backlog hoặc screenshot |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: File/response/log locations, masked findings và retest outcome.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao sink coverage và findings redacted với severity/owner/retest; không chạy scanner/runtime fault trong lần biên soạn.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [backend/notification-service](../../backend/notification-service)
- [.env.mail-sender.example](../../.env.mail-sender.example)
- [architechture/tasks/BE-57.md](../../architechture/tasks/BE-57.md)
- [architechture/tasks/BE-67.md](../../architechture/tasks/BE-67.md)
- [architechture/docs/observability.md](../../architechture/docs/observability.md)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Mai Sơn Việt
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 05/11/2026 08:00
**Deadline:** 05/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4610 / reczz28Rqn97VwpU
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rqn97VwpU
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 3 SP
**Time Estimated:** 3 giờ công
**Remaining Estimate:** 3 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Tính chuẩn bị dữ liệu, chạy kịch bản nghiệm thu độc lập và ghi evidence/retest; sửa lỗi implementation thuộc task domain, không cộng hai lần.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../docs/backlog.md#quy-ước-ước-lượng).

Lịch cũ (30/10): 07/11/2026 08:00 → 07/11/2026 23:59. Lịch mới: 05/11/2026 08:00 → 05/11/2026 23:59. Giữ khung Sprint 2 02–08/11 để truy vết; hạn hoàn thành thực tế 05/11, Sprint Review 06/11, không xếp việc triển khai/nghiệm thu vào 06–08/11.

Bắt đầu có thể là chuẩn bị fixture/UI theo contract; phần cần API/event thật bị chặn cho đến khi dependency bàn giao. Nếu cùng ngày đến hạn, phải bàn giao prerequisite trước khi nghiệm thu task này; không coi deadline trùng ngày là bằng chứng đã sẵn sàng.

</details>

## Quy ước kiểm chứng

Việc cập nhật detail không chạy test, lint, typecheck, build, Docker hoặc trình duyệt. Checklist là điều kiện nghiệm thu để người phụ trách thực hiện, không phải báo cáo PASS. Giữ trạng thái snapshot, kể cả DONE; chưa xác nhận lại trên Lark.
