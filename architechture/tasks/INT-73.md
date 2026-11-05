# [INT-73] Tích hợp UI quản trị ảnh product/combo

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Nguyễn Duy Quang Nhật |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 03/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công dự kiến | 3 SP / 4 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Admin thay ảnh product/combo qua UI và thấy ảnh thật lưu lại sau reload/public menu.

## 2. Phạm vi

### Bao gồm

- Catalog media E2E upload→metadata commit→readback, error preservation.
- Nối Admin product/combo media UI với API; render URL/publicId sau lưu thành công.
- Banner chuyển sang BE-36 backlog.

### Không bao gồm

Không banner/avatar hoặc public upload tùy ý.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

ProductForm và backend MediaController/Cloudinary adapter đã có điểm bắt đầu; upload thành công chưa chứng minh Catalog lưu metadata. BE-72/74 và component INT-72 cần chốt commit/cleanup, nhất là create chưa có resource ID.

- [frontend/react/src/pages/Catalog/ProductForm.tsx](../../frontend/react/src/pages/Catalog/ProductForm.tsx)
- [backend/catalog-store-service](../../backend/catalog-store-service)
- [architechture/tasks/BE-72.md](../../architechture/tasks/BE-72.md)
- [architechture/tasks/BE-74.md](../../architechture/tasks/BE-74.md)
- [architechture/tasks/INT-72.md](../../architechture/tasks/INT-72.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | BE-72/74, INT-72 và Catalog form/detail. |
| Đầu ra / contract | Catalog media E2E upload→metadata commit→readback, error preservation. |
| Điểm giao tiếp / deliverable đã cam kết | Tích hợp UI quản trị ảnh product/combo |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Product/combo ID + upload metadata secureUrl/publicId → Catalog save/readback. Ảnh cũ chỉ cleanup sau commit theo policy; orphan asset khi upload success/save fail phải có owner/recovery. Không gửi client publicId tùy ý để xóa asset khác.

## 4. Thứ tự thực hiện cụ thể

1. Đối chiếu create/edit DTO ảnh và nhận uploader contract; chốt thứ tự resource create/upload/save trước khi nối.
2. Nối form product/combo với metadata server, không persist blob URL hoặc đường dẫn local của máy.
3. Save qua Catalog theo auth/role, pending/error giữ form; chỉ hiển thị saved sau response và readback cần thiết.
4. Reload Admin/public detail để chứng minh secureUrl/publicId persisted; kiểm ảnh đúng asset không phụ thuộc browser cache.
5. Replace giữ ảnh cũ tới khi metadata mới commit; cleanup backend retry theo policy, không xóa ảnh cũ trước save hoặc browser DELETE nội bộ.
6. Bàn giao upload success/save fail, cancel create, replace fail và wrong-role; đối chiếu cả asset và metadata không chỉ preview.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt upload khi product chưa có ID và xử lý hủy form tạo mới; không để orphan không có policy.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Catalog/Media/UI chốt target chưa có ID, orphan cleanup và timing delete; nếu cleanup chưa có thì ghi gap có owner, không xóa asset production để chứng minh.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-72](BE-72.md) | Nguyễn Duy Quang Nhật | POST catalog/products/{id}/image và combos/{id}/image, secureUrl/publicId persisted. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [INT-72](INT-72.md) | Nguyễn Duy Quang Nhật | Reusable upload UI cho Catalog với cancel/retry/loading và validation feedback. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [TEST-25](TEST-25.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Admin create/edit product và combo với ảnh, reload Admin/public | Đúng secureUrl/publicId persisted và ảnh tải từ asset thật, không blob local |
| AC-02 | Reload | Không chỉ còn blob URL local |
| AC-03 | Provider/commit lỗi | Ảnh cũ vẫn dùng được |
| AC-04 | Role không hợp lệ | Không thay metadata |
| AC-05 | Upload thành công nhưng Catalog commit lỗi hoặc hủy form mới | Ảnh cũ/metadata còn nguyên, orphan theo policy có trace, không báo saved |
| AC-06 | Replace ảnh hoặc actor trái quyền gửi metadata/publicId khác | Cleanup chỉ sau commit và đúng asset được phép, không đổi resource ngoài quyền |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Network/cloud asset/DB metadata/readback, invalid file và replace rollback.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao upload→commit→readback→cleanup timeline và orphan decision, phối hợp TEST-25/26 về provider evidence.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [frontend/react/src/pages/Catalog/ProductForm.tsx](../../frontend/react/src/pages/Catalog/ProductForm.tsx)
- [backend/catalog-store-service](../../backend/catalog-store-service)
- [architechture/tasks/BE-72.md](../../architechture/tasks/BE-72.md)
- [architechture/tasks/BE-74.md](../../architechture/tasks/BE-74.md)
- [architechture/tasks/INT-72.md](../../architechture/tasks/INT-72.md)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Nguyễn Duy Quang Nhật
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 03/11/2026 08:00
**Deadline:** 04/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4645 / reczz28Rqzs2KYcw
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rqzs2KYcw
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 3 SP
**Time Estimated:** 4 giờ công
**Remaining Estimate:** 4 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Tính phần nối contract, xử lý lỗi liên service/UI, fixture và evidence tích hợp; không triển khai lại API đã tính ở BE hoặc chạy lại bộ regression TEST.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../docs/backlog.md#quy-ước-ước-lượng).

Lịch cũ (30/10): 04/11/2026 08:00 → 05/11/2026 23:59. Lịch mới: 03/11/2026 08:00 → 04/11/2026 23:59. Giữ khung Sprint 2 02–08/11 để truy vết; hạn hoàn thành thực tế 05/11, Sprint Review 06/11, không xếp việc triển khai/nghiệm thu vào 06–08/11.

Bắt đầu có thể là chuẩn bị fixture/UI theo contract; phần cần API/event thật bị chặn cho đến khi dependency bàn giao. Nếu cùng ngày đến hạn, phải bàn giao prerequisite trước khi nghiệm thu task này; không coi deadline trùng ngày là bằng chứng đã sẵn sàng.

</details>

## Quy ước kiểm chứng

Việc cập nhật detail không chạy test, lint, typecheck, build, Docker hoặc trình duyệt. Checklist là điều kiện nghiệm thu để người phụ trách thực hiện, không phải báo cáo PASS. Giữ trạng thái snapshot, kể cả DONE; chưa xác nhận lại trên Lark.
