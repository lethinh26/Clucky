# [INT-08] Order tracking, history, cancel, reorder E2E

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Trần Đức Anh |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 04/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công dự kiến | 5 SP / 8 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Lịch sử/tracking/cancel/reorder Customer dùng trạng thái thật và không cho thao tác vượt điều kiện.

## 2. Phạm vi

### Bao gồm

- Lịch sử/chi tiết/hủy/đặt lại đồng bộ qua API theo owner.
- Bàn giao theo phạm vi gốc: Order mgmt works.

### Không bao gồm

Không tự xác nhận hoàn tiền hoặc sửa order history ở client.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Customer orders/detail và OrderProvider đã có UI, nhưng provider có demo snapshot. Nối list/detail/cancel/reorder vào API BE-27/26; không dùng reducer local làm bằng chứng hủy hoặc tracking server.

- [frontend/nextjs/app/orders](../../frontend/nextjs/app/orders)
- [frontend/nextjs/components/order/order-provider.tsx](../../frontend/nextjs/components/order/order-provider.tsx)
- [architechture/tasks/BE-26.md](../../architechture/tasks/BE-26.md)
- [architechture/tasks/BE-27.md](../../architechture/tasks/BE-27.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | BE-26/27, polling INT-68 và Orders UI. |
| Đầu ra / contract | Lịch sử/chi tiết/hủy/đặt lại đồng bộ qua API theo owner. |
| Điểm giao tiếp / deliverable đã cam kết | Order mgmt works |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

List/detail theo customer JWT, cancel gồm lý do/version nếu contract yêu cầu, reorder dùng ID món và availability/giá hiện hành. Hóa đơn cũ giữ snapshot; trạng thái shipment MVP không tự suy ra shipper tracking.

## 4. Thứ tự thực hiện cụ thể

1. Đối chiếu route/history/detail và adapter với DTO Order; bỏ fallback mock khỏi luồng thật, giữ lỗi/empty riêng.
2. Chuẩn bị đơn của A/B, đơn còn được hủy và đơn đã PREPARING; ghi expected state từ contract.
3. Nối list/detail và pagination/filter được hỗ trợ; deep link phải gọi server kiểm tra ownership, không tin ID URL.
4. Nối cancel pending/success/conflict; reload state sau conflict, không tự sửa order thành CANCELLED trước response.
5. Nối reorder theo policy đầy đủ/một phần đã duyệt; giữ hóa đơn lịch sử, đưa món/giá mới vào cart và giải thích món không khả dụng.
6. Phối hợp INT-68 về polling/cancel khi rời trang; bàn giao hai-tab race, URL người khác và API error cho người dùng kiểm chứng.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt behavior partial reorder và polling khi navigation; giữ snapshot hóa đơn cũ.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Order quyết định partial reorder, cancel window và version conflict; UI owner chốt hiển thị thay đổi giá. Chưa chốt partial reorder thì không tự bỏ món rồi báo thành công toàn bộ.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-26](BE-26.md) | Trần Đức Anh | Cancel/reject và refund_request PENDING khi cần; history và đầu ra event cho INT-39/47. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-27](BE-27.md) | Trần Đức Anh | My/admin list, detail snapshot, reorder qua kiểm tra Catalog mới. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [INT-68](INT-68.md) | Trần Đức Anh | Polling order state/history với loading/error/retry/cancellation và terminal behavior. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [TEST-17](TEST-17.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | A xem history/detail, hủy đơn hợp lệ rồi reorder đơn cũ | Mỗi hành động phản ánh server sau reload; invoice cũ giữ nguyên, cart mới dùng contract hiện tại |
| AC-02 | Hủy bị conflict do đã PREPARING | Hiển thị trạng thái mới, không success giả |
| AC-03 | Reorder món hết | Thông báo theo contract |
| AC-04 | URL đơn người khác | Không lộ dữ liệu |
| AC-05 | Nhân sự chuyển PREPARING đúng lúc A hủy | Không success giả; UI nhận conflict và hiển thị state mới |
| AC-06 | A mở URL order B hoặc reorder có món đã ngừng bán | Không lộ order B; reorder giải thích rõ phần không thực hiện theo policy |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Hai account, cancel race, reorder after catalog change và reload evidence.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao trace history/cancel/reorder, bảng snapshot cũ-vs-cart mới và ownership evidence; polling ownership bàn giao INT-68, không tạo loop thứ hai.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [frontend/nextjs/app/orders](../../frontend/nextjs/app/orders)
- [frontend/nextjs/components/order/order-provider.tsx](../../frontend/nextjs/components/order/order-provider.tsx)
- [architechture/tasks/BE-26.md](../../architechture/tasks/BE-26.md)
- [architechture/tasks/BE-27.md](../../architechture/tasks/BE-27.md)
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
**Mã Lark:** Mail-4528 / reczz28Rid5XkJIs
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5XkJIs
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 5 SP
**Time Estimated:** 8 giờ công
**Remaining Estimate:** 8 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
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
