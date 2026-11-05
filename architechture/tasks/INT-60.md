# [INT-60] Email delivery metrics/logging correlation across services

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Mai Sơn Việt |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 03/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công dự kiến | 3 SP / 4 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Vận hành truy được một email từ event nguồn đến lần gửi/retry/FAILED mà không cần xem secret.

## 2. Phạm vi

### Bao gồm

- Correlated email delivery logs/metrics và hướng dẫn điều tra.
- Bàn giao theo phạm vi gốc: Correlation observability.

### Không bao gồm

Không hệ thống observability mới ngoài phạm vi hoặc đọc inbox khách.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

KafkaLogging/SafeLog và observability docs đã có; Notification KafkaConfig hiện recoverer yêu cầu durable DLQ, không phải publisher đã hoàn chỉnh. Trace phải nối đến email outcome thực, không dừng ở log producer.

- [backend/notification-service](../../backend/notification-service)
- [architechture/docs/observability.md](../../architechture/docs/observability.md)
- [architechture/tasks/BE-62.md](../../architechture/tasks/BE-62.md)
- [architechture/tasks/BE-66.md](../../architechture/tasks/BE-66.md)
- [architechture/tasks/BE-67.md](../../architechture/tasks/BE-67.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | eventId/messageId/correlationId từ producer, BE-62/67 logs và BE-15 request context. |
| Đầu ra / contract | Correlated email delivery logs/metrics và hướng dẫn điều tra. |
| Điểm giao tiếp / deliverable đã cam kết | Correlation observability |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

correlationId truy luồng, eventId định danh nghiệp vụ, messageId định danh lần gửi logic, attempt định danh retry. Outcome enqueue/render/SMTP accepted/failure/unknown khác inbox delivered; metrics labels không dùng recipient/eventId làm cardinality cao.

## 4. Thứ tự thực hiện cụ thể

1. Map ID qua producer→Kafka→Notification→renderer→sender→email log; xác định ID nào đã có/chưa propagate.
2. Chốt metric names/labels/outcomes với owner observability, tận dụng logging/runtime hiện có, không dựng monitoring stack mới.
3. Nối context qua async listener và dọn context sau xử lý để không gán correlation của request trước.
4. Ghi attempt/duration/error category an toàn, mask recipient theo policy và loại password/OTP/body variables nhạy cảm.
5. Soạn runbook truy một success và một failure/retry bằng IDs, phân biệt SMTP accepted với inbox evidence cần mailbox được phép.
6. Bàn giao missing-correlation, concurrent messages và retry traces; thiếu sender thật ghi blocked phần delivery, không tạo log success synthetic.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt metric names/labels và cardinality; không dùng recipient/raw variables làm label không kiểm soát.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Notification/observability chốt missing-ID policy, labels và retention. Không log raw email/template variables để thuận tiện debug; log thiếu correlation không được gán nhầm message khác.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-62](BE-62.md) | Cao Tất Thành | email_logs/mail_templates persistence; QUEUED/SENDING/SENT/FAILED, retry_count/last_error an toàn. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-67](BE-67.md) | Mai Sơn Việt | Durable failure publication/DLQ và masked logging cho email delivery. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-15](BE-15.md) | Lê Phú Thịnh | Health/info an toàn, filter tạo/propagate correlationId và log context. | Chốt contract/cấu hình trước khi viết phần phụ thuộc; nghiệm thu bằng bản upstream đã bàn giao. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** Chưa có task khai báo phụ thuộc trong snapshot.

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Một nghiệp vụ gửi email và một nghiệp vụ thất bại/retry được trace end-to-end | IDs nối đúng, outcome/attempt/duration rõ, không tuyên bố delivered chỉ từ accepted |
| AC-02 | Retry | Cùng identity message, attempt khác rõ |
| AC-03 | Missing correlation | Có xử lý theo contract, không gán nhầm request khác |
| AC-04 | Log lỗi | Không lộ OTP/App Password |
| AC-05 | Hai message xử lý đồng thời, một message thiếu correlation | Không nhiễm context; missing ID có policy nhất quán và trace không gán người khác |
| AC-06 | SMTP exception hoặc renderer chứa marker nhạy cảm | Log/API/evidence không chứa marker; metrics không dùng recipient làm label |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Trace success/failure/retry đã mask và hướng dẫn query IDs.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao trace map, metric label dictionary và runbook điều tra đã mask; không gửi email thật trong lượt viết tài liệu.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [backend/notification-service](../../backend/notification-service)
- [architechture/docs/observability.md](../../architechture/docs/observability.md)
- [architechture/tasks/BE-62.md](../../architechture/tasks/BE-62.md)
- [architechture/tasks/BE-66.md](../../architechture/tasks/BE-66.md)
- [architechture/tasks/BE-67.md](../../architechture/tasks/BE-67.md)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Mai Sơn Việt
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 03/11/2026 08:00
**Deadline:** 04/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4632 / reczz28Rqzs2MtCN
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rqzs2MtCN
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
