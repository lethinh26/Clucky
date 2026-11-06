# [TEST-07] RBAC: Staff A không gọi được dữ liệu quán B

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Trần Nguyễn Hữu Khánh |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 05/11/2026 08:00 → 05/11/2026 23:59 |
| SP / giờ công dự kiến | 5 SP / 4 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Truy cập chéo quán bị chặn tại API dù sửa URL, query, body hoặc bỏ qua UI.

## 2. Phạm vi

### Bao gồm

- Regression RBAC có allowed/denied cases và chứng cứ không đổi dữ liệu.
- Staff A không xem/sửa được dữ liệu quán B, kể cả đổi URL/body storeId.

### Không bao gồm

Không xem hidden menu/route guard là bằng chứng backend chặn.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

INT-67 sở hữu coverage RBAC từng API; TEST-07 là regression cross-store có readback. React mock role hoặc menu ẩn không phải fixture auth đáng tin; token phải do Identity cấp theo tài khoản test.

- [architechture/tasks/INT-67.md](../../architechture/tasks/INT-67.md)
- [architechture/tasks/INT-53.md](../../architechture/tasks/INT-53.md)
- [backend/api-gateway](../../backend/api-gateway)
- [architechture/docs/Ma trận phân quyền.md](../../architechture/docs/Ma%20trận%20phân%20quyền.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | Staff A/B, token hợp lệ/hết hạn, endpoint matrix INT-67 và dữ liệu quán A/B. |
| Đầu ra / contract | Regression RBAC có allowed/denied cases và chứng cứ không đổi dữ liệu. |
| Điểm giao tiếp / deliverable đã cam kết | Security test |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Fixture hai quán A/B, Staff A/B và baseline resource; mỗi endpoint có allow/deny cases, expected 401/403/404 theo policy và expected data unchanged. List/detail/export/mutation đều cần coverage, không chỉ route GET chính.

## 4. Thứ tự thực hiện cụ thể

1. Nhận endpoint matrix INT-67 và đánh dấu API chưa sẵn sàng; ghi commit/config/auth setup, không chạy kiểm thử trong lượt biên soạn.
2. Chuẩn bị tài khoản/resource riêng A/B có IDs đối chiếu, snapshot readback được phép và token giữ ngoài artifacts.
3. Soạn allow request Staff A với resource A để chứng minh không block-all, sau đó đổi path/query/body/header sang B nhưng giữ token A.
4. Với read, kiểm body/count/file không lộ B; với write, đọc lại trạng thái B bằng actor được phép để xác nhận không có mutation.
5. Thêm missing/expired/revoked token và payload giả role/store; ghi denial shape không tiết lộ dữ liệu ngoài policy.
6. Bàn giao bug theo endpoint/severity/PIC, retest cùng exploit và allow case; evidence chỉ chứa IDs synthetic, không token thật.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt toàn bộ endpoint được đưa vào coverage và trạng thái 403/404 theo policy; không chỉ kiểm tra HTTP status.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC security/domain chốt endpoint inventory và 403-vs-404. Backend chưa có handler là BLOCKED, không tính như đã chặn an toàn vì 404 route không tồn tại.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [INT-67](INT-67.md) | Trần Nguyễn Hữu Khánh | RBAC integration matrix với request hợp lệ/bypass và bug được giao domain owner. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [DEP-10](DEP-10.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Staff A gọi đúng resource A rồi đổi sang B trên endpoint đã triển khai | A hoạt động đúng, B không đọc/ghi; có baseline/readback chứng minh |
| AC-02 | Staff A đọc/sửa B | Không lộ/ghi dữ liệu |
| AC-03 | Request A hợp lệ | Vẫn dùng được, không block-all giả security |
| AC-04 | Token invalid | 401 theo contract, không business side effect |
| AC-05 | List/export/detail bị sửa filter/ID hoặc fake X-Role/store header | Không rò B qua body/file/count và không nâng quyền |
| AC-06 | Token invalid hoặc mutation trái scope trả lỗi | 401/deny theo contract và data unchanged, không chỉ assert status code |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Endpoint×actor×scope table, sanitized requests, before/after và bug/retest IDs.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao regression matrix liên kết INT-67, evidence baseline/after và retest record; task này chỉ viết test plan, chưa thực thi.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [architechture/tasks/INT-67.md](../../architechture/tasks/INT-67.md)
- [architechture/tasks/INT-53.md](../../architechture/tasks/INT-53.md)
- [backend/api-gateway](../../backend/api-gateway)
- [architechture/docs/Ma trận phân quyền.md](../../architechture/docs/Ma%20trận%20phân%20quyền.md)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Trần Nguyễn Hữu Khánh
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 05/11/2026 08:00
**Deadline:** 05/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4550 / reczz28Rid5XhE0A
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5XhE0A
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 5 SP
**Time Estimated:** 4 giờ công
**Remaining Estimate:** 4 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
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
