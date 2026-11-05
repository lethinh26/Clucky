# [TEST-05] E2E Manager: create staff→assign→reports

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Mai Sơn Việt |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 05/11/2026 08:00 → 05/11/2026 23:59 |
| SP / giờ công dự kiến | 3 SP / 4 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Chứng minh Manager tạo Staff/xếp ca và xem báo cáo trong quán mình, không xem quán khác.

## 2. Phạm vi

### Bao gồm

- E2E case/report cho quản trị nhân sự và report theo scope.
- Manager tạo Staff/gán ca và xem report đúng quán; thử truy cập quán khác.

### Không bao gồm

Không nâng quyền Manager để làm demo pass hoặc dùng tài khoản Admin cho toàn bộ test.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Tên task lịch sử ghi assign, nhưng API chỉ cho Admin assign-store; Manager được tạo Staff quán mình và xếp ca theo RBAC. Test cần kiểm phân biệt này, không biến hành động bị cấm thành happy path.

- [architechture/tasks/INT-61.md](../../architechture/tasks/INT-61.md)
- [architechture/tasks/INT-13.md](../../architechture/tasks/INT-13.md)
- [architechture/tasks/BE-19.md](../../architechture/tasks/BE-19.md)
- [frontend/react/src/pages/Users/index.tsx](../../frontend/react/src/pages/Users/index.tsx)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | Manager A/B, staff/store fixtures, INT-61/13 và dataset báo cáo biết trước. |
| Đầu ra / contract | E2E case/report cho quản trị nhân sự và report theo scope. |
| Điểm giao tiếp / deliverable đã cam kết | Manager verified |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Manager A token/store, Staff mới tại A, schedule contract và report/export A cùng kỳ. Assign trong flow hợp lệ là xếp ca theo contract, assign-store là negative case Admin-only; list scoped Manager cần endpoint đã bàn giao.

## 4. Thứ tự thực hiện cụ thể

1. Chốt interpretation assign với owner và readiness users/schedules/reports; ghi gap scope nếu endpoint chưa có, không mở rộng quyền để test.
2. Chuẩn bị hai quán và Manager A, Staff fixture, report expected data cùng kỳ; không dùng default mock ADMIN.
3. Mô tả tạo Staff A qua UI/API, reload user và đối chiếu role/store persisted.
4. Mô tả xếp ca theo quyền rồi đọc lại lịch, đồng thời gọi assign-store bằng Manager để kiểm deny.
5. Mở report/export A và sửa query sang B/all; đối chiếu dữ liệu/file không rò ngoài scope.
6. Lập run sheet errors/save failure/duplicate account và cleanup tài khoản/ca chỉ của run; chốt bug/PIC/retest sau khi người dùng chạy.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Tên task cũ ghi assign; phải phân biệt xếp ca với assign-store theo API/RBAC, ghi mâu thuẫn nếu cần duyệt scope.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Manager flow/Identity/Report chốt Manager list và schedule endpoints, metric/range. Không tự sửa title/metadata để che mâu thuẫn assign-store.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [INT-61](INT-61.md) | Trần Nguyễn Hữu Khánh | Users admin CRUD actions nối backend, validation/error/refetch và scope đúng. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-13](INT-13.md) | Mai Sơn Việt | Filter/date/export xlsx/pdf hoạt động qua Gateway theo role. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [DEP-10](DEP-10.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Manager tạo Staff, xếp ca hợp lệ rồi xem report quán mình | User/ca/report đúng server và role, không dựa mock session |
| AC-02 | Luồng quán mình | Staff/ca/report khớp DB và role |
| AC-03 | Manager gọi assign-store Admin-only | Bị chặn, không coi đây là bước happy path |
| AC-04 | Manager đọc report B | Không lộ số liệu |
| AC-05 | Manager gọi assign-store hoặc xếp ca/quản lý Staff B | Bị chặn, không đổi dữ liệu ngoài quyền |
| AC-06 | Manager export B/all hoặc save Staff lỗi | Không lộ report, UI không success giả; evidence gồm file/readback không chỉ status |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Actor/token role đã mask, staff/schedule IDs, report expected totals và deny cases.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao actor/action matrix, flow evidence và quyết định assign-vs-schedule; các case chưa chạy giữ NOT RUN.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [architechture/tasks/INT-61.md](../../architechture/tasks/INT-61.md)
- [architechture/tasks/INT-13.md](../../architechture/tasks/INT-13.md)
- [architechture/tasks/BE-19.md](../../architechture/tasks/BE-19.md)
- [frontend/react/src/pages/Users/index.tsx](../../frontend/react/src/pages/Users/index.tsx)
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
**Mã Lark:** Mail-4548 / reczz28Rid5XkZyZ
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5XkZyZ
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 3 SP
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
