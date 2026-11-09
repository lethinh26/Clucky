# [KAFKA-05] Xử lý sự kiện order.created để tạo một shipment CREATED cho mỗi đơn, không tạo trùng khi Kafka gửi lại

> LƯU TRỮ trước biên soạn 08/11: không giao lại hoặc tính SP. Xem [task hiện hành](../../KAFKA-05.md).

## Story Point kế hoạch — sizing lại 08/11/2026

**SP hiện hành: 3.** Thay cho 3 SP nguồn trước sizing. **Cơ sở:** Một consumer order.created tạo shipment CREATED có unique/idempotency và replay; không nhận giao vận Phase 2 hoặc tính lại fee API.

Tính toàn bộ phạm vi đang cam kết, gồm implementation, tích hợp và dev tự test/sửa lỗi một lần; không phải remaining hoặc xác nhận đã làm. Không giảm AC/security, không tính thời gian chờ hay phần HOÃN. SP không quy đổi thành giờ; giờ công/tiến độ/lịch trong metadata vẫn là snapshot. Đây là ước lượng kế hoạch từ rà backlog, chưa phải kết quả planning poker được cả nhóm xác nhận.

Ưu tiên SP này khi metadata bên dưới khác; [bảng sizing và mốc so sánh](../../../docs/Sprint_2_Story_Points_2026-11-08.md). Chỉ cập nhật repository, chưa đồng bộ Lark.

## Phân loại hiện hành — 07/11/2026

| Thuộc tính | Giá trị hiện hành |
|---|---|
| Mã | KAFKA-05 |
| Loại | TASK — task chính, không có parent/subtask |
| Nhóm | KAFKA |
| Mã gốc | INT-43 |
| Dependency triển khai | [KAFKA-02](../../KAFKA-02.md), [BE-06](../../BE-06.md) |
| Nhận thêm phạm vi/AC/DoD | TEST-16 |
| Ước lượng | 3 SP kế hoạch — sizing lại 08/11; giờ công chưa sizing lại |

Áp dụng [phân loại 07/11](../../../docs/Backlog_Reclassification_2026-11-07.md). Metadata/lịch/nhãn cũ bên dưới là lịch sử, bị thay thế khi khác bảng hiện hành. AC/DoD nhận thêm ở cuối file thuộc TASK này, không phải subtask. Chưa đồng bộ Lark, chưa xác nhận nghiệm thu mới.

Phạm vi/AC/DoD nhận thêm thay thế các câu loại trừ hoặc giao cho INT/TEST cũ khi cùng phạm vi. Mục HOÃN vẫn hoãn; không tự đưa vào sprint hoặc bỏ yêu cầu bảo mật. Các ID cũ trong lời văn chỉ để truy vết, không đổi tên máy móc thành một task domain khác.


> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Lê Phú Thịnh |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 03/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công snapshot trước sizing | 3 SP / 4 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Mỗi order.created hợp lệ tạo đúng shipment CREATED thuộc đơn, không cần shipper ở MVP.

## 2. Phạm vi

### Bao gồm

- Idempotent consumer tạo shipment MVP cho BE-33 query.
- Consume order.created tạo shipment CREATED đúng order; replay không tạo trùng shipment.

### Không bao gồm

Không assign/status sau CREATED, không gọi GPS hoặc giao thật.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Shipping có KafkaConfig và model/schema cần đối chiếu BE-33; không coi listener factory là đã có shipment consumer. MVP chỉ tạo shipment CREATED, không assignment/tracking.

- [backend/shipping-service](../../../../backend/shipping-service)
- [architechture/tasks/BE-33.md](../../../../architechture/tasks/BE-33.md)
- [architechture/tasks/KAFKA-02.md](../../../../architechture/tasks/KAFKA-02.md)
- [architechture/tasks/KAFKA-08.md](../../../../architechture/tasks/KAFKA-08.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | Order event, delivery/pickup indicator, address/store/COD snapshot và Shipping repository. |
| Đầu ra / contract | Idempotent consumer tạo shipment MVP cho BE-33 query. |
| Điểm giao tiếp / deliverable đã cam kết | @KafkaListener |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

order.created cần orderId/storeId, delivery mode, snapshot địa chỉ cần thiết, eventId/version. Chốt pickup eligibility và unique identity theo order; retry phải bảo toàn shipment và dedup trong cùng transaction.

## 4. Thứ tự thực hiện cụ thể

1. Nhận payload/version từ KAFKA-02, xác định field bắt buộc và routing theo mode; không suy pickup từ UI route.
2. Đối chiếu migration/entity/repository Shipping, thêm constraint/migration mới nếu cần theo contract; không sửa migration đã áp dụng.
3. Validate payload rồi ghi shipment CREATED và dedup atomically; duplicate event/order trả kết quả đã tồn tại theo policy.
4. Ack chỉ sau commit; lỗi DB transient đi retry, payload lỗi đi DLQ/quarantine bền vững theo KAFKA-08.
5. Cho query BE-33 đọc đúng order/store, không trả địa chỉ người khác qua orderId đoán được.
6. Bàn giao replay/crash giữa ghi và ack, pickup và missing address; không giả shipment delivered hoặc gán shipper để hoàn tất AC.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt shipment cho pickup và unique key với Order; không suy eligibility từ UI.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Shipping + Order chốt pickup có tạo shipment không, unique key và required address. Chưa chốt thì chỉ xử lý delivery contract đã xác nhận, đánh blocked nhánh pickup.

## 6. Dependency và bàn giao

> Bảng handoff bên dưới giữ tham chiếu trước gộp. Dependency triển khai hiện hành là bảng đầu file; ID INT/TEST cũ chỉ là truy vết qua trang chuyển hướng, không phải task phải giao lại.

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [KAFKA-02](../../KAFKA-02.md) | Trần Đức Anh | order.created/status-changed/completed/cancelled với payload ổn định và đường retry bền vững. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [BE-06](../../BE-06.md) | Lê Phú Thịnh | Entity/repository và mapping kiểu, khóa, nullable, index cho shipments, shipment_status_history, shipping_fee_config; migration bổ sung chỉ khi có chênh lệch đã được xác nhận. | Trước code/kiểm chứng persistence; có thể phân tích DTO và luồng nghiệp vụ trước. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [INT-65](../../INT-65.md), [TEST-16](../../TEST-16.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Delivery order.created hợp lệ được consume rồi query theo owner | Một shipment CREATED đúng order/store/address snapshot |
| AC-02 | Event giao hàng hợp lệ | Shipment CREATED đúng order/store |
| AC-03 | Replay | Không tạo shipment thứ hai |
| AC-04 | Payload thiếu address cần thiết | Không ack mất event như đã thành công |
| AC-05 | Replay event hoặc crash sau commit trước ack | Không thêm shipment thứ hai, consumer xử lý lại an toàn |
| AC-06 | Thiếu address bắt buộc hoặc DB tạm lỗi | Không ack mất event như success; có retry/DLQ trace và recovery |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Order event→shipment record→query, replay và poison payload handling.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao payload-to-shipment mapping, row count/dedup evidence và pickup decision; giữ explicit MVP CREATED-only.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [backend/shipping-service](../../../../backend/shipping-service)
- [architechture/tasks/BE-33.md](../../../../architechture/tasks/BE-33.md)
- [architechture/tasks/KAFKA-02.md](../../../../architechture/tasks/KAFKA-02.md)
- [architechture/tasks/KAFKA-08.md](../../../../architechture/tasks/KAFKA-08.md)
- [API](../../../docs/Đặc%20tả%20API.md), [SRS](../../../docs/SRS.md), [RBAC](../../../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../../../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../../../docs/backlog.md), [Danh mục lỗi](../../../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Lê Phú Thịnh
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 03/11/2026 08:00
**Deadline:** 04/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại (snapshot trước phân loại):** Sub Task
**Mã Lark:** Mail-4513 / reczz28Rid5XjvcA
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5XjvcA
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 3 SP
**Time Estimated:** 4 giờ công
**Remaining Estimate:** 4 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Tính phần nối contract, xử lý lỗi liên service/UI, fixture và evidence tích hợp; không triển khai lại API đã tính ở BE hoặc chạy lại bộ regression TEST.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../../../docs/backlog.md#quy-ước-ước-lượng).

Lịch cũ (30/10): 04/11/2026 08:00 → 05/11/2026 23:59. Lịch mới: 03/11/2026 08:00 → 04/11/2026 23:59. Giữ khung Sprint 2 02–08/11 để truy vết; hạn hoàn thành thực tế 05/11, Sprint Review 06/11, không xếp việc triển khai/nghiệm thu vào 06–08/11.

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
