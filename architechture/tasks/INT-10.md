# [INT-10] Voucher apply + loyalty points E2E

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Cao Tất Thành |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 04/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công dự kiến | 5 SP / 8 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Voucher và điểm đi từ UI đến preview/order/loyalty thật mà không trừ hoặc cộng lặp.

## 2. Phạm vi

### Bao gồm

- Apply/remove voucher, redeem và earn sau completed theo đúng owner/store.
- Bàn giao theo phạm vi gốc: Promotion works.

### Không bao gồm

Không proposal/banner/loyalty rules chưa được duyệt.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

lib/promotion.ts có fetch Gateway nhưng cũng có fallback mock vouchers/guest preview. Cần tách demo khỏi đường nghiệm thu; UI total không phải nguồn chuẩn cho voucher hay điểm.

- [frontend/nextjs/lib/promotion.ts](../../frontend/nextjs/lib/promotion.ts)
- [frontend/nextjs/app/checkout/page.tsx](../../frontend/nextjs/app/checkout/page.tsx)
- [architechture/tasks/BE-34.md](../../architechture/tasks/BE-34.md)
- [architechture/tasks/BE-37.md](../../architechture/tasks/BE-37.md)
- [architechture/tasks/BE-24.md](../../architechture/tasks/BE-24.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | UI-22/45, BE-34/37/24 và consumer INT-44. |
| Đầu ra / contract | Apply/remove voucher, redeem và earn sau completed theo đúng owner/store. |
| Điểm giao tiếp / deliverable đã cam kết | Promotion works |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Voucher code/scope/storeId, customer balance, redeem input → server preview discount/points/total → usage/ledger theo orderId/eventId. Chốt reserve/redeem/release và rounding với BE, không lấy công thức frontend làm chuẩn.

## 4. Thứ tự thực hiện cụ thể

1. Đối chiếu voucher available/validate và loyalty/me với preview Order; ghi nơi fallback mock cần loại khỏi real flow.
2. Chuẩn bị voucher ALL, STORE A, hết hạn/hết quota và customer đủ/thiếu điểm; không sửa điểm tài khoản thật.
3. Nối chọn voucher/điểm vào preview, bỏ response cũ khi đổi quán hoặc input; lỗi phải xóa hiệu lực discount cũ chứ không giả apply success.
4. Nối create-order và đối chiếu usage/ledger, reload số dư từ server; không trừ điểm hai lần vì cả UI và consumer xử lý.
5. Theo completed event để đối chiếu earn đúng một lần; cancel/release chỉ làm sau khi policy được owner chốt.
6. Bàn giao race hai đơn dùng số dư/quota cuối và event replay, cùng evidence balances trước/sau và order linkage.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt reserve/redeem/release với M3/M5 trước các case hủy; không tự dùng công thức UI.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Order + Promotion/Loyalty chốt thời điểm reserve/redeem/release, stacking và rounding. API lỗi không được rơi về mock hợp lệ; cancel chưa chốt phải ghi blocked riêng.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-34](BE-34.md) | Cao Tất Thành | Validate/available/CRUD voucher thường, discount và lỗi hết hạn/hết lượt/sai scope. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-37](BE-37.md) | Cao Tất Thành | Loyalty me/history/config, earn/redeem và contract bù trừ cho Order saga. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [INT-44](INT-44.md) | Cao Tất Thành | Consumer earn points với ledger/idempotency và correlation. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [BE-24](BE-24.md) | Trần Đức Anh | POST orders/preview với subtotal/discount/points/shipping/total và lỗi nghiệp vụ từ domain liên quan. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** Chưa có task khai báo phụ thuộc trong snapshot.

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Voucher đúng quán và điểm hợp lệ → preview → submit → completed | Breakdown từ server, usage/redeem/earn đúng order và đúng một lần |
| AC-02 | Voucher sai quán | UI hiển thị lỗi đúng, không discount giả |
| AC-03 | Replay completed | Balance không tăng thêm |
| AC-04 | Điểm không đủ tại submit | Không giữ total preview như đã thành công |
| AC-05 | Đổi sang quán B với voucher STORE A, hoặc điểm bị dùng bởi đơn khác trước submit | Server từ chối theo contract, UI không giữ tổng đã giảm như đơn thành công |
| AC-06 | Replay completed cùng event/order | Balance/ledger không cộng lặp; trace thể hiện dedup |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Preview/order totals và ledger/usage trước-sau có eventId.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao bảng preview-vs-persisted usage/ledger, fixture scope/quota và quyết định lifecycle; không dùng mock voucher khi backend thất bại.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [frontend/nextjs/lib/promotion.ts](../../frontend/nextjs/lib/promotion.ts)
- [frontend/nextjs/app/checkout/page.tsx](../../frontend/nextjs/app/checkout/page.tsx)
- [architechture/tasks/BE-34.md](../../architechture/tasks/BE-34.md)
- [architechture/tasks/BE-37.md](../../architechture/tasks/BE-37.md)
- [architechture/tasks/BE-24.md](../../architechture/tasks/BE-24.md)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Cao Tất Thành
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 04/11/2026 08:00
**Deadline:** 04/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4593 / reczz28Rqn97UPKw
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rqn97UPKw
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
