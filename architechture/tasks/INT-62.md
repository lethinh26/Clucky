# [INT-62] Tích hợp UI quản trị voucher thường (banner và duyệt chi nhánh để backlog)

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Cao Tất Thành |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 03/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công dự kiến | 3 SP / 4 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Admin tạo/sửa voucher thường từ UI và checkout dùng được voucher đúng scope.

## 2. Phạm vi

### Bao gồm

- Voucher admin UI→API→readback/checkout, xử lý validation và auth.
- UI voucher thường nối API; phần banner chuyển BE-36, phần approve chuyển BE-35 backlog.

### Không bao gồm

Banner BE-36 và approve BE-35 giữ backlog; không kích hoạt màn placeholder như feature xong.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

VoucherService và Customer promotion helper đã có; phần UI-28 cần nhận bàn giao form voucher thường. Banner BE-36 và duyệt đề xuất BE-35 vẫn backlog, không kích hoạt placeholder như tính năng đã xong.

- [backend/promotion-loyalty-service](../../backend/promotion-loyalty-service)
- [frontend/nextjs/lib/promotion.ts](../../frontend/nextjs/lib/promotion.ts)
- [architechture/tasks/UI-28.md](../../architechture/tasks/UI-28.md)
- [architechture/tasks/BE-34.md](../../architechture/tasks/BE-34.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | BE-34, phần voucher thường UI-28 và available/validate contract. |
| Đầu ra / contract | Voucher admin UI→API→readback/checkout, xử lý validation và auth. |
| Điểm giao tiếp / deliverable đã cam kết | Tích hợp UI quản trị voucher thường (banner và duyệt chi nhánh để backlog) |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Admin voucher code/type/value/limit/time/scope ALL hoặc STORE và store IDs theo DTO đã duyệt. Create/edit→readback→available/validate→preview cùng voucher ID; không gộp proposal approval hoặc banner contract.

## 4. Thứ tự thực hiện cụ thể

1. Nhận form UI-28 và đối chiếu DTO/validation BE-34, ghi field thời gian/timezone/scope bắt buộc.
2. Chuẩn bị voucher ALL, STORE A, expired, quota exhausted và duplicate code theo policy; không sửa coupon đang dùng thật.
3. Nối create/edit/list qua Gateway với Admin role, lỗi giữ form và message theo code; không local insert giả success.
4. Reload voucher rồi gọi available/validate bằng Customer đủ/không đủ điều kiện; không dựa việc xuất hiện trong list là chắc apply được.
5. Nối preview Order cùng contract INT-10, loại fallback mock khi API lỗi; state expired/quota thay đổi phải phản ánh server.
6. Bàn giao scope/time/limit boundaries và Manager/Staff gọi CRUD trái quyền; đánh dấu rõ banner/proposal ngoài scope.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Bổ sung handoff UI-28, tách phần voucher thường khỏi banner/proposal.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Promotion/UI chốt timezone/limit/stacking và handoff UI-28. Không thêm lifecycle approve cho voucher thường hoặc đổi backlog BE-35/36 thành done.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-34](BE-34.md) | Cao Tất Thành | Validate/available/CRUD voucher thường, discount và lỗi hết hạn/hết lượt/sai scope. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [TEST-06](TEST-06.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Admin tạo voucher STORE A, reload và Customer A validate/preview | Field persisted đúng, discount theo server và chỉ trong điều kiện được duyệt |
| AC-02 | Form sai | Hiển thị field/code lỗi, không đóng mất input |
| AC-03 | Voucher STORE dùng ngoài quán | Bị từ chối |
| AC-04 | Save success rồi reload | Rule đã lưu đúng |
| AC-05 | Customer dùng voucher A ở B hoặc qua hạn/quota | Bị từ chối, không giữ discount mock hoặc total stale |
| AC-06 | Save lỗi/duplicate code hoặc Manager gọi Admin CRUD | Không success giả/trái quyền, form có hướng sửa |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Admin CRUD/readback và checkout eligibility cases của voucher vừa tạo.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao form-to-DTO map và create/readback/validate/preview traces, phạm vi banner/proposal vẫn backlog.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [backend/promotion-loyalty-service](../../backend/promotion-loyalty-service)
- [frontend/nextjs/lib/promotion.ts](../../frontend/nextjs/lib/promotion.ts)
- [architechture/tasks/UI-28.md](../../architechture/tasks/UI-28.md)
- [architechture/tasks/BE-34.md](../../architechture/tasks/BE-34.md)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Cao Tất Thành
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 03/11/2026 08:00
**Deadline:** 04/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4634 / reczz28Rqzs2MaZx
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rqzs2MaZx
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 3 SP
**Time Estimated:** 4 giờ công
**Remaining Estimate:** 4 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Tính phần nối contract, xử lý lỗi liên service/UI, fixture và evidence tích hợp; không triển khai lại API đã tính ở BE hoặc chạy lại bộ regression TEST.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../docs/backlog.md#quy-ước-ước-lượng).

Lịch cũ (30/10): 04/11/2026 08:00 → 06/11/2026 23:59. Lịch mới: 03/11/2026 08:00 → 04/11/2026 23:59. Giữ khung Sprint 2 02–08/11 để truy vết; hạn hoàn thành thực tế 05/11, Sprint Review 06/11, không xếp việc triển khai/nghiệm thu vào 06–08/11.

Bắt đầu có thể là chuẩn bị fixture/UI theo contract; phần cần API/event thật bị chặn cho đến khi dependency bàn giao. Nếu cùng ngày đến hạn, phải bàn giao prerequisite trước khi nghiệm thu task này; không coi deadline trùng ngày là bằng chứng đã sẵn sàng.

</details>

## Quy ước kiểm chứng

Việc cập nhật detail không chạy test, lint, typecheck, build, Docker hoặc trình duyệt. Checklist là điều kiện nghiệm thu để người phụ trách thực hiện, không phải báo cáo PASS. Giữ trạng thái snapshot, kể cả DONE; chưa xác nhận lại trên Lark.
