# [INT-12] Review: viết/sửa/xóa + reply + hide E2E

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Mai Sơn Việt |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 03/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công dự kiến | 5 SP / 6 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Khách review đơn đủ điều kiện, nhân sự reply/hide và public phản ánh đúng kết quả.

## 2. Phạm vi

### Bao gồm

- Create/edit/delete own + reply/hide qua Gateway, public visibility đúng.
- Bàn giao theo phạm vi gốc: Review works.

### Không bao gồm

Không mock review để nghiệm thu hoặc content moderation ngoài scope.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

ReviewController/ReviewService và OrderVerificationController đã tồn tại. API spec mô tả verification nội bộ chuyển tiếp Bearer JWT/correlation, không dùng X-User-*; nối UI theo contract thật thay vì giả đủ điều kiện review.

- [backend/review-report-service](../../backend/review-report-service)
- [backend/cart-order-service/src/main/java/com/clucky/cartorderservice/controller/OrderVerificationController.java](../../backend/cart-order-service/src/main/java/com/clucky/cartorderservice/controller/OrderVerificationController.java)
- [frontend/react/src/pages/Reviews](../../frontend/react/src/pages/Reviews)
- [architechture/tasks/BE-40.md](../../architechture/tasks/BE-40.md)
- [architechture/tasks/BE-41.md](../../architechture/tasks/BE-41.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | BE-40/41, Order COMPLETED data và review UI. |
| Đầu ra / contract | Create/edit/delete own + reply/hide qua Gateway, public visibility đúng. |
| Điểm giao tiếp / deliverable đã cam kết | Review works |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Review gắn order/product/customer; eligibility là order COMPLETED chứa món. Edit/delete chỉ owner; reply STF/MGR/ADM, hide MGR/ADM theo store. Public read không trả nội dung hidden theo policy đã chốt.

## 4. Thứ tự thực hiện cụ thể

1. Đối chiếu DTO review/my/public và eligibility call nội bộ; xác minh scope chặn ở backend, không dựa route guard.
2. Chuẩn bị order completed của A chứa X, order chưa completed, món Y không trong order và customer B.
3. Nối create/edit/delete với pending/validation/error; duplicate policy dùng contract, không tự ghi đè review cũ.
4. Nối reply/hide trong Admin theo role/store, refresh public và màn quản trị sau mutation; cache không tiếp tục hiện hidden như public hợp lệ.
5. Phối hợp INT-48 cho audit hide nếu thuộc contract, ghi action/target/actor thật thay vì chỉ toast.
6. Bàn giao eligibility fail, cross-owner/cross-store và verify service timeout; dependency lỗi không được biến thành eligible mặc định.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt eligibility Order contract và chính sách review trùng; hide audit cần INT-48 phối hợp.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Review + Order chốt duplicate review, soft-delete/public visibility và timeout verification; audit phối hợp owner INT-48. Không mở endpoint internal ra Gateway để frontend gọi trực tiếp.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-40](BE-40.md) | Mai Sơn Việt | Create/edit/delete own review và public product reviews theo visibility. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-41](BE-41.md) | Mai Sơn Việt | Reply record, visibility thay đổi và audit mutation được bàn giao. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** Chưa có task khai báo phụ thuộc trong snapshot.

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | A review món X của completed order, sửa/xóa; nhân sự đúng quyền reply/hide một review khác | State persisted và public reload đúng; mỗi action đúng actor/store |
| AC-02 | Đơn chưa completed | Bị chặn |
| AC-03 | Customer sửa review khác | Không đổi dữ liệu |
| AC-04 | Review hidden | Public không render sau reload |
| AC-05 | A review món Y không trong order hoặc order chưa completed | Bị từ chối, không tạo bản ghi; UI giải thích theo error code |
| AC-06 | Verification upstream lỗi hoặc B sửa review A | Không fail-open, không sửa dữ liệu và không lộ chi tiết ngoài quyền |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Order/review/reply IDs, role/store cases và public readback.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao matrix actor/order/product/state, trace verification đã mask và public-after-hide evidence; lỗi audit/eligibility có owner riêng.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [backend/review-report-service](../../backend/review-report-service)
- [backend/cart-order-service/src/main/java/com/clucky/cartorderservice/controller/OrderVerificationController.java](../../backend/cart-order-service/src/main/java/com/clucky/cartorderservice/controller/OrderVerificationController.java)
- [frontend/react/src/pages/Reviews](../../frontend/react/src/pages/Reviews)
- [architechture/tasks/BE-40.md](../../architechture/tasks/BE-40.md)
- [architechture/tasks/BE-41.md](../../architechture/tasks/BE-41.md)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Mai Sơn Việt
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 03/11/2026 08:00
**Deadline:** 04/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4595 / reczz28Rqn97WOQN
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rqn97WOQN
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 5 SP
**Time Estimated:** 6 giờ công
**Remaining Estimate:** 6 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
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
