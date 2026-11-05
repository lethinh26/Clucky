# [TEST-16] Integration test Kafka + cross-service

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Mai Sơn Việt |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 05/11/2026 08:00 → 05/11/2026 23:59 |
| SP / giờ công dự kiến | 8 SP / 8 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Event cross-service chịu được duplicate, lệch thứ tự và dependency outage mà không mất tính đúng đắn nghiệp vụ.

## 2. Phạm vi

### Bao gồm

- Integration suite cho shipment, loyalty, report, saga, retry/DLQ với expected side effects.
- Bàn giao theo phạm vi gốc: Test suite.

### Không bao gồm

Không test mock-only để nghiệm thu Kafka thật hoặc chaos production.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

KafkaConfig có topic declarations/retry hooks, Notification recoverer còn yêu cầu durable DLQ; topic tồn tại không chứng minh luồng cross-service. Dùng INT-39–48 theo dependency thực, không chạy broker fault trên môi trường đang dùng.

- [architechture/tasks/INT-39.md](../../architechture/tasks/INT-39.md)
- [architechture/tasks/INT-43.md](../../architechture/tasks/INT-43.md)
- [architechture/tasks/INT-44.md](../../architechture/tasks/INT-44.md)
- [architechture/tasks/INT-45.md](../../architechture/tasks/INT-45.md)
- [architechture/tasks/INT-46.md](../../architechture/tasks/INT-46.md)
- [architechture/tasks/INT-47.md](../../architechture/tasks/INT-47.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | INT-43/44/45/46/47, broker/test data và contract Order/Payment events. |
| Đầu ra / contract | Integration suite cho shipment, loyalty, report, saga, retry/DLQ với expected side effects. |
| Điểm giao tiếp / deliverable đã cam kết | Test suite |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Run manifest eventId/correlation/order/payment, producer commit/broker ack/consumer outcome/dedup. Oracle gồm shipment count, ledger/balance, stats contribution và saga progress; guarantee theo contract, không mặc định exactly-once.

## 4. Thứ tự thực hiện cụ thể

1. Lập topology producer/topic/consumer/group/schema và readiness từng mắt xích; thiếu consumer thật ghi blocked thay vì bỏ khỏi report.
2. Chuẩn bị dataset biệt lập cùng expected effects và kế hoạch inject fault/khôi phục được owner chấp thuận, không chạm topic/volume production.
3. Mô tả publish từ nghiệp vụ thật và đối chiếu shipment/points/report/audit/notification cần thiết, không chỉ console consume.
4. Thêm replay, out-of-order theo policy, concurrent delivery và crash trước/sau commit-ack; ghi identity không đổi khi retry.
5. Thêm poison event, DB down, broker/DLQ unavailable và saga compensation timeout; kiểm không ack mất dữ liệu và recovery pending được giữ.
6. Sau phục hồi đối chiếu expected effects/counts và lập bug/PIC/retest; không reset projection hoặc xóa topic để làm số đẹp.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt delivery/order guarantees và cách inject failure an toàn; không hứa exactly-once chỉ vì Kafka idempotent producer.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Kafka + domain owners chốt ordering/delivery guarantees và fault scope. Chỉ dữ liệu test được replay có kiểm soát, không replay toàn bộ lịch sử ngoài cho phép.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [INT-43](INT-43.md) | Lê Phú Thịnh | Idempotent consumer tạo shipment MVP cho BE-33 query. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-44](INT-44.md) | Cao Tất Thành | Consumer earn points với ledger/idempotency và correlation. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-45](INT-45.md) | Mai Sơn Việt | Idempotent projection consumer cho dashboard/export. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-46](INT-46.md) | Mai Sơn Việt | Reusable retry/DLQ configuration, replay procedure và idempotency checklist cho domain owners. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-47](INT-47.md) | Trần Đức Anh | Saga compensation Order→Promotion với trạng thái/retry truy vết được. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** Chưa có task khai báo phụ thuộc trong snapshot.

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Nghiệp vụ nguồn đi qua consumer với IDs xuyên service | Effects đúng contract và persisted, mỗi chặng có evidence commit/outcome |
| AC-02 | order.created replay | Shipment không trùng |
| AC-03 | completed/confirmed replay | Points/revenue không cộng đôi |
| AC-04 | Poison event/DLQ lỗi | Không ack mất dữ liệu im lặng |
| AC-05 | Replay order.created/completed/confirmed hoặc đổi thứ tự hợp lệ | Shipment không trùng, points/revenue không cộng đôi; final projection khớp expected |
| AC-06 | Poison event và DLQ lỗi, sau đó phục hồi/replay được phép | Không mất event do ack sớm, recovery có trace và không nhân side effect |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Event offsets/IDs, persisted side effects và retry/DLQ/recovery timeline.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao topology/run manifest và before-after effects, fault/recovery evidence có PIC; chưa chạy Kafka hoặc hạ tầng trong lượt viết detail.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [architechture/tasks/INT-39.md](../../architechture/tasks/INT-39.md)
- [architechture/tasks/INT-43.md](../../architechture/tasks/INT-43.md)
- [architechture/tasks/INT-44.md](../../architechture/tasks/INT-44.md)
- [architechture/tasks/INT-45.md](../../architechture/tasks/INT-45.md)
- [architechture/tasks/INT-46.md](../../architechture/tasks/INT-46.md)
- [architechture/tasks/INT-47.md](../../architechture/tasks/INT-47.md)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Mai Sơn Việt
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 05/11/2026 08:00
**Deadline:** 05/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4559 / reczz28Rid5XhJqS
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5XhJqS
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 8 SP
**Time Estimated:** 8 giờ công
**Remaining Estimate:** 8 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
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
