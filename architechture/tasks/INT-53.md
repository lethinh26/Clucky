# [INT-53] Identity → Gateway security integration: JWT claims, role, storeId propagation

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Trần Nguyễn Hữu Khánh |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 03/11/2026 08:00 → 03/11/2026 23:59 |
| SP / giờ công dự kiến | 8 SP / 8 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

JWT do Identity phát được Gateway và từng service xác minh, role/storeId không bị mất hay tin header giả.

## 2. Phạm vi

### Bao gồm

- Security integration login→Gateway→service, auth/authorization error contract nhất quán.
- JWT role/storeId đi qua Gateway và được từng service kiểm tra; chặn token thiếu/sai/hết hạn.
- Gộp phần route/discovery smoke của DEP-15; collection tổng hợp nằm DEP-09.

### Không bao gồm

Không backend policy cụ thể của mọi endpoint thay INT-67; collection tổng hợp ở DEP-09.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Gateway SecurityConfig đã kiểm tra issuer/audience/JWT key, revocation qua Redis và deny internal/webhook paths. Identity auth transport dùng HttpOnly refresh cookie; cần nối cấu hình/claims thật, không thay matcher bằng permitAll để chạy được.

- [backend/api-gateway/src/main/java/com/clucky/apigateway/config/SecurityConfig.java](../../backend/api-gateway/src/main/java/com/clucky/apigateway/config/SecurityConfig.java)
- [backend/identity-service](../../backend/identity-service)
- [config-repo/api-gateway.yml](../../config-repo/api-gateway.yml)
- [architechture/tasks/BE-17.md](../../architechture/tasks/BE-17.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | BE-09/17, Gateway routes, JWT claims và actor fixtures. |
| Đầu ra / contract | Security integration login→Gateway→service, auth/authorization error contract nhất quán. |
| Điểm giao tiếp / deliverable đã cam kết | Security integration |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

issuer/audience/expiry/session claims, role/storeId từ JWT → Gateway → service trust boundary; public allowlist theo method/path. Refresh/logout cookie không bắt Bearer trái docs; X-Role/X-User/store headers client không là nguồn quyền.

## 4. Thứ tự thực hiện cụ thể

1. Đối chiếu Identity token generation và validators ở Gateway/service; cấu hình qua Config Server/env, không ghi JWT secret vào repo.
2. Lập route public/auth/internal và service-to-service/webhook exception với owner; không publish endpoint nội bộ cho browser.
3. Chuẩn bị token thật từng role cùng expired/wrong issuer/audience/tampered fixture an toàn; không log token values.
4. Nối Bearer forwarding và correlation, xử lý 401/403 cùng error shape; service kiểm tra quyền riêng không tin header tự khai.
5. Đối chiếu CORS credentials/refresh cookie và logout revocation, lỗi Redis theo policy bảo mật; không bypass kiểm tra khi dependency down.
6. Bàn giao route/discovery smoke gộp DEP-15 và tamper matrix cho INT-67; collection tổng hợp giao DEP-09.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt S2S auth và webhook ingress riêng với owner domain; denyAll hiện có không thể được bỏ bằng permitAll hàng loạt.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Identity/Gateway/domain chốt S2S auth, webhook ingress và policy session dependency lỗi. JWT hợp lệ không chứng minh endpoint RBAC đúng; INT-67 kiểm từng API.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-09](BE-09.md) | Trần Nguyễn Hữu Khánh | Security filter, current actor và cơ chế kiểm tra ownership/store có thể dùng trong endpoint nghiệp vụ. | Chốt contract/cấu hình trước khi viết phần phụ thuộc; nghiệm thu bằng bản upstream đã bàn giao. |
| [BE-17](BE-17.md) | Trần Nguyễn Hữu Khánh | API login/refresh/logout/forgot-password/reset-password và JWT có role/storeId theo actor. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [UI-05](UI-05.md) | Trần Đức Anh | Gateway app và routes lb:// cho các domain hiện có. | Trước chạy môi trường tích hợp; có thể soạn cấu hình/contract trước, chưa được ghi runtime đạt. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [DEP-09](DEP-09.md), [INT-05](INT-05.md), [INT-07](INT-07.md), [INT-67](INT-67.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Login Identity rồi gọi public/protected route qua Gateway bằng role hợp lệ | Đúng route, protected nhận actor/store từ token và public vẫn truy cập theo allowlist |
| AC-02 | Token thiếu/sai/hết hạn | Không tới nghiệp vụ thành công |
| AC-03 | Client giả X-Role/store header | Không nâng quyền |
| AC-04 | Endpoint public | Không bị vô tình bắt đăng nhập |
| AC-05 | Token sai/hết hạn/thu hồi hoặc client thêm X-Role=ADMIN | Không nâng quyền hoặc thành công nghiệp vụ, error không lộ token/secret |
| AC-06 | Refresh/logout bằng cookie theo docs và request internal từ browser | Transport auth đúng contract; internal vẫn bị chặn, không blanket permitAll |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: JWT claim matrix, Gateway/service response và đường public/protected/internal.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao claims/route trust matrix, redacted 401/403 traces và runtime config names; DEP-15 smoke không bao gồm collection thay DEP-09.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

DEP-15: Gateway route/discovery smoke và API collection (đã gộp)

Không mở lại các ID đã gộp; phần việc gộp phải được kiểm chứng cùng task đích.

## 10. Tài liệu và source cần đọc

- [backend/api-gateway/src/main/java/com/clucky/apigateway/config/SecurityConfig.java](../../backend/api-gateway/src/main/java/com/clucky/apigateway/config/SecurityConfig.java)
- [backend/identity-service](../../backend/identity-service)
- [config-repo/api-gateway.yml](../../config-repo/api-gateway.yml)
- [architechture/tasks/BE-17.md](../../architechture/tasks/BE-17.md)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Trần Nguyễn Hữu Khánh
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 03/11/2026 08:00
**Deadline:** 03/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4625 / reczz28Rqzs2LaoP
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rqzs2LaoP
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 8 SP
**Time Estimated:** 8 giờ công
**Remaining Estimate:** 8 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
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
