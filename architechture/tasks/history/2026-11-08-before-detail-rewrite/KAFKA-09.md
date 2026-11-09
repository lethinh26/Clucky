# [KAFKA-09] Xử lý payment.failed để hủy đơn và giải phóng voucher, điểm đã giữ, bảo đảm các bước bù trừ không thực hiện trùng

> LƯU TRỮ trước biên soạn 08/11: không giao lại hoặc tính SP. Xem [task hiện hành](../../KAFKA-09.md).

## Story Point kế hoạch — sizing lại 08/11/2026

**SP hiện hành: 8.** Thay cho 8 SP nguồn trước sizing. **Cơ sở:** Compensation payment.failed xuyên Order/Promotion cần state, retry và giải phóng voucher/điểm đúng một lần; giữ điểm vì phục hồi từng chặng khó, không tính lại cancel API.

Tính toàn bộ phạm vi đang cam kết, gồm implementation, tích hợp và dev tự test/sửa lỗi một lần; không phải remaining hoặc xác nhận đã làm. Không giảm AC/security, không tính thời gian chờ hay phần HOÃN. SP không quy đổi thành giờ; giờ công/tiến độ/lịch trong metadata vẫn là snapshot. Đây là ước lượng kế hoạch từ rà backlog, chưa phải kết quả planning poker được cả nhóm xác nhận.

Ưu tiên SP này khi metadata bên dưới khác; [bảng sizing và mốc so sánh](../../../docs/Sprint_2_Story_Points_2026-11-08.md). Chỉ cập nhật repository, chưa đồng bộ Lark.

## Phân loại hiện hành — 07/11/2026

| Thuộc tính | Giá trị hiện hành |
|---|---|
| Mã | KAFKA-09 |
| Loại | TASK — task chính, không có parent/subtask |
| Nhóm | KAFKA |
| Mã gốc | INT-47 |
| Dependency triển khai | [KAFKA-03](../../KAFKA-03.md), [BE-26](../../BE-26.md), [BE-34](../../BE-34.md), [BE-37](../../BE-37.md) |
| Nhận thêm phạm vi/AC/DoD | TEST-16 |
| Ước lượng | 8 SP kế hoạch — sizing lại 08/11; giờ công chưa sizing lại |

Áp dụng [phân loại 07/11](../../../docs/Backlog_Reclassification_2026-11-07.md). Metadata/lịch/nhãn cũ bên dưới là lịch sử, bị thay thế khi khác bảng hiện hành. AC/DoD nhận thêm ở cuối file thuộc TASK này, không phải subtask. Chưa đồng bộ Lark, chưa xác nhận nghiệm thu mới.

Phạm vi/AC/DoD nhận thêm thay thế các câu loại trừ hoặc giao cho INT/TEST cũ khi cùng phạm vi. Mục HOÃN vẫn hoãn; không tự đưa vào sprint hoặc bỏ yêu cầu bảo mật. Các ID cũ trong lời văn chỉ để truy vết, không đổi tên máy móc thành một task domain khác.


> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Trần Đức Anh |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 04/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công snapshot trước sizing | 8 SP / 12 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Payment thất bại dẫn đến hủy đơn và release ưu đãi/điểm một cách idempotent giữa các service.

## 2. Phạm vi

### Bao gồm

- Saga compensation Order→Promotion với trạng thái/retry truy vết được.
- Payment.failed → cancel order → release voucher/điểm; bù trừ idempotent.
- PIC Order kết nối; Payment producer KAFKA-03 và Promotion API BE-34, BE-37 là dependency, không thêm đồng PIC.

### Không bao gồm

Không chuyển tiền refund hoặc notification producer ngoài boundary đã chốt.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Saga cần nối Payment producer KAFKA-03 với Order và Promotion/Loyalty, không có transaction SQL xuyên service. Đọc trạng thái thật và reservation contract trước khi viết release callback.

- [backend/cart-order-service](../../../../backend/cart-order-service)
- [backend/promotion-loyalty-service](../../../../backend/promotion-loyalty-service)
- [architechture/tasks/KAFKA-03.md](../../../../architechture/tasks/KAFKA-03.md)
- [architechture/tasks/BE-24.md](../../../../architechture/tasks/BE-24.md)
- [architechture/tasks/BE-37.md](../../../../architechture/tasks/BE-37.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | payment.failed, Order state và Promotion release contracts BE-34, BE-37. |
| Đầu ra / contract | Saga compensation Order→Promotion với trạng thái/retry truy vết được. |
| Điểm giao tiếp / deliverable đã cam kết | Event chain |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Failure identity/payment/order và current state → cancel hợp lệ → release voucher/points theo reservation/order key. Mỗi bước có durable progress/retry; event failed cũ không được hủy order đã paid, release phải idempotent.

## 4. Thứ tự thực hiện cụ thể

1. Chốt failure types và race confirmed-vs-failed với Payment/Order; xác minh current state trước mutation.
2. Map reservation/voucher/points của order và API/event release được owner cung cấp; không tự cộng balance bằng số UI.
3. Ghi saga/compensation progress bền vững cùng bước Order phù hợp để restart biết việc còn thiếu, không chỉ chain callback trong memory.
4. Cancel theo transition hợp lệ, yêu cầu release idempotent và ghi outcome từng resource; không coi timeout là đã release.
5. Retry phần pending sau phục hồi theo policy, reconcile unknown outcome trước thao tác có thể hoàn trả hai lần.
6. Bàn giao duplicate failed, release timeout/crash và concurrent confirmed; đối chiếu Order/payment/usage/ledger, không chỉ saga log.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt saga state/durable retry và race confirmed-vs-failed; không dùng distributed SQL transaction giả.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Order/Payment/Loyalty chốt precedence race, durable progress và reservation lifecycle. Chưa có release API/key thì ghi blocked compensation, không giả distributed rollback.

## 6. Dependency và bàn giao

> Bảng handoff bên dưới giữ tham chiếu trước gộp. Dependency triển khai hiện hành là bảng đầu file; ID INT/TEST cũ chỉ là truy vết qua trang chuyển hướng, không phải task phải giao lại.

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [KAFKA-03](../../KAFKA-03.md) | Lê Phú Thịnh | Payment event contract/producer cho Order/Notification/Report. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [BE-26](../../BE-26.md) | Trần Đức Anh | Cancel/reject và refund_request PENDING khi cần; history và đầu ra event cho KAFKA-02, KAFKA-09. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-34](../../BE-34.md) | Cao Tất Thành | Validate/available/CRUD voucher thường, discount và lỗi hết hạn/hết lượt/sai scope. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-37](../../BE-37.md) | Cao Tất Thành | Loyalty me/history/config, earn/redeem và contract bù trừ cho Order saga. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [TEST-16](../../TEST-16.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Payment failed hợp lệ cho order chưa paid có reservation | Order chuyển hợp lệ, voucher/điểm được release đúng một lần, progress kết thúc có evidence |
| AC-02 | Replay failure | Không release/cộng trả điểm hai lần |
| AC-03 | Promotion timeout | Không bỏ quên compensation đã pending |
| AC-04 | Order đã paid/terminal | Không hủy sai do event stale |
| AC-05 | Release timeout rồi restart/replay failed | Còn việc pending được retry/reconcile, không bỏ quên hoặc hoàn trả hai lần |
| AC-06 | Failed đến muộn khi payment/order đã thành công | Không hủy/release sai; outcome được ghi theo policy race đã duyệt |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Payment/order/usage/ledger trace, partial failure và replay recovery.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao saga transition/progress map và evidence từng resource trước/sau; lỗi có owner, không gọi status cancelled là compensation đã hoàn tất.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [backend/cart-order-service](../../../../backend/cart-order-service)
- [backend/promotion-loyalty-service](../../../../backend/promotion-loyalty-service)
- [architechture/tasks/KAFKA-03.md](../../../../architechture/tasks/KAFKA-03.md)
- [architechture/tasks/BE-24.md](../../../../architechture/tasks/BE-24.md)
- [architechture/tasks/BE-37.md](../../../../architechture/tasks/BE-37.md)
- [API](../../../docs/Đặc%20tả%20API.md), [SRS](../../../docs/SRS.md), [RBAC](../../../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../../../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../../../docs/backlog.md), [Danh mục lỗi](../../../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Trần Đức Anh
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 04/11/2026 08:00
**Deadline:** 04/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại (snapshot trước phân loại):** Sub Task
**Mã Lark:** Mail-4517 / reczz28Rid5XkQIM
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5XkQIM
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 8 SP
**Time Estimated:** 12 giờ công
**Remaining Estimate:** 12 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Tính phần nối contract, xử lý lỗi liên service/UI, fixture và evidence tích hợp; không triển khai lại API đã tính ở BE hoặc chạy lại bộ regression TEST.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../../../docs/backlog.md#quy-ước-ước-lượng).

Lịch cũ (30/10): 05/11/2026 08:00 → 06/11/2026 23:59. Lịch mới: 04/11/2026 08:00 → 04/11/2026 23:59. Giữ khung Sprint 2 02–08/11 để truy vết; hạn hoàn thành thực tế 05/11, Sprint Review 06/11, không xếp việc triển khai/nghiệm thu vào 06–08/11.

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

## Phạm vi, AC và DoD nhận từ TEST-16 — Integration test Kafka + cross-service

**Đầu mối nghiệm thu:** [KAFKA-08](../../KAFKA-08.md); **phối hợp:** [KAFKA-02](../../KAFKA-02.md), [KAFKA-03](../../KAFKA-03.md), [KAFKA-05](../../KAFKA-05.md), [KAFKA-06](../../KAFKA-06.md), [KAFKA-07](../../KAFKA-07.md), [KAFKA-09](../../KAFKA-09.md), [KAFKA-10](../../KAFKA-10.md), [KAFKA-12](../../KAFKA-12.md).

Đây là scope của TASK chính, không phải subtask mới. Dev tự test phần thuộc task này; đầu mối tổng hợp evidence xuyên luồng một lần, các task phối hợp dùng chung. Giữ toàn bộ AC/checklist để không mất trường hợp; không yêu cầu mỗi dev chạy lặp toàn bộ luồng.

Phạm vi/contract/fixture đầy đủ nằm trực tiếp tại [KAFKA-08](../../KAFKA-08.md), mục nhận từ TEST-16. Task này giữ đầu ra domain của mình và thực hiện AC liên quan dưới đây, không trở thành task kiểm thử riêng.

### AC kế thừa TEST-16

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| TEST-16/AC-01 | Nghiệp vụ nguồn đi qua consumer với IDs xuyên service | Effects đúng contract và persisted, mỗi chặng có evidence commit/outcome |
| TEST-16/AC-02 | order.created replay | Shipment không trùng |
| TEST-16/AC-03 | completed/confirmed replay | Points/revenue không cộng đôi |
| TEST-16/AC-04 | Poison event/DLQ lỗi | Không ack mất dữ liệu im lặng |
| TEST-16/AC-05 | Replay order.created/completed/confirmed hoặc đổi thứ tự hợp lệ | Shipment không trùng, points/revenue không cộng đôi; final projection khớp expected |
| TEST-16/AC-06 | Poison event và DLQ lỗi, sau đó phục hồi/replay được phép | Không mất event do ack sớm, recovery có trace và không nhân side effect |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

### DoD và evidence kế thừa TEST-16

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Event offsets/IDs, persisted side effects và retry/DLQ/recovery timeline.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- [ ] Ghi kết quả riêng TEST-16/AC-01 đến TEST-16/AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao topology/run manifest và before-after effects, fault/recovery evidence có PIC; chưa chạy Kafka hoặc hạ tầng trong lượt viết detail.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

**Quy tắc hiện hành ưu tiên:** PIC task nhận chịu phần việc của mình; đầu mối trên điều phối AC chung. ID/PIC/lịch/dependency INT/TEST trong nội dung kế thừa chỉ truy vết lịch sử, không yêu cầu giữ record cũ. Không cộng nguyên SP/giờ gói cũ; phần phát sinh cần PIC rà estimate. Không suy ra đã test hoặc đổi trạng thái vì chuyển nội dung.
