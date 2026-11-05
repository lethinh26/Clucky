# [INT-07] Cart → checkout → tạo đơn E2E

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Trần Đức Anh |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 03/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công dự kiến | 8 SP / 10 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Giỏ Redis và checkout tạo Order/Payment thật theo tổng backend, không dùng local mock để báo đặt thành công.

## 2. Phạm vi

### Bao gồm

- Cart→preview→submit→order detail qua Gateway với trạng thái nhất quán.
- Bàn giao theo phạm vi gốc: Order flow works.

### Không bao gồm

Không SePay tiền thật INT-09 hoặc shipper Phase 2.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

OrderProvider hiện chứa schema/local workspace, MOCK_ORDERS và demo actions; product detail add payload thiên về tên/giá. Phải kiểm kê phần local/demo trước khi tuyên bố checkout dùng backend; không chỉ thay nút Submit.

- [frontend/nextjs/components/order/order-provider.tsx](../../frontend/nextjs/components/order/order-provider.tsx)
- [frontend/nextjs/app/checkout/page.tsx](../../frontend/nextjs/app/checkout/page.tsx)
- [frontend/nextjs/lib/cart.ts](../../frontend/nextjs/lib/cart.ts)
- [architechture/tasks/BE-24.md](../../architechture/tasks/BE-24.md)
- [architechture/tasks/BE-25.md](../../architechture/tasks/BE-25.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | Cart BE-23, preview BE-24, create BE-25, auth Gateway và UI Cart/Checkout. |
| Đầu ra / contract | Cart→preview→submit→order detail qua Gateway với trạng thái nhất quán. |
| Điểm giao tiếp / deliverable đã cam kết | Order flow works |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Mapping product/option/topping IDs, quantity, storeId, delivery/pickup, voucher/points → preview breakdown → create-order. Server chốt giá/availability; idempotency key và reconcile dùng hợp đồng Order, không tự thêm header mà server chưa hỗ trợ.

## 4. Thứ tự thực hiện cụ thể

1. Đọc Cart/Preview/Create contract và liệt kê local state nào chỉ là cache UI, state nào phải lấy server; chốt guest merge trước khi nối.
2. Chuẩn bị cart một quán có option/topping và địa chỉ hợp lệ; mapping ID thật, không gửi tên hay client total làm giá chuẩn.
3. Nối thao tác cart theo owner/session, phân biệt pending/error; không ghi đè cart user khác khi login/logout.
4. Nối preview mỗi khi input ảnh hưởng giá thay đổi; bỏ response stale, hiển thị breakdown và lỗi hết hàng/giá đổi.
5. Submit bằng key theo contract, khóa double-click; timeout chưa rõ kết quả phải reconcile trước retry, chỉ clear cart/chuyển trang khi xác nhận order đã tạo.
6. Giao kịch bản mất response sau commit, hai tab submit và lỗi upstream; kiểm chứng cả số order/payment tạo ra, không chỉ toast UI.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt retry key, merge guest cart và cơ chế reconcile khi server thành công nhưng client mất response.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Order/UI chốt guest merge, idempotency/reconcile và vòng đời preview. Nếu BE chưa hỗ trợ retry an toàn, phần submit timeout bị blocked; không tự retry POST tạo đơn vô hạn.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-25](BE-25.md) | Trần Đức Anh | POST orders, orderCode, snapshot items, trạng thái ban đầu, payment info và version/state transition hợp lệ. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-24](BE-24.md) | Trần Đức Anh | POST orders/preview với subtotal/discount/points/shipping/total và lỗi nghiệp vụ từ domain liên quan. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [INT-53](INT-53.md) | Trần Nguyễn Hữu Khánh | Security integration login→Gateway→service, auth/authorization error contract nhất quán. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [DEP-09](DEP-09.md), [TEST-01](TEST-01.md), [TEST-14](TEST-14.md), [TEST-23](TEST-23.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Cart hợp lệ → preview thật → tạo order → reload detail | Breakdown và order ID từ server; cart chỉ được xử lý sau success xác nhận |
| AC-02 | Submit timeout/retry | Không tạo đơn/payment trùng |
| AC-03 | Món hết/giá đổi | UI giải thích, không đặt theo snapshot stale |
| AC-04 | API thất bại | Giữ form/cart cần thiết, không success giả |
| AC-05 | Server commit nhưng client mất response rồi thử lại theo cùng key | Reconcile về cùng order, không tạo thêm payment/order; trạng thái chưa rõ không bị báo thất bại chắc chắn |
| AC-06 | Giá/availability đổi sau preview hoặc create trả lỗi | UI yêu cầu refresh/xác nhận lại theo contract, giữ dữ liệu cần thiết, không đặt bằng snapshot cũ |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Cart/order/payment IDs, request sequence và readback sau reload/lỗi.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao mapping ID, timeline preview/create/reconcile và số bản ghi Order/Payment quan sát được; đánh dấu rõ local/demo đã bị loại khỏi đường nghiệm thu.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [frontend/nextjs/components/order/order-provider.tsx](../../frontend/nextjs/components/order/order-provider.tsx)
- [frontend/nextjs/app/checkout/page.tsx](../../frontend/nextjs/app/checkout/page.tsx)
- [frontend/nextjs/lib/cart.ts](../../frontend/nextjs/lib/cart.ts)
- [architechture/tasks/BE-24.md](../../architechture/tasks/BE-24.md)
- [architechture/tasks/BE-25.md](../../architechture/tasks/BE-25.md)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Trần Đức Anh
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 03/11/2026 08:00
**Deadline:** 04/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4527 / reczz28Rid5XlFdj
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5XlFdj
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 8 SP
**Time Estimated:** 10 giờ công
**Remaining Estimate:** 10 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
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
