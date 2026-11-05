# [INT-49] SePay webhook test: mock → verify → match → confirm

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Lê Phú Thịnh |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 04/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công dự kiến | 5 SP / 8 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Kiểm chứng webhook SePay từ nhận raw payload đến payment confirmation với auth, replay và mismatch.

## 2. Phạm vi

### Bao gồm

- Bộ request/tests webhook valid/invalid/replay/mismatch và kết quả persistence/event.
- Gộp TEST-08/09: signature hợp lệ/sai, replay bankTxId, sai mã/sai số tiền, match → PAID.
- Mock payload chỉ dùng test contract; nghiệm thu thanh toán thật vẫn thuộc INT-09.

### Không bao gồm

Không tự giao dịch ngân hàng hoặc thay INT-09 E2E thật.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

BE-30 định nghĩa webhook verify/match và BE-45 mismatch; Payment controller hiện cần đối chiếu handler thật. Gateway security có chặn webhook public path, nên ingress được duyệt phải xác định trước, không tắt auth toàn Gateway.

- [backend/payment-service](../../backend/payment-service)
- [backend/api-gateway/src/main/java/com/clucky/apigateway/config/SecurityConfig.java](../../backend/api-gateway/src/main/java/com/clucky/apigateway/config/SecurityConfig.java)
- [architechture/tasks/BE-30.md](../../architechture/tasks/BE-30.md)
- [architechture/tasks/BE-45.md](../../architechture/tasks/BE-45.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | BE-30/45, fixture provider được xác minh và ngân hàng/đơn test có kiểm soát. |
| Đầu ra / contract | Bộ request/tests webhook valid/invalid/replay/mismatch và kết quả persistence/event. |
| Điểm giao tiếp / deliverable đã cam kết | Integration test |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Fixture provider version/raw bytes/auth header/nonce hoặc timestamp theo contract → bankTxId/reference/amount → transaction/payment/event. Signature tính trên bytes quy định, không parse/reserialize JSON rồi giả cùng chữ ký. Không tự chọn signing scheme chưa được xác nhận.

## 4. Thứ tự thực hiện cụ thể

1. Nhận provider contract và ingress từ owner Payment/deployment; ghi cách lấy credential thử nghiệm ngoài repo.
2. Chuẩn bị fixture valid, tampered body/auth, duplicate bankTxId, sai amount và reference không match; lưu dữ liệu synthetic không có secret.
3. Mô tả gửi raw request qua ingress thật, đối chiếu auth rejection trước mutation; mock chỉ chứng minh contract chứ không phải nhận tiền thật.
4. Theo valid request tới persisted bank transaction, Payment PAID và event; ghi IDs liên kết và phân biệt consumer Order ở INT-09.
5. Replay tuần tự/đồng thời và kiểm tra mismatch không tự confirm; duplicate phải theo outcome contract, không suy từ HTTP 200 đơn lẻ.
6. Bàn giao matrix request bytes/hash đã mask, response, state/event counts; người dùng thực hiện khi cho phép, không tự chuyển tiền hoặc gọi provider.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt fixture version/provider signing với owner; mock chỉ kiểm chứng contract, không chứng minh đã nhận tiền thật.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Payment chốt provider signing/fixture version, endpoint ingress và mismatch outcome. Thiếu spec xác thực thì blocked case valid, không tự đổi chữ ký để test pass.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-30](BE-30.md) | Lê Phú Thịnh | Webhook logs/bank_transactions, payment PAID khi khớp, đầu ra payment.confirmed cho INT-40 và xử lý mismatch. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-45](BE-45.md) | Lê Phú Thịnh | Reconciliation detail/mismatch workflow, trạng thái xử lý và đầu vào confirm-manual. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** Chưa có task khai báo phụ thuộc trong snapshot.

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Fixture raw webhook hợp lệ qua ingress đã duyệt | Transaction match đúng order/amount, Payment PAID và một logical confirmation |
| AC-02 | Chữ ký/body bị sửa | Từ chối trước xác nhận |
| AC-03 | bankTxId lặp | Không side effect lần hai |
| AC-04 | Sai mã/số tiền | Mismatch, không PAID |
| AC-05 | Sửa một byte body sau khi ký hoặc dùng auth sai | Bị từ chối trước xác nhận tiền, không rò rỉ secret trong response/log |
| AC-06 | Gửi đồng thời cùng bankTxId rồi gửi sai amount/reference | Không side effect trùng; mismatch không PAID và có trace đối soát |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Test cases raw bytes/hash đã mask và before-after payment/transaction counts.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao fixture manifest/version, raw-byte hash và persisted result matrix; phân biệt contract mock với provider/live verification.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

TEST-08: Idempotency: webhook replay không duplicate; TEST-09: Payment mismatch: wrong code/amount → MISMATCH + manual flow

Không mở lại các ID đã gộp; phần việc gộp phải được kiểm chứng cùng task đích.

## 10. Tài liệu và source cần đọc

- [backend/payment-service](../../backend/payment-service)
- [backend/api-gateway/src/main/java/com/clucky/apigateway/config/SecurityConfig.java](../../backend/api-gateway/src/main/java/com/clucky/apigateway/config/SecurityConfig.java)
- [architechture/tasks/BE-30.md](../../architechture/tasks/BE-30.md)
- [architechture/tasks/BE-45.md](../../architechture/tasks/BE-45.md)
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
**Mã Lark:** Mail-4519 / reczz28Rid5XjJ9G
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5XjJ9G
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 5 SP
**Time Estimated:** 8 giờ công
**Remaining Estimate:** 8 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Đã gồm TEST-08/09: signature, replay, mismatch và confirm với fixture; nghiệm thu thanh toán thật thuộc INT-09.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../docs/backlog.md#quy-ước-ước-lượng).

Lịch cũ (30/10): 05/11/2026 08:00 → 06/11/2026 23:59. Lịch mới: 04/11/2026 08:00 → 04/11/2026 23:59. Giữ khung Sprint 2 02–08/11 để truy vết; hạn hoàn thành thực tế 05/11, Sprint Review 06/11, không xếp việc triển khai/nghiệm thu vào 06–08/11.

Bắt đầu có thể là chuẩn bị fixture/UI theo contract; phần cần API/event thật bị chặn cho đến khi dependency bàn giao. Nếu cùng ngày đến hạn, phải bàn giao prerequisite trước khi nghiệm thu task này; không coi deadline trùng ngày là bằng chứng đã sẵn sàng.

</details>

## Quy ước kiểm chứng

Việc cập nhật detail không chạy test, lint, typecheck, build, Docker hoặc trình duyệt. Checklist là điều kiện nghiệm thu để người phụ trách thực hiện, không phải báo cáo PASS. Giữ trạng thái snapshot, kể cả DONE; chưa xác nhận lại trên Lark.
