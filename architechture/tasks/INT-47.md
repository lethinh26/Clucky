# [INT-47] Saga: payment.failed → cancel order → release voucher/điểm

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Trần Đức Anh |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 04/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công dự kiến | 8 SP / 12 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Payment thất bại dẫn đến hủy đơn và release ưu đãi/điểm một cách idempotent giữa các service.

## 2. Phạm vi

### Bao gồm

- Saga compensation Order→Promotion với trạng thái/retry truy vết được.
- Payment.failed → cancel order → release voucher/điểm; bù trừ idempotent.
- PIC Order kết nối; Payment producer INT-40 và Promotion API BE-34/37 là dependency, không thêm đồng PIC.

### Không bao gồm

Không chuyển tiền refund hoặc notification producer ngoài boundary đã chốt.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Saga cần nối Payment producer INT-40 với Order và Promotion/Loyalty, không có transaction SQL xuyên service. Đọc trạng thái thật và reservation contract trước khi viết release callback.

- [backend/cart-order-service](../../backend/cart-order-service)
- [backend/promotion-loyalty-service](../../backend/promotion-loyalty-service)
- [architechture/tasks/INT-40.md](../../architechture/tasks/INT-40.md)
- [architechture/tasks/BE-24.md](../../architechture/tasks/BE-24.md)
- [architechture/tasks/BE-37.md](../../architechture/tasks/BE-37.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | payment.failed, Order state và Promotion release contracts BE-34/37. |
| Đầu ra / contract | Saga compensation Order→Promotion với trạng thái/retry truy vết được. |
| Điểm giao tiếp / deliverable đã cam kết | Event chain |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Failure identity/payment/order và current state → cancel hợp lệ → release voucher/points theo reservation/order key. Mỗi bước có durable progress/retry; event failed cũ không được hủy order đã paid, release phải idempotent.

## 4. Thứ tự thực hiện cụ thể

1. Chốt failure types và race confirmed-vs-failed với Payment/Order; xác minh current state trước mutation.
2. Map reservation/voucher/points của order và API/event release được owner cung cấp; không tự cộng balance bằng số UI.
3. Ghi saga/compensation progress bền vững cùng bước Order phù hợp để restart biết việc còn thiếu, không chỉ chain callback trong memory.
4. Cancel theo transition hợp lệ, yêu cầu release idempotent và ghi outcome từng resource; không coi timeout là đã release.
5. Retry phần pending sau phục hồi theo policy, reconcile unknown outcome trước thao tác có thể hoàn trả hai lần.
6. Bàn giao duplicate failed, release timeout/crash và concurrent confirmed; đối chiếu Order/payment/usage/ledger, không chỉ saga log.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt saga state/durable retry và race confirmed-vs-failed; không dùng distributed SQL transaction giả.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Order/Payment/Loyalty chốt precedence race, durable progress và reservation lifecycle. Chưa có release API/key thì ghi blocked compensation, không giả distributed rollback.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [INT-40](INT-40.md) | Lê Phú Thịnh | Payment event contract/producer cho Order/Notification/Report. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [BE-26](BE-26.md) | Trần Đức Anh | Cancel/reject và refund_request PENDING khi cần; history và đầu ra event cho INT-39/47. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-34](BE-34.md) | Cao Tất Thành | Validate/available/CRUD voucher thường, discount và lỗi hết hạn/hết lượt/sai scope. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-37](BE-37.md) | Cao Tất Thành | Loyalty me/history/config, earn/redeem và contract bù trừ cho Order saga. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [TEST-16](TEST-16.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Payment failed hợp lệ cho order chưa paid có reservation | Order chuyển hợp lệ, voucher/điểm được release đúng một lần, progress kết thúc có evidence |
| AC-02 | Replay failure | Không release/cộng trả điểm hai lần |
| AC-03 | Promotion timeout | Không bỏ quên compensation đã pending |
| AC-04 | Order đã paid/terminal | Không hủy sai do event stale |
| AC-05 | Release timeout rồi restart/replay failed | Còn việc pending được retry/reconcile, không bỏ quên hoặc hoàn trả hai lần |
| AC-06 | Failed đến muộn khi payment/order đã thành công | Không hủy/release sai; outcome được ghi theo policy race đã duyệt |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Payment/order/usage/ledger trace, partial failure và replay recovery.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao saga transition/progress map và evidence từng resource trước/sau; lỗi có owner, không gọi status cancelled là compensation đã hoàn tất.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [backend/cart-order-service](../../backend/cart-order-service)
- [backend/promotion-loyalty-service](../../backend/promotion-loyalty-service)
- [architechture/tasks/INT-40.md](../../architechture/tasks/INT-40.md)
- [architechture/tasks/BE-24.md](../../architechture/tasks/BE-24.md)
- [architechture/tasks/BE-37.md](../../architechture/tasks/BE-37.md)
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
**Mã Lark:** Mail-4517 / reczz28Rid5XkQIM
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5XkQIM
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 8 SP
**Time Estimated:** 12 giờ công
**Remaining Estimate:** 12 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Tính phần nối contract, xử lý lỗi liên service/UI, fixture và evidence tích hợp; không triển khai lại API đã tính ở BE hoặc chạy lại bộ regression TEST.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../docs/backlog.md#quy-ước-ước-lượng).

Lịch cũ (30/10): 05/11/2026 08:00 → 06/11/2026 23:59. Lịch mới: 04/11/2026 08:00 → 04/11/2026 23:59. Giữ khung Sprint 2 02–08/11 để truy vết; hạn hoàn thành thực tế 05/11, Sprint Review 06/11, không xếp việc triển khai/nghiệm thu vào 06–08/11.

Bắt đầu có thể là chuẩn bị fixture/UI theo contract; phần cần API/event thật bị chặn cho đến khi dependency bàn giao. Nếu cùng ngày đến hạn, phải bàn giao prerequisite trước khi nghiệm thu task này; không coi deadline trùng ngày là bằng chứng đã sẵn sàng.

</details>

## Quy ước kiểm chứng

Việc cập nhật detail không chạy test, lint, typecheck, build, Docker hoặc trình duyệt. Checklist là điều kiện nghiệm thu để người phụ trách thực hiện, không phải báo cáo PASS. Giữ trạng thái snapshot, kể cả DONE; chưa xác nhận lại trên Lark.
