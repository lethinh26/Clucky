# [INT-39] Kafka producer: order.created/status-changed/completed/cancelled

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Trần Đức Anh |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 03/11/2026 08:00 → 03/11/2026 23:59 |
| SP / giờ công dự kiến | 5 SP / 6 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Order phát đủ sự kiện đã commit để Shipping/Loyalty/Report/Notification xử lý độc lập.

## 2. Phạm vi

### Bao gồm

- order.created/status-changed/completed/cancelled với payload ổn định và đường retry bền vững.
- Order phát order.created/status-changed/completed/cancelled; gộp INT-56 email contract.
- Payload có eventId/correlationId và snapshot cần thiết; không log thông tin nhạy cảm không cần thiết.

### Không bao gồm

Không viết consumer Shipping/Report/Loyalty thay owner; không log toàn PII snapshot.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Cart/Order có KafkaConfig/KafkaLogging, nhưng cấu hình producer không chứng minh domain event đã phát bền vững. Đọc BE-25/26 và từng consumer để bổ sung đúng điểm commit, không phát từ UI.

- [backend/cart-order-service](../../backend/cart-order-service)
- [architechture/tasks/BE-25.md](../../architechture/tasks/BE-25.md)
- [architechture/tasks/BE-26.md](../../architechture/tasks/BE-26.md)
- [architechture/tasks/INT-43.md](../../architechture/tasks/INT-43.md)
- [architechture/tasks/INT-44.md](../../architechture/tasks/INT-44.md)
- [architechture/tasks/INT-45.md](../../architechture/tasks/INT-45.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | Order transitions đã lưu, eventId/correlationId và snapshot cần cho consumer/email. |
| Đầu ra / contract | order.created/status-changed/completed/cancelled với payload ổn định và đường retry bền vững. |
| Điểm giao tiếp / deliverable đã cam kết | KafkaTemplate |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Bảng order.created/status-changed/completed/cancelled gồm schemaVersion, eventId riêng correlationId, orderId/storeId, thời điểm nghiệp vụ, trạng thái và snapshot tối thiểu consumer cần. Partition/order guarantees và email payload gộp INT-56 cần consumer ký nhận.

## 4. Thứ tự thực hiện cụ thể

1. Liệt kê mutation Order tương ứng từng event và consumer Shipping/Loyalty/Report/Notification; chốt tên field/topic thay vì tự tạo từ enum UI.
2. Đặt event creation ở transaction boundary sau mutation hợp lệ; chọn cơ chế durable publish/recovery với owner để không có khoảng mất event sau DB commit.
3. Ghi identity ổn định cho một sự kiện, snapshot đúng thời điểm; bỏ secret/PII không cần, không lấy actor/store từ body không tin cậy.
4. Publish qua Kafka config hiện có; ghi retry state và lỗi có correlation, không coi send async được gọi là broker đã nhận.
5. Retry cùng logical event giữ eventId; event nghiệp vụ mới có identity riêng, không dùng correlationId làm khóa dedup chung cả luồng.
6. Chuẩn bị rollback, broker outage, restart sau commit và replay completed; bàn giao payload/trace cho consumer owner, không viết consumer thay họ.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt version/fields/partition key và delivery mechanism với consumers; không tuyên bố publish exactly-once vì producer idempotence.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Order và từng consumer chốt schema version, partition key, delivery/recovery. Producer idempotence không đồng nghĩa exactly-once business; không hứa guarantee chưa có bằng chứng.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-25](BE-25.md) | Trần Đức Anh | POST orders, orderCode, snapshot items, trạng thái ban đầu, payment info và version/state transition hợp lệ. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-11](BE-11.md) | Mai Sơn Việt | Topic config và producer/consumer factory/config; ranh giới retry/DLQ bàn giao cho INT-46. | Chốt contract/cấu hình trước khi viết phần phụ thuộc; nghiệm thu bằng bản upstream đã bàn giao. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [BE-39](BE-39.md), [INT-43](INT-43.md), [INT-44](INT-44.md), [INT-45](INT-45.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Order mutation commit hợp lệ, producer publish và consumer đọc payload | Event đúng loại/snapshot/identity và khớp Order persisted; payload đủ cho consumer đã xác nhận |
| AC-02 | Transaction Order rollback | Không phát sự kiện thành công |
| AC-03 | Kafka tạm lỗi | Event không bị mất im lặng |
| AC-04 | Completed phát lại | Giữ event identity, không gây cộng điểm lần hai |
| AC-05 | Rollback Order hoặc crash sau DB commit trước broker ack | Rollback không có success event; commit chưa publish còn đường recovery bền vững |
| AC-06 | Broker khôi phục và retry completed cùng logical event | Không mất event; giữ eventId để Loyalty dedup, không tạo earn lần hai |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Event examples và DB→publish→replay/correlation trace, failure recovery.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao schema/event samples redacted, commit-publish recovery timeline và consumer acknowledgements; INT-56 đã gộp, không mở lại task.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

INT-56: Order → Notification: order created/status/completed/cancelled email events

Không mở lại các ID đã gộp; phần việc gộp phải được kiểm chứng cùng task đích.

## 10. Tài liệu và source cần đọc

- [backend/cart-order-service](../../backend/cart-order-service)
- [architechture/tasks/BE-25.md](../../architechture/tasks/BE-25.md)
- [architechture/tasks/BE-26.md](../../architechture/tasks/BE-26.md)
- [architechture/tasks/INT-43.md](../../architechture/tasks/INT-43.md)
- [architechture/tasks/INT-44.md](../../architechture/tasks/INT-44.md)
- [architechture/tasks/INT-45.md](../../architechture/tasks/INT-45.md)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Trần Đức Anh
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 03/11/2026 08:00
**Deadline:** 03/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4509 / reczz28Rid5Xk0zO
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5Xk0zO
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
