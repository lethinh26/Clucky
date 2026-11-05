# [INT-72] Component upload/preview/progress/lỗi dùng chung; áp dụng product/combo

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Nguyễn Duy Quang Nhật |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 03/11/2026 08:00 → 03/11/2026 23:59 |
| SP / giờ công dự kiến | 5 SP / 6 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Form ảnh product/combo có component upload thể hiện preview/progress/error nhưng chỉ coi ảnh đã lưu khi server xác nhận.

## 2. Phạm vi

### Bao gồm

- Reusable upload UI cho Catalog với cancel/retry/loading và validation feedback.
- Component upload có preview/progress/failure cho product/combo; không chứa secret.
- Avatar/banner được chuyển backlog theo INT-03/BE-36; không tính chung là hoàn thành sprint.

### Không bao gồm

Avatar/banner ở backlog, không bundle Cloudinary API_SECRET.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Catalog ProductForm hiện có nhưng chưa thấy file component upload riêng trong danh sách source. MediaController hiện lộ DELETE ADMIN trong khi docs ghi delete nội bộ; upload contract BE-70/71 cần đối chiếu, không gọi Cloudinary trực tiếp từ browser.

- [frontend/react/src/pages/Catalog/ProductForm.tsx](../../frontend/react/src/pages/Catalog/ProductForm.tsx)
- [backend/catalog-store-service/src/main/java/com/clucky/catalogstoreservice/controller/MediaController.java](../../backend/catalog-store-service/src/main/java/com/clucky/catalogstoreservice/controller/MediaController.java)
- [architechture/tasks/BE-70.md](../../architechture/tasks/BE-70.md)
- [architechture/tasks/BE-71.md](../../architechture/tasks/BE-71.md)
- [architechture/tasks/INT-73.md](../../architechture/tasks/INT-73.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | File, resource context, BE-71 upload contract và response metadata. |
| Đầu ra / contract | Reusable upload UI cho Catalog với cancel/retry/loading và validation feedback. |
| Điểm giao tiếp / deliverable đã cam kết | Component upload/preview/progress/lỗi dùng chung; áp dụng product/combo |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Component nhận allowed MIME/max bytes từ contract, file/target context/auth → Gateway multipart → secureUrl/publicId metadata cho parent. Local blob preview khác uploaded asset và saved Catalog; progress chỉ hiển thị phần trăm khi transport có số byte thật.

## 4. Thứ tự thực hiện cụ thể

1. Nhận endpoint/field/resource requirements từ BE-70/71 và kiểm ProductForm call site; dùng dependency upload/HTTP có sẵn, không thêm framework.
2. Tạo/hoàn thiện component nhỏ dùng chung product/combo, parent sở hữu save metadata; không nhúng business API CRUD vào generic uploader.
3. Validate file client để feedback sớm, backend vẫn validate MIME/content/size; không dùng extension check làm bảo mật.
4. Quản lý local preview/blob lifecycle, đổi file/cancel/unmount bỏ response stale và revoke URL khi hết dùng.
5. Upload qua Gateway có auth, pending/error/retry rõ; dùng indeterminate khi không có upload progress, không chạy timer phần trăm giả.
6. Bàn giao metadata callback và cases valid/invalid/cancel/failure, parent không đánh saved trước Catalog commit; cleanup asset theo policy INT-73.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt transport/progress và giới hạn file từ BE-71; không fake phần trăm progress không có dữ liệu.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC UI + Media chốt transport/progress, limits và contract target chưa có ID. Không tự mở DELETE media từ browser để cleanup trái boundary nội bộ.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-71](BE-71.md) | Nguyễn Duy Quang Nhật | Contract upload có auth, MIME/size validation và chữ ký có hạn khi dùng signed flow. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [INT-73](INT-73.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Chọn ảnh hợp lệ, preview rồi upload thành công | Callback trả metadata server, UI phân biệt uploaded với saved; không chứa provider secret |
| AC-02 | File invalid | UI cảnh báo, backend vẫn kiểm tra |
| AC-03 | Cancel/đổi file nhanh | Response cũ không ghi đè preview mới |
| AC-04 | Upload fail | Không đánh dấu đã lưu |
| AC-05 | Chọn A rồi B nhanh/cancel và response A đến muộn | A không ghi đè preview/metadata B, blob URL được giải phóng đúng vòng đời |
| AC-06 | Invalid MIME/oversize hoặc upload 4xx/network lỗi | Thông báo đúng, không đánh saved; backend vẫn chặn khi client validation bị bypass |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: File state machine, retry/cancel/stale response và accessible input.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao props/callback/state contract và race/progress evidence cho INT-73; giới hạn MIME/size không tự đặt để pass.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [frontend/react/src/pages/Catalog/ProductForm.tsx](../../frontend/react/src/pages/Catalog/ProductForm.tsx)
- [backend/catalog-store-service/src/main/java/com/clucky/catalogstoreservice/controller/MediaController.java](../../backend/catalog-store-service/src/main/java/com/clucky/catalogstoreservice/controller/MediaController.java)
- [architechture/tasks/BE-70.md](../../architechture/tasks/BE-70.md)
- [architechture/tasks/BE-71.md](../../architechture/tasks/BE-71.md)
- [architechture/tasks/INT-73.md](../../architechture/tasks/INT-73.md)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Nguyễn Duy Quang Nhật
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 03/11/2026 08:00
**Deadline:** 03/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4644 / reczz28Rqzs2Mz76
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rqzs2Mz76
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 5 SP
**Time Estimated:** 6 giờ công
**Remaining Estimate:** 6 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Tính phần nối contract, xử lý lỗi liên service/UI, fixture và evidence tích hợp; không triển khai lại API đã tính ở BE hoặc chạy lại bộ regression TEST.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../docs/backlog.md#quy-ước-ước-lượng).

Lịch cũ (30/10): 04/11/2026 08:00 → 04/11/2026 23:59. Lịch mới: 03/11/2026 08:00 → 03/11/2026 23:59. Giữ khung Sprint 2 02–08/11 để truy vết; hạn hoàn thành thực tế 05/11, Sprint Review 06/11, không xếp việc triển khai/nghiệm thu vào 06–08/11.

Bắt đầu có thể là chuẩn bị fixture/UI theo contract; phần cần API/event thật bị chặn cho đến khi dependency bàn giao. Nếu cùng ngày đến hạn, phải bàn giao prerequisite trước khi nghiệm thu task này; không coi deadline trùng ngày là bằng chứng đã sẵn sàng.

</details>

## Quy ước kiểm chứng

Việc cập nhật detail không chạy test, lint, typecheck, build, Docker hoặc trình duyệt. Checklist là điều kiện nghiệm thu để người phụ trách thực hiện, không phải báo cáo PASS. Giữ trạng thái snapshot, kể cả DONE; chưa xác nhận lại trên Lark.
