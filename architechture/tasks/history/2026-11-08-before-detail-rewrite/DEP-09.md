# [DEP-09] Tổng hợp Postman collection từ từng service, cấu hình gọi qua Gateway và bàn giao request mẫu cho luồng chính cùng trường hợp lỗi

> LƯU TRỮ trước biên soạn 08/11: không giao lại hoặc tính SP. Xem [task hiện hành](../../DEP-09.md).

## Story Point kế hoạch — sizing lại 08/11/2026

**SP hiện hành: 3.** Thay cho 3 SP nguồn trước sizing. **Cơ sở:** Tổng hợp collection Gateway có fixture và positive/negative cases, kiểm đủ contract/handoff; không tính lại implementation domain hoặc toàn bộ regression như task TEST riêng.

Tính toàn bộ phạm vi đang cam kết, gồm implementation, tích hợp và dev tự test/sửa lỗi một lần; không phải remaining hoặc xác nhận đã làm. Không giảm AC/security, không tính thời gian chờ hay phần HOÃN. SP không quy đổi thành giờ; giờ công/tiến độ/lịch trong metadata vẫn là snapshot. Đây là ước lượng kế hoạch từ rà backlog, chưa phải kết quả planning poker được cả nhóm xác nhận.

Ưu tiên SP này khi metadata bên dưới khác; [bảng sizing và mốc so sánh](../../../docs/Sprint_2_Story_Points_2026-11-08.md). Chỉ cập nhật repository, chưa đồng bộ Lark.

## Phân loại hiện hành — 07/11/2026

| Thuộc tính | Giá trị hiện hành |
|---|---|
| Mã | DEP-09 |
| Loại | TASK — task chính, không có parent/subtask |
| Nhóm | DEP |
| Mã gốc | DEP-09 |
| Dependency triển khai | [BE-09](../../BE-09.md), [BE-17](../../BE-17.md), [UI-05](../../UI-05.md), [BE-54](../../BE-54.md), [BE-20](../../BE-20.md), [BE-25](../../BE-25.md), [BE-23](../../BE-23.md), [BE-24](../../BE-24.md), [UI-17](../../UI-17.md), [UI-18](../../UI-18.md), [BE-29](../../BE-29.md), [BE-30](../../BE-30.md), [BE-32](../../BE-32.md), [UI-19](../../UI-19.md), [UI-30](../../UI-30.md), [UI-44](../../UI-44.md), [BE-38](../../BE-38.md), [UI-32](../../UI-32.md), [BE-42](../../BE-42.md), [UI-14](../../UI-14.md), [UI-29](../../UI-29.md) |
| Nhận thêm phạm vi/AC/DoD | Không có gói gộp mới |
| Ước lượng | 3 SP kế hoạch — sizing lại 08/11; giờ công chưa sizing lại |

Áp dụng [phân loại 07/11](../../../docs/Backlog_Reclassification_2026-11-07.md). Metadata/lịch/nhãn cũ bên dưới là lịch sử, bị thay thế khi khác bảng hiện hành. AC/DoD nhận thêm ở cuối file thuộc TASK này, không phải subtask. Chưa đồng bộ Lark, chưa xác nhận nghiệm thu mới.


> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Mai Sơn Việt |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 04/11/2026 08:00 → 05/11/2026 23:59 |
| SP / giờ công snapshot trước sizing | 3 SP / 6 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Nhóm có một API collection theo domain dùng qua Gateway, đủ luồng chính/lỗi để demo và kiểm chứng.

## 2. Phạm vi

### Bao gồm

- Postman collection hợp nhất, env mẫu và hướng dẫn chạy theo thứ tự.
- Tổng hợp Postman/API collection từ domain; gộp phần collection của DEP-15.
- Endpoint qua Gateway, env placeholder, không nhúng token/secret thực.

### Không bao gồm

Không export token/App Password hoặc tự gọi mutation production.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

API spec và từng BE/INT là nguồn collection; task gộp phần collection DEP-15 nhưng security smoke ở INT-53. Không có collection chạy thật chỉ từ tên deliverable, owner từng domain phải bàn giao subset/version/evidence.

- [architechture/docs/Đặc tả API.md](../../../../architechture/docs/Đặc tả API.md)
- [contracts/README.md](../../../../contracts/README.md)
- [architechture/tasks/INT-53.md](../../../../architechture/tasks/INT-53.md)
- [architechture/tasks/TEST-01.md](../../../../architechture/tasks/TEST-01.md)
- [architechture/tasks/TEST-07.md](../../../../architechture/tasks/TEST-07.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | Collection/export từ từng owner, OpenAPI, auth/env placeholders và INT endpoints đã bàn giao. |
| Đầu ra / contract | Postman collection hợp nhất, env mẫu và hướng dẫn chạy theo thứ tự. |
| Điểm giao tiếp / deliverable đã cam kết | postman/ |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Collection version/env template/variables Gateway URL, actor credentials injection, captured IDs/correlation và request order. Domain folders ghi readiness và expected positive/negative results; file export không chứa token/cookie/password hay account thật.

## 4. Thứ tự thực hiện cụ thể

1. Thu endpoint/export của từng domain owner, gắn commit/contract version và danh sách đã chạy/chưa chạy; endpoint chưa có vẫn ghi NOT READY.
2. Chốt collection format/naming và env scopes với nhóm, dùng công cụ hiện có; không tự thêm dependency/framework chỉ để merge.
3. Chuẩn hóa Gateway base URL/auth placeholders, ID capture từ response và cleanup guards; không hardcode ID của người dùng thật hoặc secret trong examples/scripts.
4. Gộp folders loại trùng, sắp chain auth→catalog→cart/order→payment và negative RBAC, không gọi service trực tiếp để né Gateway.
5. Soạn import/runbook cho workspace mới, prerequisite/env injection và subset thao tác nguy hiểm cần explicit user approval; không tự chạy chuyển tiền/email/delete.
6. Bàn giao manifest owner/endpoint/status và evidence import/run của người thực hiện sau; failed/block chưa có backend không bị thay bằng mock live.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt version collection và subset đã chạy thật; M6 tổng hợp, owner domain chịu nội dung service.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC tổng hợp + domain owners chốt version và minimum demo subset, owner chịu expected results của service. Chưa nhận export đủ không tự gọi request guessed làm collection hoàn chỉnh.

## 6. Dependency và bàn giao

> Bảng handoff bên dưới giữ tham chiếu trước gộp. Dependency triển khai hiện hành là bảng đầu file; ID INT/TEST cũ chỉ là truy vết qua trang chuyển hướng, không phải task phải giao lại.

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [INT-53](../../INT-53.md) | Trần Nguyễn Hữu Khánh | Security integration login→Gateway→service, auth/authorization error contract nhất quán. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-54](../../INT-54.md) | Nguyễn Duy Quang Nhật | Public catalog discovery integration không hardcode business service URL ở frontend. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-07](../../INT-07.md) | Trần Đức Anh | Cart→preview→submit→order detail qua Gateway với trạng thái nhất quán. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-09](../../INT-09.md) | Lê Phú Thịnh | QR thật→đối soát→payment PAID→Order CONFIRMED; COD thu đúng role/store. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-11](../../INT-11.md) | Cao Tất Thành | Notification API integration, read/read-all/count và target navigation. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-13](../../INT-13.md) | Mai Sơn Việt | Filter/date/export xlsx/pdf hoạt động qua Gateway theo role. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [DEP-08](../../DEP-08.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Import collection/env mẫu vào workspace mới theo runbook khi người dùng kiểm chứng | Variables rõ, không secret; request chain lấy ID từ response và dùng Gateway |
| AC-02 | Import vào workspace mới | Có env placeholder rõ |
| AC-03 | Request tham chiếu ID trước | Lấy đúng biến, không hardcode tài khoản thật |
| AC-04 | Endpoint chưa có | Gắn trạng thái chưa sẵn sàng, không mock như live |
| AC-05 | Endpoint chưa triển khai hoặc subset chưa chạy | Ghi NOT READY/NOT RUN với owner, không mock response rồi nhận đã live |
| AC-06 | Rà exported examples/auth/cookies/scripts và duplicate requests | Không credential/PII thật, không ID hardcode trái scope, mỗi request có expected/contract source |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Collection/env files, endpoint coverage và run results theo commit/service version.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao collection/env/runbook manifest có checksum/version/owner và run status, không khẳng định đã import/chạy khi chỉ viết detail.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [architechture/docs/Đặc tả API.md](../../../../architechture/docs/Đặc tả API.md)
- [contracts/README.md](../../../../contracts/README.md)
- [architechture/tasks/INT-53.md](../../../../architechture/tasks/INT-53.md)
- [architechture/tasks/TEST-01.md](../../../../architechture/tasks/TEST-01.md)
- [architechture/tasks/TEST-07.md](../../../../architechture/tasks/TEST-07.md)
- [API](../../../docs/Đặc%20tả%20API.md), [SRS](../../../docs/SRS.md), [RBAC](../../../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../../../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../../../docs/backlog.md), [Danh mục lỗi](../../../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Mai Sơn Việt
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 04/11/2026 08:00
**Deadline:** 05/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại (snapshot trước phân loại):** Sub Task
**Mã Lark:** Mail-4570 / reczz28Rid5Xhv3s
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5Xhv3s
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 3 SP
**Time Estimated:** 6 giờ công
**Remaining Estimate:** 6 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Tổng hợp collection đã có từ từng domain, mask token/env; không cộng lại công viết API hoặc test nghiệp vụ.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../../../docs/backlog.md#quy-ước-ước-lượng).

Lịch cũ (30/10): 07/11/2026 08:00 → 07/11/2026 23:59. Lịch mới: 04/11/2026 08:00 → 05/11/2026 23:59. Giữ khung Sprint 2 02–08/11 để truy vết; hạn hoàn thành thực tế 05/11, Sprint Review 06/11, không xếp việc triển khai/nghiệm thu vào 06–08/11.

Bắt đầu có thể là chuẩn bị fixture/UI theo contract; phần cần API/event thật bị chặn cho đến khi dependency bàn giao. Nếu cùng ngày đến hạn, phải bàn giao prerequisite trước khi nghiệm thu task này; không coi deadline trùng ngày là bằng chứng đã sẵn sàng.

</details>

## Quy ước kiểm chứng

Việc cập nhật detail không chạy test, lint, typecheck, build, Docker hoặc trình duyệt. Checklist là điều kiện nghiệm thu để người phụ trách thực hiện, không phải báo cáo PASS. Giữ trạng thái snapshot, kể cả DONE; chưa xác nhận lại trên Lark.

## AC/DoD bắt buộc của TASK chính — 07/11/2026

- [ ] Dev tự kiểm thử từng AC thuộc phần mình triển khai: happy path, validation/boundary, lỗi dependency, quyền/ownership/storeId và retry/concurrency/idempotency khi có; ghi PASS/FAIL/BLOCKED, không đánh PASS vì có code hoặc UI mock.
- [ ] Ghi commit, môi trường, contract, fixture/actor/store, bước tái hiện, expected/actual và evidence đã mask. Dùng lại evidence hợp lệ; không chạy/tính công lặp giữa các task.
- [ ] UI gọi Gateway, đủ loading/empty/error/retry; backend kiểm quyền, DTO/error shape, Config Server/Eureka, schema riêng/migration mới. UI giữ brand, vi/en, responsive, keyboard/focus theo phạm vi.
- [ ] Event có eventId/correlationId, replay không nhân side effect; email lỗi không rollback Order/Payment; không lộ credential/OTP/token hoặc dữ liệu ngoài quyền.
- [ ] AC xuyên service: dev chịu phần mình sở hữu, đầu mối tổng hợp một bộ evidence chung. Thiếu handoff ghi BLOCKED/prerequisite/PIC, không kết luận toàn luồng từ kiểm thử cục bộ.
- [ ] Sửa lỗi trong phạm vi và tự retest tại TASK này; bug có một PIC. Bàn giao contract/evidence cho task phụ thuộc; không lập lại INT/TEST subtask để chuyển trách nhiệm kiểm thử.
- [ ] DONE snapshot là lịch sử, không xác nhận AC mới đã đạt. AC fail/blocked chưa được coi hoàn tất; mục hoãn có nhãn riêng, không tự kéo backlog/Phase 2 vào sprint.

Mục không áp dụng ghi N/A kèm lý do; không bỏ security/AC đã chỉ định. Đây là yêu cầu dev tự kiểm thử, không phải kết quả chạy của lần sửa tài liệu.
