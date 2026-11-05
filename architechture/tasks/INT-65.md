# [INT-65] Shipping fee + shipment info UI integration

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Lê Phú Thịnh |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 04/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công dự kiến | 3 SP / 4 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Checkout/Order detail hiển thị phí ship và shipment thật theo delivery mode, không mô phỏng Phase 2.

## 2. Phạm vi

### Bao gồm

- calculate-fee→order total và shipment CREATED→detail integration.
- Bàn giao theo phạm vi gốc: Shipping widget works.

### Không bao gồm

Không assignment hoặc realtime shipper/GPS.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Shipping fee/shipment components đã có; OrderProvider có demo shipment nên cần tách khỏi query thật. BE-33/48 là nguồn phí, INT-43 là consumer shipment; fee có thể nối trước khi shipment sẵn sàng.

- [frontend/nextjs/components/shipping](../../frontend/nextjs/components/shipping)
- [frontend/nextjs/app/checkout/page.tsx](../../frontend/nextjs/app/checkout/page.tsx)
- [architechture/tasks/BE-33.md](../../architechture/tasks/BE-33.md)
- [architechture/tasks/BE-48.md](../../architechture/tasks/BE-48.md)
- [architechture/tasks/INT-43.md](../../architechture/tasks/INT-43.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | BE-33/48, shipment consumer INT-43 và fee/shipment UI. |
| Đầu ra / contract | calculate-fee→order total và shipment CREATED→detail integration. |
| Điểm giao tiếp / deliverable đã cam kết | Shipping widget works |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Delivery mode/store/address/distance/subtotal theo nguồn được duyệt → fee response → Order preview/persisted fee. Shipment query theo order/owner, MVP CREATED-only; missing shipment có thể do projection pending, không đồng nghĩa delivered hoặc 0 phí.

## 4. Thứ tự thực hiện cụ thể

1. Chốt input distance/unit/subtotal threshold/rounding với Order/Shipping; không thêm Maps/GPS tự tính ngoài scope.
2. Nối fee qua Gateway hoặc Order preview theo contract, ghi nguồn phí duy nhất để UI không cộng lại lần hai.
3. Khi đổi address/store/mode, bỏ response cũ, pending/error rõ; không giữ phí quán cũ như kết quả mới.
4. Đối chiếu preview và Order record sau create, pickup/free threshold/override theo rule đã duyệt.
5. Nối shipment query sau order.created, chờ/retry theo policy khi chưa có; không tạo shipment giả từ local state hay action assign/track Phase 2.
6. Bàn giao owner/store tamper, unavailable Shipping và consumer delay; ghi evidence phí riêng với shipment creation.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt distance/threshold/rounding và policy chưa có shipment; fee có thể tích hợp trước consumer shipment.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Shipping/Order/UI chốt unknown distance và missing-shipment outcome; không default fee=0 khi upstream lỗi. Assignment/tracking giữ Phase 2.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-33](BE-33.md) | Lê Phú Thịnh | calculate-fee, fee-config và GET shipment theo order; MVP trạng thái CREATED. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-48](BE-48.md) | Lê Phú Thịnh | Rule tính phí mở rộng cho BE-33 kèm ví dụ biên có expected amount. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [INT-43](INT-43.md) | Lê Phú Thịnh | Idempotent consumer tạo shipment MVP cho BE-33 query. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [TEST-12](TEST-12.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Delivery/pickup với fixture phí đã duyệt đi qua preview/create/readback | UI breakdown và persisted fee khớp server, không cộng phí hai lần |
| AC-02 | Pickup/free threshold | Tổng UI khớp backend |
| AC-03 | Chưa có shipment | Trạng thái chờ rõ, không giả delivered |
| AC-04 | Store/owner sai | API chặn |
| AC-05 | Đổi địa chỉ nhanh hoặc fee API lỗi | Không hiển thị phí stale/0 giả, có trạng thái chờ/lỗi và bước tiếp theo |
| AC-06 | Query shipment chưa được consumer tạo hoặc order người khác | Pending rõ theo contract, không fake delivered; backend chặn khác owner/store |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Fee matrix, order total và event→shipment→UI evidence.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao fee input/output map, expected totals và shipment CREATED/query evidence; ghi blocker consumer độc lập với fee integration.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [frontend/nextjs/components/shipping](../../frontend/nextjs/components/shipping)
- [frontend/nextjs/app/checkout/page.tsx](../../frontend/nextjs/app/checkout/page.tsx)
- [architechture/tasks/BE-33.md](../../architechture/tasks/BE-33.md)
- [architechture/tasks/BE-48.md](../../architechture/tasks/BE-48.md)
- [architechture/tasks/INT-43.md](../../architechture/tasks/INT-43.md)
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
**Mã Lark:** Mail-4637 / reczz28Rqzs2NTkh
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rqzs2NTkh
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 3 SP
**Time Estimated:** 4 giờ công
**Remaining Estimate:** 4 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
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
