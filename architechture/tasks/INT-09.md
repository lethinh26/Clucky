# [INT-09] Payment: QR hiển thị, webhook → CONFIRMED, COD confirm

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Lê Phú Thịnh |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 04/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công dự kiến | 8 SP / 12 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

QR chuyển khoản, webhook và COD dẫn tới đúng Payment/Order state xuyên frontend và backend.

## 2. Phạm vi

### Bao gồm

- QR thật→đối soát→payment PAID→Order CONFIRMED; COD thu đúng role/store.
- Bàn giao theo phạm vi gốc: Payment flow works.

### Không bao gồm

Không dùng mock callback/nút demo thay evidence thanh toán thật.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Có payment widget, VietQR helper và order-demo reducer; reducer ghi rõ chỉ đổi snapshot browser. Payment/Shipping source phải đối chiếu với BE task, không lấy nút demo xác nhận thanh toán làm webhook thật.

- [frontend/nextjs/components/payment](../../frontend/nextjs/components/payment)
- [frontend/nextjs/lib/vietqr.ts](../../frontend/nextjs/lib/vietqr.ts)
- [frontend/nextjs/lib/order-demo.ts](../../frontend/nextjs/lib/order-demo.ts)
- [architechture/tasks/BE-29.md](../../architechture/tasks/BE-29.md)
- [architechture/tasks/BE-30.md](../../architechture/tasks/BE-30.md)
- [architechture/tasks/BE-32.md](../../architechture/tasks/BE-32.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | BE-29/30/32, INT-40/51, Order consumer confirmed và UI QR/status. |
| Đầu ra / contract | QR thật→đối soát→payment PAID→Order CONFIRMED; COD thu đúng role/store. |
| Điểm giao tiếp / deliverable đã cam kết | Payment flow works |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

orderId/orderCode ↔ paymentId ↔ bankTxId ↔ eventId/correlationId; QR amount/reference lấy server. Payment PAID và Order CONFIRMED là hai evidence riêng; COD có action/quyền khác bank transfer.

## 4. Thứ tự thực hiện cụ thể

1. Xác nhận producer Payment và consumer Order payment.confirmed có contract cùng phiên bản; chưa có handler thì ghi blocker E2E.
2. Chuẩn bị order bank-transfer PENDING và COD khác nhau, fixture webhook được owner duyệt; không thực hiện chuyển tiền thật.
3. Nối QR từ response server và query trạng thái qua Gateway, không tự gán PAID khi ảnh QR render hoặc countdown hết.
4. Theo webhook qua xác thực/matching/idempotency tới Payment rồi Order; ghi cả trạng thái persisted, event ID và delay quan sát.
5. Nối COD confirm theo role/store và trạng thái hợp lệ; pending chặn gửi lặp, lỗi không cập nhật local thành thu tiền.
6. Bàn giao replay/mismatch/cross-store và Payment đã PAID nhưng Order chưa xử lý; tách failure từng mắt xích thay vì báo chung UI lỗi.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** M3 phải bàn giao handler payment.confirmed; thống nhất môi trường và khoản giao dịch được người dùng duyệt, không tự chuyển tiền để test.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Payment + Order chốt event delivery/reconcile, test provider và khoản giao dịch được phép. Không có môi trường provider thì chỉ ghi fixture result, không chứng nhận webhook production.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-30](BE-30.md) | Lê Phú Thịnh | Webhook logs/bank_transactions, payment PAID khi khớp, đầu ra payment.confirmed cho INT-40 và xử lý mismatch. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-32](BE-32.md) | Lê Phú Thịnh | API confirm-manual/confirm-cod/refund/transactions/bank-config, mutation audit và state đúng phương thức. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [INT-40](INT-40.md) | Lê Phú Thịnh | Payment event contract/producer cho Order/Notification/Report. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-51](INT-51.md) | Lê Phú Thịnh | COD lifecycle với Payment COLLECTED và Order progression theo contract. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [DEP-06](DEP-06.md), [DEP-09](DEP-09.md), [TEST-14](TEST-14.md), [TEST-17](TEST-17.md), [TEST-22](TEST-22.md), [TEST-23](TEST-23.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Bank-transfer order nhận webhook hợp lệ, sau đó Customer tải lại trạng thái | Payment PAID và Order chuyển hợp lệ theo contract; UI lấy server, trace nối cùng order |
| AC-02 | Webhook replay/mismatch | Không xác nhận sai/trùng |
| AC-03 | Chỉ Payment PAID mà Order chưa chuyển | Chưa đạt E2E |
| AC-04 | COD sai quán/lần hai | Bị chặn |
| AC-05 | Replay bankTxId hoặc webhook sai amount/reference | Không xác nhận nhầm/trùng, giữ exception/reconciliation evidence |
| AC-06 | STAFF quán B confirm COD của A hoặc xác nhận lại COD đã thu | Backend chặn sai scope và chống lặp; không tạo thêm sự kiện thu tiền |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Order/payment/event IDs, QR decoded fields và webhook/COD trace đã che bank details.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao timeline QR/webhook/Payment/Order/UI và COD độc lập, redacted payloads; không kèm bank credential hoặc dùng demo button làm evidence.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

TEST-02: E2E transfer→webhook→CONFIRMED; DEP-16: Payment/Shipping smoke test + webhook/rollback runbook

Không mở lại các ID đã gộp; phần việc gộp phải được kiểm chứng cùng task đích.

## 10. Tài liệu và source cần đọc

- [frontend/nextjs/components/payment](../../frontend/nextjs/components/payment)
- [frontend/nextjs/lib/vietqr.ts](../../frontend/nextjs/lib/vietqr.ts)
- [frontend/nextjs/lib/order-demo.ts](../../frontend/nextjs/lib/order-demo.ts)
- [architechture/tasks/BE-29.md](../../architechture/tasks/BE-29.md)
- [architechture/tasks/BE-30.md](../../architechture/tasks/BE-30.md)
- [architechture/tasks/BE-32.md](../../architechture/tasks/BE-32.md)
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
**Mã Lark:** Mail-4592 / reczz28Rqn97Ur1I
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rqn97Ur1I
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 8 SP
**Time Estimated:** 12 giờ công
**Remaining Estimate:** 12 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
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
