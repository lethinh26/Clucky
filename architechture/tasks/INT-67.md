# [INT-67] RBAC E2E: storeId enforcement từng API

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Trần Nguyễn Hữu Khánh |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 03/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công dự kiến | 8 SP / 12 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Chứng minh quyền Customer owner và Staff/Manager storeId được cưỡng chế ở backend cho các API nghiệp vụ.

## 2. Phạm vi

### Bao gồm

- RBAC integration matrix với request hợp lệ/bypass và bug được giao domain owner.
- Audit quyền Customer owner và Staff/Manager storeId trên API; tài khoản quán A không đọc/sửa quán B.
- PIC Khánh tổng hợp evidence; sửa enforcement trong từng task service.

### Không bao gồm

Không miễn kiểm tra service riêng vì Gateway đã validate JWT.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Gateway/security helpers và React ProtectedRoute đã có, nhưng mock AuthContext/hidden menu không chứng minh RBAC. Dùng API spec/RBAC để kiểm tất cả endpoints trong phạm vi, gồm list/detail/mutation/export và internal boundary.

- [architechture/docs/Ma trận phân quyền.md](../../architechture/docs/Ma%20trận%20phân%20quyền.md)
- [backend/api-gateway](../../backend/api-gateway)
- [frontend/react/src/components/auth/ProtectedRoute.tsx](../../frontend/react/src/components/auth/ProtectedRoute.tsx)
- [architechture/tasks/INT-53.md](../../architechture/tasks/INT-53.md)
- [architechture/tasks/BE-43.md](../../architechture/tasks/BE-43.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | Endpoint inventory, hai customer/hai store, actor roles và INT-53. |
| Đầu ra / contract | RBAC integration matrix với request hợp lệ/bypass và bug được giao domain owner. |
| Điểm giao tiếp / deliverable đã cam kết | 403 test |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Coverage row = method/path + actor role + actor store/owner + resource store/owner + expected visibility/mutation. Chốt 401/403/404 và scope ca; Admin hợp lệ là control case, không đánh secure nếu block mọi người.

## 4. Thứ tự thực hiện cụ thể

1. Lập inventory endpoint từ docs và controller hiện có; đánh dấu chưa triển khai thay vì bỏ khỏi denominator coverage.
2. Chuẩn bị Customer A/B, Staff/Manager hai quán, Admin, invalid/revoked tokens; chỉ fixture được phép và không in token.
3. Soạn calls qua Gateway sửa ID path/query/body/storeId và giả headers, giữ actor token không đổi để chứng minh server enforce.
4. Kiểm list/detail/export không rò dữ liệu và mutation không có side effect bằng readback trước/sau, không chỉ nhìn status code.
5. Đối chiếu special cases: assign-store Admin-only, refund Manager/Admin, audit Manager chỉ Staff cùng quán, media/internal ingress theo contract.
6. Ghi bug theo endpoint/PIC, retest đúng request sau sửa và chạy lại allow case cùng scope khi người dùng cho phép; không sửa toàn bộ policy trong task tài liệu.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt đủ endpoint public/internal/admin và scope ca làm; không chỉ kiểm tra hidden menu.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC security và domain owner chốt coverage, denial shape và ca làm. Endpoint chưa có implementation là BLOCKED, không PASS; không mở quyền để tránh lỗi UI.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [INT-53](INT-53.md) | Trần Nguyễn Hữu Khánh | Security integration login→Gateway→service, auth/authorization error contract nhất quán. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [BE-19](BE-19.md) | Trần Nguyễn Hữu Khánh | Create staff, lock/unlock, assign-store và schedules theo API/RBAC. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-22](BE-22.md) | Nguyễn Duy Quang Nhật | API availability/inventory; dữ liệu tồn và trạng thái bán cho menu. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-27](BE-27.md) | Trần Đức Anh | My/admin list, detail snapshot, reorder qua kiểm tra Catalog mới. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-44](BE-44.md) | Lê Phú Thịnh | GET payments/{orderId} với state/amount/QR/expiry phù hợp quyền và không lộ raw webhook. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [TEST-07](TEST-07.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Actor hợp lệ gọi endpoint trong scope và actor khác scope gọi cùng resource | Allow case hoạt động, deny case không đọc/ghi dữ liệu, evidence đúng method/path |
| AC-02 | Staff A gọi đơn/kho B | Không đọc/ghi được |
| AC-03 | Customer đọc payment/order người khác | Bị chặn |
| AC-04 | Admin/Manager hợp lệ | Không bị chặn nhầm chức năng được cấp |
| AC-05 | Sửa storeId/header/body để truy cập B bằng Staff A hoặc Customer xem payment B | Không nâng quyền, list/export/detail cùng enforcement |
| AC-06 | Token invalid/revoked và endpoint internal được gọi từ browser | Không side effect, lỗi đúng auth boundary; secret/token không bị ghi vào report |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Endpoint×role×owner/store matrix, sanitized requests và before-after data.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao matrix đủ endpoint/expected/actual/evidence/PIC và coverage gaps, không thay bằng ảnh menu ẩn hoặc báo 403 đơn lẻ.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [architechture/docs/Ma trận phân quyền.md](../../architechture/docs/Ma%20trận%20phân%20quyền.md)
- [backend/api-gateway](../../backend/api-gateway)
- [frontend/react/src/components/auth/ProtectedRoute.tsx](../../frontend/react/src/components/auth/ProtectedRoute.tsx)
- [architechture/tasks/INT-53.md](../../architechture/tasks/INT-53.md)
- [architechture/tasks/BE-43.md](../../architechture/tasks/BE-43.md)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Trần Nguyễn Hữu Khánh
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 03/11/2026 08:00
**Deadline:** 04/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4639 / reczz28Rqzs2M6lr
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rqzs2M6lr
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 8 SP
**Time Estimated:** 12 giờ công
**Remaining Estimate:** 12 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Rà ma trận owner/storeId toàn API và evidence; sửa enforcement tính tại task service. TEST-07 là vòng nghiệm thu độc lập.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../docs/backlog.md#quy-ước-ước-lượng).

Lịch cũ (30/10): 05/11/2026 08:00 → 07/11/2026 23:59. Lịch mới: 03/11/2026 08:00 → 04/11/2026 23:59. Giữ khung Sprint 2 02–08/11 để truy vết; hạn hoàn thành thực tế 05/11, Sprint Review 06/11, không xếp việc triển khai/nghiệm thu vào 06–08/11.

Bắt đầu có thể là chuẩn bị fixture/UI theo contract; phần cần API/event thật bị chặn cho đến khi dependency bàn giao. Nếu cùng ngày đến hạn, phải bàn giao prerequisite trước khi nghiệm thu task này; không coi deadline trùng ngày là bằng chứng đã sẵn sàng.

</details>

## Quy ước kiểm chứng

Việc cập nhật detail không chạy test, lint, typecheck, build, Docker hoặc trình duyệt. Checklist là điều kiện nghiệm thu để người phụ trách thực hiện, không phải báo cáo PASS. Giữ trạng thái snapshot, kể cả DONE; chưa xác nhận lại trên Lark.
