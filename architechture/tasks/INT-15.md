# [INT-15] Admin catalog/store/inventory E2E

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Nguyễn Duy Quang Nhật |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 03/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công dự kiến | 5 SP / 8 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Admin Catalog/Stores và Staff Inventory CRUD thật, đọc lại được thay đổi trên menu đúng quán.

## 2. Phạm vi

### Bao gồm

- CRUD/store operation/inventory integration với validation và scope.
- Bàn giao theo phạm vi gốc: Catalog admin works.

### Không bao gồm

Không proposal/banner hoặc seed trực tiếp DB thay request nghiệp vụ.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

React Catalog/Stores và inventoryApi đã tồn tại, Catalog có controller/service thật. Rà call site và DTO trước; task này nối quản trị, không dựng CRUD mới hoặc gộp upload media INT-73.

- [frontend/react/src/pages/Catalog](../../frontend/react/src/pages/Catalog)
- [frontend/react/src/pages/Stores](../../frontend/react/src/pages/Stores)
- [frontend/react/src/pages/Staff/Inventory](../../frontend/react/src/pages/Staff/Inventory)
- [frontend/react/src/lib/api.ts](../../frontend/react/src/lib/api.ts)
- [backend/catalog-store-service](../../backend/catalog-store-service)
- [architechture/tasks/BE-54.md](../../architechture/tasks/BE-54.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | BE-21/22, public BE-20, UI forms/table và Gateway/auth. |
| Đầu ra / contract | CRUD/store operation/inventory integration với validation và scope. |
| Điểm giao tiếp / deliverable đã cam kết | Catalog admin works |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Form fields → Catalog DTO, ID option/topping đã lưu phải giữ identity, validation/error/conflict → form state. Availability/inventory scoped store khác với giá catalog toàn hệ thống; invalidation theo BE-54.

## 4. Thứ tự thực hiện cụ thể

1. Đọc form/controller và mapping create/update/delete thực; ghi endpoint thiếu, không seed DB thay request nghiệp vụ để chứng minh UI save.
2. Chuẩn bị Admin, Manager/Staff A và quán B, product/combo có option/topping đang được tham chiếu.
3. Nối CRUD theo quyền, giữ ID và semantics omitted vs [] khi cập nhật collection; lỗi giữ input và chỉ đóng form sau success.
4. Nối inventory/availability theo store từ actor và request hợp lệ; không cho Staff sửa giá gốc qua body thủ công.
5. Sau mutation đọc lại admin/public qua Gateway và cơ chế invalidation được duyệt; không cập nhật mọi store từ một local toggle.
6. Bàn giao save fail/conflict/xóa dữ liệu đang tham chiếu/cross-store và reload; media giữ contract bàn giao INT-73, không upload trực tiếp từ component khác.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt DTO form và cache freshness với BE-54; media tích hợp riêng INT-73.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Catalog/UI chốt collection update semantics, conflict UX và freshness. Nếu backend chưa hỗ trợ field form, không gửi field bị bỏ qua rồi báo lưu đủ.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-21](BE-21.md) | Nguyễn Duy Quang Nhật | API CRUD catalog/store, validation tham chiếu nội bộ và DTO đọc lại sau lưu. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-22](BE-22.md) | Nguyễn Duy Quang Nhật | API availability/inventory; dữ liệu tồn và trạng thái bán cho menu. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [TEST-06](TEST-06.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Admin lưu product/option rồi Staff A đổi availability và reload menu A/B | Metadata đúng sau reload; chỉ A đổi availability, B giữ nguyên |
| AC-02 | Save API lỗi | Form giữ dữ liệu, không giả lưu |
| AC-03 | Staff sửa giá gốc | Backend từ chối |
| AC-04 | Availability quán A | Không đổi quán B |
| AC-05 | Save lỗi hoặc xóa option đang được combo tham chiếu | Form không mất dữ liệu, conflict rõ, không success giả |
| AC-06 | STAFF gửi payload sửa giá gốc hoặc inventory B | Backend từ chối, dữ liệu không đổi dù control UI bị bypass |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Create/edit/readback theo hai quán và validation/error evidence.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao field mapping, mutation/readback/cache traces, role-store matrix và lỗi media chuyển INT-73 riêng.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [frontend/react/src/pages/Catalog](../../frontend/react/src/pages/Catalog)
- [frontend/react/src/pages/Stores](../../frontend/react/src/pages/Stores)
- [frontend/react/src/pages/Staff/Inventory](../../frontend/react/src/pages/Staff/Inventory)
- [frontend/react/src/lib/api.ts](../../frontend/react/src/lib/api.ts)
- [backend/catalog-store-service](../../backend/catalog-store-service)
- [architechture/tasks/BE-54.md](../../architechture/tasks/BE-54.md)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Nguyễn Duy Quang Nhật
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 03/11/2026 08:00
**Deadline:** 04/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4598 / reczz28Rqn97UvhS
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rqn97UvhS
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 5 SP
**Time Estimated:** 8 giờ công
**Remaining Estimate:** 8 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Tính phần nối contract, xử lý lỗi liên service/UI, fixture và evidence tích hợp; không triển khai lại API đã tính ở BE hoặc chạy lại bộ regression TEST.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../docs/backlog.md#quy-ước-ước-lượng).

Lịch cũ (30/10): 04/11/2026 08:00 → 06/11/2026 23:59. Lịch mới: 03/11/2026 08:00 → 04/11/2026 23:59. Giữ khung Sprint 2 02–08/11 để truy vết; hạn hoàn thành thực tế 05/11, Sprint Review 06/11, không xếp việc triển khai/nghiệm thu vào 06–08/11.

Bắt đầu có thể là chuẩn bị fixture/UI theo contract; phần cần API/event thật bị chặn cho đến khi dependency bàn giao. Nếu cùng ngày đến hạn, phải bàn giao prerequisite trước khi nghiệm thu task này; không coi deadline trùng ngày là bằng chứng đã sẵn sàng.

</details>

## Quy ước kiểm chứng

Việc cập nhật detail không chạy test, lint, typecheck, build, Docker hoặc trình duyệt. Checklist là điều kiện nghiệm thu để người phụ trách thực hiện, không phải báo cáo PASS. Giữ trạng thái snapshot, kể cả DONE; chưa xác nhận lại trên Lark.
