# [INT-54] Catalog → Gateway discovery integration: menu route, cache headers, availability

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Nguyễn Duy Quang Nhật |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 03/11/2026 08:00 → 03/11/2026 23:59 |
| SP / giờ công dự kiến | 3 SP / 4 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Menu API đi qua Gateway→Eureka→Catalog đúng route, cache headers và store availability.

## 2. Phạm vi

### Bao gồm

- Public catalog discovery integration không hardcode business service URL ở frontend.
- Menu đi Gateway → Eureka → Catalog; cache header/availability theo store.

### Không bao gồm

Không bypass Gateway để frontend gọi trực tiếp Catalog.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Gateway có route lb://CATALOG-STORE-SERVICE và Config import; Next adapter có server/browser base URLs. Không cần hardcode Catalog port để sửa discovery, cần đối chiếu registry/service ID và prefix thật.

- [config-repo/api-gateway.yml](../../config-repo/api-gateway.yml)
- [backend/catalog-store-service](../../backend/catalog-store-service)
- [backend/discovery-server](../../backend/discovery-server)
- [frontend/nextjs/lib/api.ts](../../frontend/nextjs/lib/api.ts)
- [architechture/tasks/BE-54.md](../../architechture/tasks/BE-54.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | BE-20, Gateway route, Eureka registration và Catalog cache contract. |
| Đầu ra / contract | Public catalog discovery integration không hardcode business service URL ở frontend. |
| Điểm giao tiếp / deliverable đã cam kết | Discovery integration |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Gateway method/path/query/storeId → Eureka service ID → Catalog controller, response cache headers/error/correlation. Rewrite prefix chỉ khi contract yêu cầu; cache key/header không làm lẫn availability giữa store A/B.

## 4. Thứ tự thực hiện cụ thể

1. Đọc bootstrap Config/Eureka/Catalog/Gateway, ghi đúng startup order và service registration name, không chạy stack trong lần viết detail.
2. Lập bảng public catalog list/detail/category/store predicates và controller paths; giữ method/query khi proxy.
3. Chốt URL Gateway cho Next SSR/browser và React, không dùng địa chỉ container trong browser hoặc gọi business service trực tiếp.
4. Nối cache header/freshness với BE-54, kiểm storeId tồn tại xuyên proxy; không dùng shared response của A cho B.
5. Soạn tình huống Catalog restart/thay instance/unavailable, phân biệt discovery lỗi với auth/path lỗi.
6. Bàn giao request/response headers và registry evidence cho người dùng kiểm chứng; không coi UI mock trả được là routing thành công.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt cache headers/rewrite prefix với Gateway; freshness phối hợp BE-54.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Gateway/Catalog chốt prefix/cache headers và service ID. Thiếu registry readiness thì ghi blocked network case, không thay lb route bằng URL cố định để né lỗi.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-20](BE-20.md) | Nguyễn Duy Quang Nhật | Stores/categories/products/combos/search và detail DTO cho menu lẫn Order kiểm tra giá/availability. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [UI-05](UI-05.md) | Trần Đức Anh | Gateway app và routes lb:// cho các domain hiện có. | Trước chạy môi trường tích hợp; có thể soạn cấu hình/contract trước, chưa được ghi runtime đạt. |
| [UI-04](UI-04.md) | Nguyễn Duy Quang Nhật | Discovery Server và Eureka client config mẫu. | Trước chạy môi trường tích hợp; có thể soạn cấu hình/contract trước, chưa được ghi runtime đạt. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [DEP-09](DEP-09.md), [INT-06](INT-06.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Gọi list/detail Catalog theo store qua Gateway và instance đã đăng ký | Đúng controller, query/storeId giữ nguyên, correlation/cache headers theo contract |
| AC-02 | Instance Catalog thay đổi | Gateway vẫn resolve đúng registry |
| AC-03 | Store filter | Không mất trong proxy |
| AC-04 | Catalog unavailable | Lỗi rõ, không mock response |
| AC-05 | Thay instance Catalog mà FE config không đổi | Gateway resolve registry, không cần FE biết host/cổng business service |
| AC-06 | Catalog unavailable hoặc A/B cache khác availability | Lỗi rõ không mock, response không dùng lẫn cache quán |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Gateway route request/response, instance resolution và error/cache header evidence.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao route/service-ID/header matrix và failure diagnosis, phối hợp INT-06 thay vì tạo adapter Catalog thứ hai.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [config-repo/api-gateway.yml](../../config-repo/api-gateway.yml)
- [backend/catalog-store-service](../../backend/catalog-store-service)
- [backend/discovery-server](../../backend/discovery-server)
- [frontend/nextjs/lib/api.ts](../../frontend/nextjs/lib/api.ts)
- [architechture/tasks/BE-54.md](../../architechture/tasks/BE-54.md)
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
**Mã Lark:** Mail-4626 / reczz28Rqzs2KErV
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rqzs2KErV
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 3 SP
**Time Estimated:** 4 giờ công
**Remaining Estimate:** 4 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
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
