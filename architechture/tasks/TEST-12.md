# [TEST-12] Shipping fee rules: pickup/free threshold/store override

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Lê Phú Thịnh |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 05/11/2026 08:00 → 05/11/2026 23:59 |
| SP / giờ công dự kiến | 3 SP / 3 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Công thức phí shipping đúng ở pickup, free threshold và override từng quán.

## 2. Phạm vi

### Bao gồm

- Bộ boundary tests và báo cáo so API/checkout/order persisted fee.
- Bàn giao theo phạm vi gốc: Fee verified.

### Không bao gồm

Không geolocation/load test hoặc shipment assignment.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

BE-48 định nghĩa fee rules, INT-65 nối UI/Order; expected phải tính từ rule đã được duyệt trước khi dùng endpoint làm oracle. Không lấy giá UI hiện tại làm đáp án của chính UI.

- [architechture/tasks/BE-48.md](../../architechture/tasks/BE-48.md)
- [architechture/tasks/BE-33.md](../../architechture/tasks/BE-33.md)
- [architechture/tasks/INT-65.md](../../architechture/tasks/INT-65.md)
- [frontend/nextjs/components/shipping](../../frontend/nextjs/components/shipping)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | INT-65/BE-48, config fixtures và expected amounts được business owner chốt. |
| Đầu ra / contract | Bộ boundary tests và báo cáo so API/checkout/order persisted fee. |
| Điểm giao tiếp / deliverable đã cam kết | Fee verified |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Bảng input mode/store/distance/unit/amount-base/config-default/override → expected fee/rounding. Dưới/đúng/trên free threshold và biên distance theo độ chính xác contract; không tự đặt threshold/rate hoặc hiểu subtotal sau discount khi chưa chốt.

## 4. Thứ tự thực hiện cụ thể

1. Nhận cấu hình/rule có phiên bản và owner ký expected: base/per-km/threshold/override precedence, pickup và invalid input.
2. Chuẩn bị store A override và B default, địa chỉ/distance synthetic theo nguồn đã duyệt; không gọi Maps/GPS ngoài scope.
3. Lập bảng boundary dưới/đúng/trên threshold, distance 0/biên/âm/thiếu và config invalid, expected rõ trước thực thi.
4. Mô tả gọi fee/preview qua contract thật rồi create Order, so response/total/persisted fee với expected độc lập.
5. Kiểm đổi quán/mode/address không reuse stale fee và invalid không fallback 0; override A không đổi B.
6. Ghi kết quả từng row với raw units/time/config version, bug/PIC và retest; không tự chạy endpoint/build/Docker trong lượt viết.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Phải chốt base amount trước/sau discount, distance unit và rounding trước tính expected; không tự đoán.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Shipping/Order chốt amount nền trước/sau voucher, unit/rounding và equality threshold. Chưa chốt expected thì case BLOCKED, không tự chọn rule để khớp output.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [INT-65](INT-65.md) | Lê Phú Thịnh | calculate-fee→order total và shipment CREATED→detail integration. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** Chưa có task khai báo phụ thuộc trong snapshot.

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Pickup và delivery default/override với input hợp lệ đã có expected | Fee API, preview và Order cùng expected theo config version |
| AC-02 | Đúng threshold | Kết quả theo policy đã duyệt |
| AC-03 | Store override | Không ảnh hưởng quán khác |
| AC-04 | Distance/config invalid | Không trả phí giả thành công |
| AC-05 | Input dưới/đúng/trên threshold và đổi A override sang B | Boundary đúng rule, B không nhận phí A, không stale response |
| AC-06 | Distance/config invalid hoặc upstream unavailable | Lỗi được biểu diễn, không trả 0/fee giả thành công |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Input config, expected/actual fee matrix và Order total reconciliation.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao boundary table kèm công thức/units/config được duyệt, trace fee-preview-order và kết quả NOT RUN trước khi người dùng kiểm thử.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [architechture/tasks/BE-48.md](../../architechture/tasks/BE-48.md)
- [architechture/tasks/BE-33.md](../../architechture/tasks/BE-33.md)
- [architechture/tasks/INT-65.md](../../architechture/tasks/INT-65.md)
- [frontend/nextjs/components/shipping](../../frontend/nextjs/components/shipping)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Lê Phú Thịnh
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 05/11/2026 08:00
**Deadline:** 05/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4555 / reczz28Rid5Xjrmv
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5Xjrmv
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 3 SP
**Time Estimated:** 3 giờ công
**Remaining Estimate:** 3 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
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
