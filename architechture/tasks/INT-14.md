# [INT-14] Admin orders: status, refund approve E2E

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Trần Đức Anh |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 04/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công dự kiến | 5 SP / 6 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Admin/Staff/Manager xử lý đơn và refund từ UI theo state backend, không optimistic success khi bị từ chối.

## 2. Phạm vi

### Bao gồm

- Status/cancel/refund actions E2E với quyền và concurrency.
- Bàn giao theo phạm vi gốc: Admin order works.

### Không bao gồm

Không tự bỏ RBAC để demo hoặc đổi state trên localStorage thay API.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Admin Orders/StaffOrders pages và demo helpers đã có; cần đối chiếu BE-25/26 cho transition/version và refund quyền. Không lấy reducer browser làm state machine server.

- [frontend/react/src/pages/Orders](../../frontend/react/src/pages/Orders)
- [frontend/react/src/pages/Staff/StaffOrdersPage.tsx](../../frontend/react/src/pages/Staff/StaffOrdersPage.tsx)
- [frontend/react/src/lib/order-demo.ts](../../frontend/react/src/lib/order-demo.ts)
- [architechture/tasks/BE-25.md](../../architechture/tasks/BE-25.md)
- [architechture/tasks/BE-26.md](../../architechture/tasks/BE-26.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | Order BE-25/26, refund BE-46, COD INT-51 và admin order UI. |
| Đầu ra / contract | Status/cancel/refund actions E2E với quyền và concurrency. |
| Điểm giao tiếp / deliverable đã cam kết | Admin order works |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Lập matrix role × store × current state → action/reason/version → next state theo Order contract. Cancel/reject/refund request và approve/refund payment là hành động khác nhau; STAFF không approve refund.

## 4. Thứ tự thực hiện cụ thể

1. Đọc state/action API và DTO version, lập matrix đúng RBAC; action thiếu backend phải disabled/ghi blocked, không chạy demo ngầm.
2. Chuẩn bị đơn A/B ở các state cho phép/cấm và hai tab giữ cùng version.
3. Nối list/detail/action qua Gateway, lấy store scope từ phiên; UI chỉ gợi ý action, backend vẫn xác thực.
4. Nối pending/reason/confirm, không optimistic success khi server chưa xác nhận; reload detail sau mutation.
5. Xử lý conflict version từ hai tab bằng lấy state mới và yêu cầu thao tác lại khi cần; không auto retry transition trên version mới.
6. Bàn giao cross-store, forbidden transition và refund role cases, đối chiếu persisted history/audit nếu có với toast/UI.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt refresh sau conflict và refund boundaries Order/Payment; hoàn tiền thực tế theo docs, không auto-bank-transfer.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Order/RBAC chốt transition, version transport và lỗi conflict; Payment owner chốt phân biệt approve với REFUNDED. Không thêm transition hoặc quyền vì UI đang có nút.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-25](BE-25.md) | Trần Đức Anh | POST orders, orderCode, snapshot items, trạng thái ban đầu, payment info và version/state transition hợp lệ. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-26](BE-26.md) | Trần Đức Anh | Cancel/reject và refund_request PENDING khi cần; history và đầu ra event cho INT-39/47. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-46](BE-46.md) | Lê Phú Thịnh | State machine/refund decision cùng số tiền/role kiểm tra nhất quán. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [INT-51](INT-51.md) | Lê Phú Thịnh | COD lifecycle với Payment COLLECTED và Order progression theo contract. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** Chưa có task khai báo phụ thuộc trong snapshot.

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Nhân sự đúng quán thực hiện action hợp lệ với version hiện hành | Một transition persisted, UI reload đúng; reason/history gắn đúng actor |
| AC-02 | Hai tab cùng thao tác version cũ | Một kết quả conflict được hiển thị |
| AC-03 | Staff approve refund | Bị backend chặn |
| AC-04 | Pending request | UI không gửi action trùng |
| AC-05 | Hai tab gửi action trên version cũ | Một kết quả hợp lệ theo concurrency contract, tab còn lại nhận conflict và không success giả |
| AC-06 | STAFF approve refund hoặc Manager A thao tác order B | Server chặn; không đổi state/tiền, nút UI không thay enforcement |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Action matrix theo role/state, conflict network trace và persisted history.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao action matrix, conflict traces và history trước/sau theo từng role/store; chỉ rõ demo path bị loại khỏi real workflow.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

TEST-04: E2E Staff: login→dashboard→process→COD confirm

Không mở lại các ID đã gộp; phần việc gộp phải được kiểm chứng cùng task đích.

## 10. Tài liệu và source cần đọc

- [frontend/react/src/pages/Orders](../../frontend/react/src/pages/Orders)
- [frontend/react/src/pages/Staff/StaffOrdersPage.tsx](../../frontend/react/src/pages/Staff/StaffOrdersPage.tsx)
- [frontend/react/src/lib/order-demo.ts](../../frontend/react/src/lib/order-demo.ts)
- [architechture/tasks/BE-25.md](../../architechture/tasks/BE-25.md)
- [architechture/tasks/BE-26.md](../../architechture/tasks/BE-26.md)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Trần Đức Anh
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 04/11/2026 08:00
**Deadline:** 04/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4597 / reczz28Rqn97WEk1
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rqn97WEk1
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 5 SP
**Time Estimated:** 6 giờ công
**Remaining Estimate:** 6 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Tính phần nối contract, xử lý lỗi liên service/UI, fixture và evidence tích hợp; không triển khai lại API đã tính ở BE hoặc chạy lại bộ regression TEST.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../docs/backlog.md#quy-ước-ước-lượng).

Lịch cũ (30/10): 06/11/2026 08:00 → 06/11/2026 23:59. Lịch mới: 04/11/2026 08:00 → 04/11/2026 23:59. Giữ khung Sprint 2 02–08/11 để truy vết; hạn hoàn thành thực tế 05/11, Sprint Review 06/11, không xếp việc triển khai/nghiệm thu vào 06–08/11.

Bắt đầu có thể là chuẩn bị fixture/UI theo contract; phần cần API/event thật bị chặn cho đến khi dependency bàn giao. Nếu cùng ngày đến hạn, phải bàn giao prerequisite trước khi nghiệm thu task này; không coi deadline trùng ngày là bằng chứng đã sẵn sàng.

</details>

## Quy ước kiểm chứng

Việc cập nhật detail không chạy test, lint, typecheck, build, Docker hoặc trình duyệt. Checklist là điều kiện nghiệm thu để người phụ trách thực hiện, không phải báo cáo PASS. Giữ trạng thái snapshot, kể cả DONE; chưa xác nhận lại trên Lark.
