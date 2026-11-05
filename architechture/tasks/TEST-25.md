# [TEST-25] Cloudinary valid image upload and URL/public_id persistence

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Nguyễn Duy Quang Nhật |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 05/11/2026 08:00 → 05/11/2026 23:59 |
| SP / giờ công dự kiến | 2 SP / 3 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Ảnh hợp lệ được upload thật và metadata vẫn tồn tại sau reload, không chỉ preview thành công.

## 2. Phạm vi

### Bao gồm

- E2E valid upload, URL/publicId persistence và replace consistency.
- Ảnh hợp lệ upload thành công, URL/publicId được lưu và UI đọc lại đúng.

### Không bao gồm

Không banner/avatar, không chỉ mock Cloudinary trong nghiệm thu tích hợp.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

INT-72/73 nối upload/form, BE-70/72/74 chịu server validation/persistence/cleanup; preview blob không chứng minh Cloudinary asset hoặc Catalog commit. Chỉ dùng cloud folder test owner cho phép.

- [architechture/tasks/INT-72.md](../../architechture/tasks/INT-72.md)
- [architechture/tasks/INT-73.md](../../architechture/tasks/INT-73.md)
- [architechture/tasks/BE-70.md](../../architechture/tasks/BE-70.md)
- [architechture/tasks/BE-72.md](../../architechture/tasks/BE-72.md)
- [architechture/tasks/BE-74.md](../../architechture/tasks/BE-74.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | INT-73, file ảnh hợp lệ theo policy và product/combo test IDs. |
| Đầu ra / contract | E2E valid upload, URL/publicId persistence và replace consistency. |
| Điểm giao tiếp / deliverable đã cam kết | Media integration test |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Fixture image MIME/content/bytes trong allowlist → auth upload → secureUrl/publicId → Catalog product/combo metadata → public reload. Replace cleanup chỉ sau commit; resource ID và asset ownership phải khớp, không xóa production để test.

## 4. Thứ tự thực hiện cụ thể

1. Nhận allowed MIME/max bytes, resource create/edit contract, cloud test folder và cleanup permissions; thiếu provider config ghi blocked.
2. Chuẩn bị ảnh synthetic hợp lệ và product/combo riêng của run, ghi file hash/size/MIME để tái hiện.
3. Mô tả upload từ UI qua Gateway có auth, so metadata response và asset thực theo quyền được phép, không chỉ object URL.
4. Save form rồi reload Admin/public trong context sạch, đối chiếu Catalog persisted secureUrl/publicId và ảnh đúng tài nguyên.
5. Replace một lần và thêm upload-success/save-failure, kiểm ảnh cũ còn dùng trước commit và cleanup/orphan theo policy.
6. Bàn giao trace/image metadata/readback và cleanup manifest chỉ assets của run; không thực hiện upload/xóa asset trong lượt viết.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt MIME/size dataset và cloud folder test; không tự xóa asset production để cleanup.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Media/Catalog/test chốt test folder, dataset và cleanup orphan/replaced. Chưa có quyền provider readback thì ghi giới hạn evidence, không tự xin rộng quyền hoặc xóa ảnh thật.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [INT-73](INT-73.md) | Nguyễn Duy Quang Nhật | Catalog media E2E upload→metadata commit→readback, error preservation. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** Chưa có task khai báo phụ thuộc trong snapshot.

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Ảnh hợp lệ upload và lưu product/combo rồi reload | Asset truy cập theo policy, secureUrl/publicId persisted; không phụ thuộc blob/cache local |
| AC-02 | Upload success | URL/publicId đúng tài nguyên và asset truy cập được |
| AC-03 | Reload | Không phụ thuộc blob local |
| AC-04 | Replace | Ảnh mới dùng được, cleanup ảnh cũ theo policy |
| AC-05 | Replace ảnh mới thành công | Metadata chuyển đúng asset, ảnh cũ cleanup sau commit theo policy |
| AC-06 | Upload thành công nhưng Catalog save thất bại | Ảnh cũ giữ nguyên, orphan có recovery/owner; UI không báo saved giả |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Upload requests, metadata readback và asset/render evidence đã mask.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao fixture manifest, upload-save-readback-cleanup evidence và asset IDs test, không lưu Cloudinary credentials.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [architechture/tasks/INT-72.md](../../architechture/tasks/INT-72.md)
- [architechture/tasks/INT-73.md](../../architechture/tasks/INT-73.md)
- [architechture/tasks/BE-70.md](../../architechture/tasks/BE-70.md)
- [architechture/tasks/BE-72.md](../../architechture/tasks/BE-72.md)
- [architechture/tasks/BE-74.md](../../architechture/tasks/BE-74.md)
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
**Mã Lark:** Mail-4646 / reczz28Rqzs2LFys
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rqzs2LFys
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 2 SP
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
