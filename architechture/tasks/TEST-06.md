# [TEST-06] E2E Admin: store → product → voucher thường

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Nguyễn Duy Quang Nhật |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 05/11/2026 08:00 → 05/11/2026 23:59 |
| SP / giờ công dự kiến | 3 SP / 4 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Admin tạo chi nhánh/món/voucher thường và khách thấy dữ liệu đúng khi mua hàng.

## 2. Phạm vi

### Bao gồm

- E2E CRUD→public menu→voucher validate với record thật.
- Admin tạo store/product/voucher thường và kiểm tra hiển thị; approve chi nhánh nằm BE-35 backlog.

### Không bao gồm

Không proposal approval/banner Phase 2, không seed DB thay các bước CRUD cần kiểm chứng.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Admin Catalog có controller/form thật, voucher thường cần INT-62; banner/proposal vẫn backlog. Nghiệm thu qua request/save/readback, không tạo seed trực tiếp DB rồi chụp UI thay flow Admin.

- [architechture/tasks/INT-15.md](../../architechture/tasks/INT-15.md)
- [architechture/tasks/INT-62.md](../../architechture/tasks/INT-62.md)
- [architechture/tasks/BE-21.md](../../architechture/tasks/BE-21.md)
- [architechture/tasks/BE-34.md](../../architechture/tasks/BE-34.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | Admin, menu/store mới, INT-15/62 và customer context. |
| Đầu ra / contract | E2E CRUD→public menu→voucher validate với record thật. |
| Điểm giao tiếp / deliverable đã cam kết | E2E Admin: store → product → voucher thường |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Test dataset store/product/options/combo theo phạm vi và voucher ALL/STORE, active/time/quota hợp lệ. Expected menu/preview từ contract backend; không mở BE-35/36 hoặc tự đặt stacking/discount formula.

## 4. Thứ tự thực hiện cụ thể

1. Ghi readiness Admin CRUD/voucher/preview và test naming để chỉ cleanup record của run, không sửa dữ liệu thật.
2. Chuẩn bị Admin cùng hai store và product/options fixture; ghi expected fields/IDs sau tạo.
3. Mô tả create/edit store/product qua form, reload admin/public menu và kiểm cache freshness theo contract.
4. Mô tả tạo voucher thường ALL/STORE, reload rồi validate/preview đơn đúng quán và sai quán.
5. Thêm invalid product/option reference/voucher time-limit, duplicate code và save lỗi; kiểm không có record nửa vời/success giả.
6. Bàn giao screenshot/network/readback/tổng preview đã mask, bug/PIC và retest; cleanup không xóa asset hoặc record ngoài dataset được phép.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt dataset và cleanup để không xóa dữ liệu người dùng; chỉ voucher thường trong sprint.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Catalog/Promotion/test chốt fixture, allowed mutations và cleanup, giới hạn chỉ voucher thường. Đừng coi banner placeholder là phần bắt buộc của sprint.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [INT-15](INT-15.md) | Nguyễn Duy Quang Nhật | CRUD/store operation/inventory integration với validation và scope. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-62](INT-62.md) | Cao Tất Thành | Voucher admin UI→API→readback/checkout, xử lý validation và auth. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [DEP-10](DEP-10.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Admin tạo store/product và voucher thường rồi Customer browse/preview | Record persisted đúng, menu phản ánh và discount theo backend |
| AC-02 | Admin save thành công | Public/readback đúng record |
| AC-03 | Voucher STORE ở quán khác | Không giảm tiền |
| AC-04 | Invalid product/voucher | Không tạo record nửa vời |
| AC-05 | Voucher STORE A dùng tại B hoặc đã hết điều kiện | Không giảm giá sai và không dùng fallback mock |
| AC-06 | Form invalid hoặc request save thất bại | Không có dữ liệu nửa vời, giữ form/lỗi đúng; không báo thành công từ local row |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: IDs/requests cho store/product/voucher và bảng total trước/sau áp mã.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao chain IDs store/product/voucher/preview và expected-vs-actual, phạm vi banner/proposal loại trừ rõ, chưa chạy test.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [architechture/tasks/INT-15.md](../../architechture/tasks/INT-15.md)
- [architechture/tasks/INT-62.md](../../architechture/tasks/INT-62.md)
- [architechture/tasks/BE-21.md](../../architechture/tasks/BE-21.md)
- [architechture/tasks/BE-34.md](../../architechture/tasks/BE-34.md)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Nguyễn Duy Quang Nhật
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 05/11/2026 08:00
**Deadline:** 05/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4549 / reczz28Rid5XlC0j
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5XlC0j
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 3 SP
**Time Estimated:** 4 giờ công
**Remaining Estimate:** 4 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
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
