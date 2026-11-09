# [DEP-10] Chuẩn bị kịch bản demo, ảnh minh chứng và slide Sprint Review, phân biệt rõ chức năng đã nghiệm thu với phần còn hạn chế

> LƯU TRỮ trước biên soạn 08/11: không giao lại hoặc tính SP. Xem [task hiện hành](../../DEP-10.md).

## Story Point kế hoạch — sizing lại 08/11/2026

**SP hiện hành: 2.** Thay cho 3 SP nguồn trước sizing. **Cơ sở:** Biên soạn kịch bản, ảnh và slide từ evidence owner đã bàn giao; chỉ tính công chuẩn bị/demo và ghi hạn chế, không tính lại tự test của tất cả domain hoặc thời gian chờ evidence.

Tính toàn bộ phạm vi đang cam kết, gồm implementation, tích hợp và dev tự test/sửa lỗi một lần; không phải remaining hoặc xác nhận đã làm. Không giảm AC/security, không tính thời gian chờ hay phần HOÃN. SP không quy đổi thành giờ; giờ công/tiến độ/lịch trong metadata vẫn là snapshot. Đây là ước lượng kế hoạch từ rà backlog, chưa phải kết quả planning poker được cả nhóm xác nhận.

Ưu tiên SP này khi metadata bên dưới khác; [bảng sizing và mốc so sánh](../../../docs/Sprint_2_Story_Points_2026-11-08.md). Chỉ cập nhật repository, chưa đồng bộ Lark.

## Phân loại hiện hành — 07/11/2026

| Thuộc tính | Giá trị hiện hành |
|---|---|
| Mã | DEP-10 |
| Loại | TASK — task chính, không có parent/subtask |
| Nhóm | DEP |
| Mã gốc | DEP-10 |
| Dependency triển khai | [BE-25](../../BE-25.md), [BE-17](../../BE-17.md), [BE-20](../../BE-20.md), [BE-23](../../BE-23.md), [BE-24](../../BE-24.md), [BE-32](../../BE-32.md), [UI-09](../../UI-09.md), [UI-11](../../UI-11.md), [UI-17](../../UI-17.md), [UI-18](../../UI-18.md), [UI-30](../../UI-30.md), [BE-19](../../BE-19.md), [BE-42](../../BE-42.md), [UI-15](../../UI-15.md), [UI-29](../../UI-29.md), [BE-21](../../BE-21.md), [BE-34](../../BE-34.md), [UI-25](../../UI-25.md), [UI-26](../../UI-26.md), [UI-28](../../UI-28.md), [BE-09](../../BE-09.md), [BE-22](../../BE-22.md), [BE-26](../../BE-26.md), [BE-27](../../BE-27.md), [BE-33](../../BE-33.md), [BE-40](../../BE-40.md), [BE-43](../../BE-43.md), [BE-63](../../BE-63.md), [BE-72](../../BE-72.md) |
| Nhận thêm phạm vi/AC/DoD | Không có gói gộp mới |
| Ước lượng | 2 SP kế hoạch — sizing lại 08/11; giờ công chưa sizing lại |

Áp dụng [phân loại 07/11](../../../docs/Backlog_Reclassification_2026-11-07.md). Metadata/lịch/nhãn cũ bên dưới là lịch sử, bị thay thế khi khác bảng hiện hành. AC/DoD nhận thêm ở cuối file thuộc TASK này, không phải subtask. Chưa đồng bộ Lark, chưa xác nhận nghiệm thu mới.


> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Trần Nguyễn Hữu Khánh |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 04/11/2026 08:00 → 05/11/2026 23:59 |
| SP / giờ công snapshot trước sizing | 3 SP / 8 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Sprint Review có script/screenshots/slides phản ánh đúng phần đã nghiệm thu và phần còn hạn chế.

## 2. Phạm vi

### Bao gồm

- Demo script, ảnh/slides có nguồn, checklist chuẩn bị và danh sách chưa đạt.
- Script demo, screenshot và slides phản ánh đúng scope hoàn thành; nêu rõ backlog/Phase 2 chưa có.

### Không bao gồm

Không sửa trạng thái Lark hoặc cắt scope để làm slide đẹp.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Sprint 2 Planning và task details là kế hoạch, không tự chứng minh tính năng đã nghiệm thu. Nhận evidence TEST-01, TEST-05, TEST-06, TEST-07 và collection DEP-09 trước khi chốt lời dẫn; mock/demo và Phase 2 phải ghi nhãn rõ.

- [architechture/docs/Sprint_2_Planning.md](../../../../architechture/docs/Sprint_2_Planning.md)
- [architechture/tasks/TEST-01.md](../../../../architechture/tasks/TEST-01.md)
- [architechture/tasks/TEST-05.md](../../../../architechture/tasks/TEST-05.md)
- [architechture/tasks/TEST-06.md](../../../../architechture/tasks/TEST-06.md)
- [architechture/tasks/TEST-07.md](../../../../architechture/tasks/TEST-07.md)
- [architechture/tasks/DEP-09.md](../../../../architechture/tasks/DEP-09.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | Evidence TEST-01, TEST-05, TEST-06, TEST-07, task status snapshot và phiên bản demo. |
| Đầu ra / contract | Demo script, ảnh/slides có nguồn, checklist chuẩn bị và danh sách chưa đạt. |
| Điểm giao tiếp / deliverable đã cam kết | Presentation |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Gói demo gồm script theo bước, actor/role/store/data prerequisites, expected screen/outcome, evidence source/commit, screenshots/slides và limitation list. Mỗi claim liên kết evidence; status snapshot không thay PASS. Credentials không nằm trong slides/script.

## 4. Thứ tự thực hiện cụ thể

1. Thu kết quả nghiệm thu/bug của từng owner, lập bảng feature→evidence→PASS/FAIL/BLOCKED/NOT RUN; không tự nâng status Lark vì có source hoặc detail.
2. Chốt audience/thời lượng với nhóm, chọn hành trình Customer COD và quản trị theo evidence thực; phần chưa hoàn tất ghi riêng không lấp bằng UI demo không nhãn.
3. Viết script từng bước với người thao tác, tài khoản role không ghi password, store/dataset, action, expected result và điểm kiểm API/persisted state.
4. Chọn screenshot từ đúng phiên bản/route có source evidence, che token/cookie/OTP/PII; slide phân biệt MVP shipment CREATED với tracking Phase 2 và backlog banner/proposal.
5. Chuẩn bị preflight checklist và fallback trung thực: dùng ảnh/video đã có evidence khi môi trường lỗi, nói rõ không live; không tạo success hoặc sửa số liệu để demo trơn tru.
6. Bàn giao script/asset list/slides version cùng gap/owner và hướng dẫn reset dataset an toàn; rehearsal/browser/render chỉ làm khi được yêu cầu, chưa thực hiện trong lượt viết detail.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt phạm vi trình bày và thời lượng với nhóm; chuẩn bị trước nhưng kết luận sau nghiệm thu.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC demo + nhóm chốt phạm vi/thời lượng và bản code trình bày, owner domain xác nhận claim. Không cắt scope âm thầm hoặc chuyển task DONE để đồng bộ slide với mong muốn.

## 6. Dependency và bàn giao

> Bảng handoff bên dưới giữ tham chiếu trước gộp. Dependency triển khai hiện hành là bảng đầu file; ID INT/TEST cũ chỉ là truy vết qua trang chuyển hướng, không phải task phải giao lại.

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [TEST-01](../../TEST-01.md) | Trần Đức Anh | Bộ case/script và báo cáo Guest→register→OTP→browse→cart→COD có actual/expected và IDs. | Trước chốt nghiệm thu/release liên quan; cần kết quả và lỗi còn mở, không chỉ script. |
| [TEST-05](../../TEST-05.md) | Mai Sơn Việt | E2E case/report cho quản trị nhân sự và report theo scope. | Trước chốt nghiệm thu/release liên quan; cần kết quả và lỗi còn mở, không chỉ script. |
| [TEST-06](../../TEST-06.md) | Nguyễn Duy Quang Nhật | E2E CRUD→public menu→voucher validate với record thật. | Trước chốt nghiệm thu/release liên quan; cần kết quả và lỗi còn mở, không chỉ script. |
| [TEST-07](../../TEST-07.md) | Trần Nguyễn Hữu Khánh | Regression RBAC có allowed/denied cases và chứng cứ không đổi dữ liệu. | Trước chốt nghiệm thu/release liên quan; cần kết quả và lỗi còn mở, không chỉ script. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [DEP-11](../../DEP-11.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Đối chiếu từng bước script và từng claim slide với evidence nghiệm thu | Nguồn/commit/role rõ, phần chưa chạy không được gọi hoàn thành; có checklist chuẩn bị cho người trình bày |
| AC-02 | Feature chỉ UI mock | Gắn nhãn demo, không trình bày là backend hoàn chỉnh |
| AC-03 | Test chưa đạt | Nêu gap/blocker thay vì đánh DONE |
| AC-04 | Screenshot | Không lộ credential/PII không cần thiết |
| AC-05 | Feature chỉ mock hoặc môi trường live lỗi tại buổi demo | Gắn nhãn demo/recorded/fallback rõ và nói đúng giới hạn, không giả backend thật |
| AC-06 | Rà screenshot/script/slides và gap list trước chia sẻ | Không secret/PII thừa; nêu backlog/Phase 2 và lỗi chưa đạt cùng owner, không tự sửa status |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Script từng bước, screenshot/video nguồn và links kết quả test/commit.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao demo manifest script/screenshots/slides/version/evidence links, run prerequisites và limitation list; lần này chỉ hoàn thiện task detail, không tạo deck hoặc tuyên bố rehearsal đã chạy.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [architechture/docs/Sprint_2_Planning.md](../../../../architechture/docs/Sprint_2_Planning.md)
- [architechture/tasks/TEST-01.md](../../../../architechture/tasks/TEST-01.md)
- [architechture/tasks/TEST-05.md](../../../../architechture/tasks/TEST-05.md)
- [architechture/tasks/TEST-06.md](../../../../architechture/tasks/TEST-06.md)
- [architechture/tasks/TEST-07.md](../../../../architechture/tasks/TEST-07.md)
- [architechture/tasks/DEP-09.md](../../../../architechture/tasks/DEP-09.md)
- [API](../../../docs/Đặc%20tả%20API.md), [SRS](../../../docs/SRS.md), [RBAC](../../../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../../../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../../../docs/backlog.md), [Danh mục lỗi](../../../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Trần Nguyễn Hữu Khánh
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 04/11/2026 08:00
**Deadline:** 05/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại (snapshot trước phân loại):** Sub Task
**Mã Lark:** Mail-4571 / reczz28Rid5XheDN
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5XheDN
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 3 SP
**Time Estimated:** 8 giờ công
**Remaining Estimate:** 8 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Chuẩn bị script/slides từ 04/11; chỉ chốt screenshot và kết quả sau TEST-01/05/06/07, hoàn thành trước review 06/11.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../../../docs/backlog.md#quy-ước-ước-lượng).

Lịch cũ (30/10): 07/11/2026 08:00 → 08/11/2026 23:59. Lịch mới: 04/11/2026 08:00 → 05/11/2026 23:59. Giữ khung Sprint 2 02–08/11 để truy vết; hạn hoàn thành thực tế 05/11, Sprint Review 06/11, không xếp việc triển khai/nghiệm thu vào 06–08/11.

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
