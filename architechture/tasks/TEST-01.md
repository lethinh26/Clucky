# [TEST-01] E2E Guest→register→OTP→browse→cart→COD order

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Trần Đức Anh |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 05/11/2026 08:00 → 05/11/2026 23:59 |
| SP / giờ công dự kiến | 5 SP / 6 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Nghiệm thu hành trình khách từ chưa đăng nhập đến đơn COD thật, dữ liệu khớp qua các service.

## 2. Phạm vi

### Bao gồm

- Bộ case/script và báo cáo Guest→register→OTP→browse→cart→COD có actual/expected và IDs.
- Nghiệm thu Guest → register/OTP → menu → cart → COD; đối chiếu dữ liệu thực giữa các service.

### Không bao gồm

Không nhận PASS từ screenshot đơn giả, không payment transfer thay luồng COD.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Luồng Customer hiện trộn Auth/Catalog API với OrderProvider demo/local; test phải chứng minh từng chặng backend, không kết luận từ UI thành công. INT-05/06/07/51 là đầu vào, chưa sẵn sàng thì ghi blocked.

- [architechture/tasks/INT-05.md](../../architechture/tasks/INT-05.md)
- [architechture/tasks/INT-06.md](../../architechture/tasks/INT-06.md)
- [architechture/tasks/INT-07.md](../../architechture/tasks/INT-07.md)
- [architechture/tasks/INT-51.md](../../architechture/tasks/INT-51.md)
- [frontend/nextjs/components/order/order-provider.tsx](../../frontend/nextjs/components/order/order-provider.tsx)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | Môi trường tích hợp, customer mới, store/menu còn bán, email sender và Staff đúng quán. |
| Đầu ra / contract | Bộ case/script và báo cáo Guest→register→OTP→browse→cart→COD có actual/expected và IDs. |
| Điểm giao tiếp / deliverable đã cam kết | COD verified |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Một test run có account/recipient/store/products/stock/COD fixture được phép, expected breakdown và IDs liên kết. Guest cart merge theo policy; server Order/Payment sau reload là oracle, localStorage/mock không tính bằng chứng.

## 4. Thứ tự thực hiện cụ thể

1. Ghi commit/môi trường và readiness từng dependency; chưa có API/sender thì dừng case tương ứng, không mở Docker hay test trong lượt viết này.
2. Chuẩn bị guest session sạch, mailbox test, store/món hợp lệ và nhân sự đúng quán; ghi baseline để cleanup đúng dữ liệu tạo bởi run.
3. Kịch bản người dùng đi register→OTP→browse theo store→cart→preview→COD create qua UI/Gateway, ghi request/IDs đã mask.
4. Đối chiếu Order/COD persisted, reload Customer và màn nhân sự; confirm COD/complete chỉ theo điều kiện được duyệt.
5. Thêm OTP sai/hết hạn, món hết lúc checkout và submit mất response/retry; kiểm không có order/payment trùng.
6. Ghi từng bước expected/actual/evidence, bug có PIC và retest; cleanup chỉ dữ liệu test được xác định, không xóa volume hoặc tài khoản dùng chung.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt môi trường/recipient/test data và cleanup; phần guest-cart merge chỉ nghiệm thu theo policy đã duyệt.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC test + domain owners chốt dataset/mailbox/guest merge và cleanup. Chưa có evidence thật phải NOT RUN/BLOCKED, không chuyển task DONE vì có script.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [INT-05](INT-05.md) | Trần Nguyễn Hữu Khánh | Luồng auth hai app với JWT/refresh thật, register/OTP chỉ Customer. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-06](INT-06.md) | Nguyễn Duy Quang Nhật | Browse/search/filter/detail nối API thay mock trong phạm vi tích hợp. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-07](INT-07.md) | Trần Đức Anh | Cart→preview→submit→order detail qua Gateway với trạng thái nhất quán. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-51](INT-51.md) | Lê Phú Thịnh | COD lifecycle với Payment COLLECTED và Order progression theo contract. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [DEP-06](DEP-06.md), [DEP-10](DEP-10.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Guest hoàn tất hành trình chuẩn trên tài khoản test và reload | Mỗi chặng có request/data thật, Order/COD đúng owner/store/tổng, không demo fallback |
| AC-02 | Luồng chuẩn | Mỗi bước có dữ liệu thực, không localStorage mock thay backend |
| AC-03 | OTP sai hoặc món hết tại checkout | Không tạo đơn sai, lỗi đúng bước |
| AC-04 | Gửi lại checkout | Không tạo order/payment thứ hai |
| AC-05 | OTP invalid hoặc stock đổi sau preview | Bị chặn tại bước đúng, không tạo order sai hoặc session giả |
| AC-06 | Retry checkout sau mất response | Cùng order theo idempotency contract, không payment thứ hai |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Script, expected/actual, network trace và order/payment/email IDs đã mask.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao E2E run sheet có IDs/evidence đã mask, kết quả từng bước và lỗi owner; chỉ viết kế hoạch, chưa thực thi test.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [architechture/tasks/INT-05.md](../../architechture/tasks/INT-05.md)
- [architechture/tasks/INT-06.md](../../architechture/tasks/INT-06.md)
- [architechture/tasks/INT-07.md](../../architechture/tasks/INT-07.md)
- [architechture/tasks/INT-51.md](../../architechture/tasks/INT-51.md)
- [frontend/nextjs/components/order/order-provider.tsx](../../frontend/nextjs/components/order/order-provider.tsx)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Trần Đức Anh
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 05/11/2026 08:00
**Deadline:** 05/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4544 / reczz28Rid5XjtTx
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5XjtTx
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 5 SP
**Time Estimated:** 6 giờ công
**Remaining Estimate:** 6 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Tính chuẩn bị dữ liệu, chạy kịch bản nghiệm thu độc lập và ghi evidence/retest; sửa lỗi implementation thuộc task domain, không cộng hai lần.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../docs/backlog.md#quy-ước-ước-lượng).

Lịch cũ (30/10): 07/11/2026 08:00 → 07/11/2026 23:59. Lịch mới: 05/11/2026 08:00 → 05/11/2026 23:59. Giữ khung Sprint 2 02–08/11 để truy vết; hạn hoàn thành thực tế 05/11, Sprint Review 06/11, không xếp việc triển khai/nghiệm thu vào 06–08/11.

Bắt đầu có thể là chuẩn bị fixture/UI theo contract; phần cần API/event thật bị chặn cho đến khi dependency bàn giao. Nếu cùng ngày đến hạn, phải bàn giao prerequisite trước khi nghiệm thu task này; không coi deadline trùng ngày là bằng chứng đã sẵn sàng.

</details>

## Quy ước kiểm chứng

Việc cập nhật detail không chạy test, lint, typecheck, build, Docker hoặc trình duyệt. Checklist là điều kiện nghiệm thu để người phụ trách thực hiện, không phải báo cáo PASS. Giữ trạng thái snapshot, kể cả DONE; chưa xác nhận lại trên Lark.
