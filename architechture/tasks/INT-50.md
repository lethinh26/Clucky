# [INT-50] Payment timeout: QR expires → order/payment expired → notify customer

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Lê Phú Thịnh |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 04/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công dự kiến | 8 SP / 8 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

QR hết hạn được xử lý nhất quán giữa Payment, Order, UI và Notification mà không xác nhận nhầm.

## 2. Phạm vi

### Bao gồm

- Payment EXPIRED/Order outcome đúng contract, notification và UI state tương ứng.
- QR hết hạn → payment EXPIRED, Order xử lý đúng contract, phát notification.
- Gộp TEST-10: payment đã EXPIRED không được xác nhận nhầm đơn.

### Không bao gồm

Không tự gia hạn QR hoặc tự hoàn tiền khi nhận chuyển khoản muộn.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Payment UI có timer/demo state; timer không quyết định expiry. Đọc BE-29/44 và Order state trước khi nối scheduler; tên expired giữa tài liệu/model có thể khác, cần chốt thay vì thêm enum UI tùy ý.

- [backend/payment-service](../../backend/payment-service)
- [frontend/nextjs/components/payment](../../frontend/nextjs/components/payment)
- [architechture/tasks/BE-29.md](../../architechture/tasks/BE-29.md)
- [architechture/tasks/BE-44.md](../../architechture/tasks/BE-44.md)
- [architechture/tasks/INT-40.md](../../architechture/tasks/INT-40.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | expiresAt/state, timeout mechanism, Order cancel contract và BE-39 event handling. |
| Đầu ra / contract | Payment EXPIRED/Order outcome đúng contract, notification và UI state tương ứng. |
| Điểm giao tiếp / deliverable đã cam kết | Expiry worker + event flow |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

expiresAt theo clock/timezone server, eligible payment PENDING → expired outcome → Order/Notification theo contract. Webhook và expiry phải có conditional transition; late payment/reconciliation policy tách với reset countdown frontend.

## 4. Thứ tự thực hiện cụ thể

1. Chốt Payment/Order terminal state names, expiry boundary và late-payment policy với owner; ghi field mapping UI.
2. Chuẩn bị payment trước/đúng/sau hạn bằng fixture clock được duyệt, không đổi clock máy production.
3. Nối scheduler/trigger backend có conditional update để chỉ expire PENDING đủ hạn; giữ durable event/recovery sau commit.
4. Phối hợp Order xử lý outcome và Notification đúng một lần; không phát email expired khi webhook đã thắng race.
5. Nối UI query server state, timer chỉ hiển thị và refetch khi tới hạn; reload không tạo payment mới hoặc gia hạn ngầm.
6. Bàn giao hai thứ tự webhook-vs-expiry, scheduler chạy lại và late webhook; đối chiếu Payment/Order/events thay vì chỉ thấy QR biến mất.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt Order expired state vì tài liệu/code có tên khác; scheduler/late-payment policy cần duyệt, không tự đoán.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Payment + Order chốt boundary equality, state mapping và late payment. Không có contract Order expired thì blocked transition đó, không đoán CANCELLED/EXPIRED tương đương.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-29](BE-29.md) | Lê Phú Thịnh | POST payments/{orderId}/bank-transfer; QrPaymentResponse gồm paymentId/orderCode/amount/status/qrContent/expiresAt, payment mới PENDING. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [INT-40](INT-40.md) | Lê Phú Thịnh | Payment event contract/producer cho Order/Notification/Report. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [BE-39](BE-39.md) | Cao Tất Thành | Consumer orchestration tạo notification/email log, gửi qua Mail Sender, trạng thái gửi và chống trùng. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-26](BE-26.md) | Trần Đức Anh | Cancel/reject và refund_request PENDING khi cần; history và đầu ra event cho INT-39/47. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [INT-64](INT-64.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Payment PENDING tới hạn, job xử lý rồi Customer reload | Trạng thái server/Order/thông báo đúng mapping đã duyệt, timer không tự cấp thêm hạn |
| AC-02 | Webhook thắng race trước expiry | Không đổi payment PAID thành EXPIRED |
| AC-03 | Timeout chạy lại | Không hủy/thông báo trùng |
| AC-04 | QR hết hạn | UI không coi timer reset là payment mới |
| AC-05 | Webhook confirm commit trước expiry và thứ tự ngược lại | Không PAID→EXPIRED; late payment đi policy đối soát, không mất giao dịch |
| AC-06 | Scheduler/replay xử lý cùng payment nhiều lần | Không hủy/notify lặp, durable trace chỉ ra outcome cuối |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Controlled-clock cases, webhook-vs-timeout race và Order/payment/notification trace.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao boundary/race matrix, clock fixture và state/event readback, không dùng UI countdown làm bằng chứng scheduler.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

TEST-10: QR expiry: expired payment cannot confirm order

Không mở lại các ID đã gộp; phần việc gộp phải được kiểm chứng cùng task đích.

## 10. Tài liệu và source cần đọc

- [backend/payment-service](../../backend/payment-service)
- [frontend/nextjs/components/payment](../../frontend/nextjs/components/payment)
- [architechture/tasks/BE-29.md](../../architechture/tasks/BE-29.md)
- [architechture/tasks/BE-44.md](../../architechture/tasks/BE-44.md)
- [architechture/tasks/INT-40.md](../../architechture/tasks/INT-40.md)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Lê Phú Thịnh
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 04/11/2026 08:00
**Deadline:** 04/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4622 / reczz28Rqzs2OKXT
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rqzs2OKXT
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 8 SP
**Time Estimated:** 8 giờ công
**Remaining Estimate:** 8 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Đã gồm TEST-10: expiry xuyên Order/Payment/Notification; không sửa lại API nền đã tính BE.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../docs/backlog.md#quy-ước-ước-lượng).

Lịch cũ (30/10): 05/11/2026 08:00 → 06/11/2026 23:59. Lịch mới: 04/11/2026 08:00 → 04/11/2026 23:59. Giữ khung Sprint 2 02–08/11 để truy vết; hạn hoàn thành thực tế 05/11, Sprint Review 06/11, không xếp việc triển khai/nghiệm thu vào 06–08/11.

Bắt đầu có thể là chuẩn bị fixture/UI theo contract; phần cần API/event thật bị chặn cho đến khi dependency bàn giao. Nếu cùng ngày đến hạn, phải bàn giao prerequisite trước khi nghiệm thu task này; không coi deadline trùng ngày là bằng chứng đã sẵn sàng.

</details>

## Quy ước kiểm chứng

Việc cập nhật detail không chạy test, lint, typecheck, build, Docker hoặc trình duyệt. Checklist là điều kiện nghiệm thu để người phụ trách thực hiện, không phải báo cáo PASS. Giữ trạng thái snapshot, kể cả DONE; chưa xác nhận lại trên Lark.
