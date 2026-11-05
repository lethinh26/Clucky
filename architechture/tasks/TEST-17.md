# [TEST-17] Responsive test toàn bộ

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Nguyễn Duy Quang Nhật |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 05/11/2026 08:00 → 05/11/2026 23:59 |
| SP / giờ công dự kiến | 5 SP / 6 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Các màn đã tích hợp API thật vẫn dùng được từ 360–1440px với dữ liệu và lỗi thực tế.

## 2. Phạm vi

### Bao gồm

- Responsive regression report và bugs theo domain/PIC.
- Responsive 360–1440px sau tích hợp dữ liệu thật; khác checklist UI mock ở Sprint 1.

### Không bao gồm

Không chứng nhận mọi trình duyệt từ một Chromium run; không thay backend E2E.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Hai app có responsive layout/shared components, nhưng Sprint 2 yêu cầu flow dùng backend thật và state lỗi, không chỉ ảnh fixture UI Sprint 1. UI-34 là đầu vào viewport/brand cần nhận, không tự thêm browser matrix mới.

- [frontend/nextjs/app](../../frontend/nextjs/app)
- [frontend/react/src/layouts/AdminLayout.tsx](../../frontend/react/src/layouts/AdminLayout.tsx)
- [frontend/react/src/components/ui](../../frontend/react/src/components/ui)
- [architechture/tasks/UI-34.md](../../architechture/tasks/UI-34.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | Routes/roles tích hợp, viewport matrix, dữ liệu dài/empty/error/loading. |
| Đầu ra / contract | Responsive regression report và bugs theo domain/PIC. |
| Điểm giao tiếp / deliverable đã cam kết | UI report |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Matrix app/role/route/state × browser/viewport đã duyệt; dữ liệu tên/địa chỉ dài, locale vi/en, table/modal/drawer và keyboard. Mỗi issue ghi viewport exact, bước tái hiện, expected action truy cập được.

## 4. Thứ tự thực hiện cụ thể

1. Nhận browser/viewport mục tiêu và route inventory theo role; phân biệt chưa có backend với lỗi responsive.
2. Chuẩn bị data thật trong môi trường test với long text, empty/error/pending và permission states, che PII trên ảnh.
3. Lập hành trình Customer auth/menu/cart/checkout/orders và Admin/Manager/Staff list/form/detail theo phạm vi được duyệt.
4. Kiểm theo kế hoạch overflow, table scroll, sticky/footer overlay, mobile keyboard, zoom và action không bị che; không chỉ chụp desktop thu nhỏ.
5. Kiểm focus entry/return modal/drawer, Tab/Escape, label/error và vi/en dài; API error vẫn có retry dùng được trên màn nhỏ.
6. Bàn giao screenshot trước/sau và bug/PIC/retest theo viewport; không tự bật browser/backend trong lượt tài liệu.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt browser/viewport chi tiết với UI-34; khác UI fixture review Sprint 1.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC UI/test chốt matrix với UI-34, font theo instruction/brand owner khi lệch. Không tuyên bố mọi thiết bị được hỗ trợ từ vài screenshot fixture.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [INT-05](INT-05.md) | Trần Nguyễn Hữu Khánh | Luồng auth hai app với JWT/refresh thật, register/OTP chỉ Customer. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-06](INT-06.md) | Nguyễn Duy Quang Nhật | Browse/search/filter/detail nối API thay mock trong phạm vi tích hợp. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-08](INT-08.md) | Trần Đức Anh | Lịch sử/chi tiết/hủy/đặt lại đồng bộ qua API theo owner. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-09](INT-09.md) | Lê Phú Thịnh | QR thật→đối soát→payment PAID→Order CONFIRMED; COD thu đúng role/store. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-11](INT-11.md) | Cao Tất Thành | Notification API integration, read/read-all/count và target navigation. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** Chưa có task khai báo phụ thuộc trong snapshot.

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Flow backend thật trên các viewport/browser đã chốt, cả hai app | Không mất nội dung/action, UI state và quyền đúng, evidence ghi viewport |
| AC-02 | Long product/address | Không che action hoặc tràn ngang |
| AC-03 | API error trên mobile | Vẫn có retry/validation đọc được |
| AC-04 | Modal/drawer | Action/close keyboard truy cập được |
| AC-05 | Tên/địa chỉ dài, vi/en và API error trên màn nhỏ | Không tràn che CTA, validation/retry đọc và dùng được |
| AC-06 | Mở form modal/drawer bằng keyboard rồi đóng | Focus/control truy cập được, không kẹt nền hoặc mất nút save/close |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Route×role×viewport coverage, screenshot/error case và issue/retest references.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao route-state-viewport matrix và ảnh đã mask kèm repro, không chạy visual/browser tests trong lần viết này.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [frontend/nextjs/app](../../frontend/nextjs/app)
- [frontend/react/src/layouts/AdminLayout.tsx](../../frontend/react/src/layouts/AdminLayout.tsx)
- [frontend/react/src/components/ui](../../frontend/react/src/components/ui)
- [architechture/tasks/UI-34.md](../../architechture/tasks/UI-34.md)
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
**Mã Lark:** Mail-4560 / reczz28Rid5XhRgH
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5XhRgH
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
