# [INT-64] Payment status UI: pending/paid/expired/mismatch/refund states

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Lê Phú Thịnh |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 04/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công dự kiến | 5 SP / 6 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Payment UI hiển thị pending/paid/expired/mismatch/refund theo backend mà không làm mất ngữ cảnh đơn.

## 2. Phạm vi

### Bao gồm

- Status query integration và state-specific actions/messages/QR visibility.
- Bàn giao theo phạm vi gốc: Payment state UI.

### Không bao gồm

Không sinh webhook/nút xác nhận giả hoặc tự sửa payment state local.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Customer payment widget/status badge và order-demo đã có; model UI phải đối chiếu Payment query BE-44 thay vì tự chuyển PAID từ timer hoặc nút mô phỏng. Refund APPROVED chưa phải REFUNDED.

- [frontend/nextjs/components/payment](../../frontend/nextjs/components/payment)
- [frontend/nextjs/lib/types/order.ts](../../frontend/nextjs/lib/types/order.ts)
- [frontend/nextjs/lib/order-demo.ts](../../frontend/nextjs/lib/order-demo.ts)
- [architechture/tasks/BE-44.md](../../architechture/tasks/BE-44.md)
- [architechture/tasks/BE-46.md](../../architechture/tasks/BE-46.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | BE-44, expiry INT-50, refund INT-52 và payment state components. |
| Đầu ra / contract | Status query integration và state-specific actions/messages/QR visibility. |
| Điểm giao tiếp / deliverable đã cam kết | Payment state UI |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

GET payment theo orderId/owner → Payment state/amount/expiresAt/refund state → UI copy/action. Map Payment và Order riêng, unknown state hiển thị an toàn; query/poll lifecycle phối hợp INT-68, không tạo nhiều loop.

## 4. Thứ tự thực hiện cụ thể

1. Lập state mapping từ response thật tới badge/copy/action, chốt tên EXPIRED/MISMATCH/refund và fallback unknown.
2. Nối query có auth/ownership qua Gateway, dọn dữ liệu user/order cũ khi đổi context.
3. Hiển thị loading/error/empty và retry; không bỏ order hoặc gán success khi query lỗi.
4. Cập nhật state từ server theo polling/refetch policy, bỏ response stale; timer chỉ biểu diễn expiresAt, không mutate payment.
5. Tách approved/refunded copy và action cho từng outcome, tránh hiển thị đã nhận tiền/hoàn tiền quá sớm.
6. Bàn giao các state thực/fixture rõ nhãn, cross-owner và terminal/401; evidence Payment query riêng với Order status.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt tên state và mapping Order/Payment; UI timer chỉ trình bày, backend quyết định expiry.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Payment/UI chốt mapping state và refresh policy với INT-68. Chưa có response enum thì không thêm state tưởng tượng hoặc coi unknown là PAID.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-44](BE-44.md) | Lê Phú Thịnh | GET payments/{orderId} với state/amount/QR/expiry phù hợp quyền và không lộ raw webhook. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [INT-50](INT-50.md) | Lê Phú Thịnh | Payment EXPIRED/Order outcome đúng contract, notification và UI state tương ứng. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-52](INT-52.md) | Lê Phú Thịnh | Refund E2E với approve/reject/refunded, audit/notification và chống lặp. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** Chưa có task khai báo phụ thuộc trong snapshot.

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Query payment của owner qua các state contract và reload | Badge/amount/action khớp server, Payment và Order không bị đồng nhất sai |
| AC-02 | EXPIRED/MISMATCH | Không hiển thị như PAID |
| AC-03 | Refund APPROVED chưa REFUNDED | Copy không báo đã hoàn tiền |
| AC-04 | Query lỗi | Không giả payment thành công hoặc xóa order |
| AC-05 | Refund APPROVED nhưng chưa REFUNDED, hoặc QR tới hạn mà server chưa quyết định | Copy không tuyên bố đã hoàn/đã expire chắc chắn; refetch theo policy |
| AC-06 | Đổi order nhanh, API lỗi/401 hoặc query order người khác | Không hiện dữ liệu cũ/khác chủ, không fake success; recovery auth/error đúng |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Fixture từng state từ API, transition/reload và ownership failure rendering.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao state-copy-action matrix và stale-response/ownership traces; chỉ rõ demo controls không tham gia nghiệm thu real payment.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [frontend/nextjs/components/payment](../../frontend/nextjs/components/payment)
- [frontend/nextjs/lib/types/order.ts](../../frontend/nextjs/lib/types/order.ts)
- [frontend/nextjs/lib/order-demo.ts](../../frontend/nextjs/lib/order-demo.ts)
- [architechture/tasks/BE-44.md](../../architechture/tasks/BE-44.md)
- [architechture/tasks/BE-46.md](../../architechture/tasks/BE-46.md)
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
**Mã Lark:** Mail-4636 / reczz28Rqzs2NXEo
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rqzs2NXEo
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
