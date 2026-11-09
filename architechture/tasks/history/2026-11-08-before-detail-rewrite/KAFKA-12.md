# [KAFKA-12] Xử lý sự kiện Order, Payment để tạo thông báo và yêu cầu gửi email đúng người, chống trùng và không rollback nghiệp vụ khi email lỗi

> LƯU TRỮ trước biên soạn 08/11: không giao lại hoặc tính SP. Xem [task hiện hành](../../KAFKA-12.md).

## Story Point kế hoạch — sizing lại 08/11/2026

**SP hiện hành: 8.** Thay cho 8 SP nguồn trước sizing. **Cơ sở:** Orchestration nhiều event thành notification/email, mapping recipient/template, replay protection và không rollback nghiệp vụ; không tính lại SMTP, renderer hoặc scheduler ở BE-60/62.

Tính toàn bộ phạm vi đang cam kết, gồm implementation, tích hợp và dev tự test/sửa lỗi một lần; không phải remaining hoặc xác nhận đã làm. Không giảm AC/security, không tính thời gian chờ hay phần HOÃN. SP không quy đổi thành giờ; giờ công/tiến độ/lịch trong metadata vẫn là snapshot. Đây là ước lượng kế hoạch từ rà backlog, chưa phải kết quả planning poker được cả nhóm xác nhận.

Ưu tiên SP này khi metadata bên dưới khác; [bảng sizing và mốc so sánh](../../../docs/Sprint_2_Story_Points_2026-11-08.md). Chỉ cập nhật repository, chưa đồng bộ Lark.

## Phân loại hiện hành — 07/11/2026

| Thuộc tính | Giá trị hiện hành |
|---|---|
| Mã | KAFKA-12 |
| Loại | TASK — task chính, không có parent/subtask |
| Nhóm | KAFKA |
| Mã gốc | BE-39 |
| Dependency triển khai | [KAFKA-01](../../KAFKA-01.md), [BE-38](../../BE-38.md), [BE-62](../../BE-62.md), [KAFKA-02](../../KAFKA-02.md), [KAFKA-03](../../KAFKA-03.md) |
| Nhận thêm phạm vi/AC/DoD | INT-50, INT-52, TEST-16, TEST-22, TEST-23, TEST-24 |
| Ước lượng | 8 SP kế hoạch — sizing lại 08/11; giờ công chưa sizing lại |

Áp dụng [phân loại 07/11](../../../docs/Backlog_Reclassification_2026-11-07.md). Metadata/lịch/nhãn cũ bên dưới là lịch sử, bị thay thế khi khác bảng hiện hành. AC/DoD nhận thêm ở cuối file thuộc TASK này, không phải subtask. Chưa đồng bộ Lark, chưa xác nhận nghiệm thu mới.

Phạm vi/AC/DoD nhận thêm thay thế các câu loại trừ hoặc giao cho INT/TEST cũ khi cùng phạm vi. Mục HOÃN vẫn hoãn; không tự đưa vào sprint hoặc bỏ yêu cầu bảo mật. Các ID cũ trong lời văn chỉ để truy vết, không đổi tên máy móc thành một task domain khác.


> Detail viết lại theo mẫu đã duyệt ngày 03/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Cao Tất Thành |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 03/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công snapshot trước sizing | 8 SP / 12 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Làm xong task này thì dùng được gì?

Sự kiện Order/Payment đã commit được Notification tiếp nhận, tạo thông báo đúng người và yêu cầu email đúng template. Replay cùng sự kiện không tạo thêm thông báo hay email job; email lỗi được theo dõi/retry có giới hạn, không đảo ngược nghiệp vụ đơn/thanh toán.

Nhận phần gộp INT-42, INT-59, TEST-21 về consumer orchestration và replay protection. **promotion.approved/email promotion vẫn hoãn theo KAFKA-04, KAFKA-11** dù tên task gộp lịch sử có promotion.*; không tuyên bố đã nhận mọi event hoặc tự thêm public send-mail API.

## 2. Bắt đầu từ đâu?

Đối chiếu source ngày 03/11, chưa chạy Kafka/SMTP; đường dẫn tính từ gốc repo.

| Vị trí | Có gì / thiếu gì |
|---|---|
| `backend/notification-service/src/main/java/com/clucky/notificationservice/dto/DomainEvent.java`, `mapper/EventMapper.java` | Envelope và kiểm tra payload dạng object; chưa phải listener xử lý nghiệp vụ |
| Cùng package: `dto/EmailMessage.java` | messageId/eventId/correlationId/recipient/template/variables có validation, toString che recipient/variables; phải kích hoạt validation ở boundary consumer |
| Cùng package: `config/MailSenderConfig.java`, `MailSenderProperties.java`, `logging/KafkaLogging.java` | Cấu hình/log hooks, không chứng minh có SMTP sender/template renderer/orchestrator hoàn chỉnh |
| `backend/notification-service/src/main/resources/db/migration/V2__domain_schema.sql` | email_logs.message_id unique, event_id không unique; notifications chưa có eventId/khóa dedup |
| BE-62, BE-66; KAFKA-02, KAFKA-03 | Persistence/retry và producer contract cần nhận thật, không xem template là dependency đã hoàn tất |

## 3. Contract event → notification/email

Envelope giữ eventId, correlationId, eventType, sourceService, occurredAt và payload đúng phiên bản. Order có nhóm order.created/status-changed/completed/cancelled theo KAFKA-02; Payment có payment.confirmed/failed theo KAFKA-03. Mismatch/expired/refund phải dùng event mapping đã chốt với producer, không tự đặt thêm topic/type.

PIC cần bàn giao bảng cho từng event được hỗ trợ: nguồn → điều kiện gửi → người nhận → kênh in-app/email → refId → template/variables → khóa operation. Có event không gửi một kênh phải ghi rõ chủ đích, không âm thầm bỏ vì chưa viết handler. Recipient/userId đến từ snapshot hoặc lookup tin cậy theo contract; không gửi về một email fallback tùy ý khi payload thiếu.

Một event có thể có nhiều người nhận/kênh. Khóa chống lặp phải đủ phân biệt event + recipient + channel + loại thông báo/template theo mapping được duyệt; **không đặt unique eventId toàn cục** rồi làm mất những delivery hợp lệ khác. messageId phải ổn định qua replay, không random lại mỗi lần consume. Cơ chế dedup in-app cũng cần lưu bền vững, không chỉ dựa email_logs hoặc cache bộ nhớ.

Trạng thái email theo BE-62, BE-66 gồm QUEUED/SENDING/SENT/FAILED. Chốt SENT nghĩa SMTP chấp nhận gửi, không mặc định là email đã tới inbox. SMTP là side effect ngoài transaction DB: nếu server đã nhận nhưng client timeout thì có trạng thái không xác định; không hứa exactly-once inbox bằng unique constraint trong DB.

## 4. Thứ tự triển khai cụ thể

1. Nhận payload fixture từ KAFKA-02, KAFKA-03, lập bảng mapping từng event và schema validation. Chốt template/biến với BE-65, đầu ra SMTP/KAFKA-08 theo phần liên quan; đây là phối hợp, không tự đổi dependency kế hoạch.
2. Nối listener bằng Kafka config sẵn có, validate envelope và payload trước xử lý. Phân biệt unsupported event có chủ đích, payload sai, thiếu recipient/template và lỗi tạm thời. Tất cả có đường theo dõi; không catch rồi ack thành công khi chưa lưu được kết quả/xử lý lỗi bền vững.
3. Với event hợp lệ, xác định recipient và operation key ổn định. Trong transaction tạo notification và email intent/log theo các kênh được mapping; ghi dedup cùng transaction. Nếu schema thiếu, thêm migration mới cho khóa/lưu intent phù hợp, không sửa migration cũ.
4. Chỉ ack Kafka sau khi kết quả hoặc đường xử lý lỗi đã được lưu bền vững theo policy. Crash sau DB commit trước ack phải replay an toàn; nếu enqueue qua broker khác, cần phương án durable handoff đã chốt để không mất email giữa commit và publish.
5. Worker/sender nhận intent đã commit, claim một lần theo cơ chế cạnh tranh của BE-66, render template rồi gọi Mail Sender bằng App Password từ environment/Config Server. Không giữ transaction DB mở chờ SMTP và không dùng Gmail credential của khách.
6. Cập nhật trạng thái, retry_count/last_error an toàn, thời điểm gửi; retry có giới hạn/backoff/DLQ theo BE-66. Có đường phục hồi SENDING bị treo và ca gửi không xác định, không retry vô hạn hoặc tự đánh SENT để làm sạch hàng đợi.
7. Replay chỉ hoàn tất delivery còn thiếu theo state; không tạo lại in-app unread khi email thất bại hoặc khi người dùng đã đọc. Giữ correlation để truy vết Order → event → notification/log; không log OTP/token/App Password hoặc toàn bộ payload chứa dữ liệu cá nhân.
8. Bàn giao BE-38/INT-11 record in-app thật và log cho các task quan sát email. Email thất bại chỉ ảnh hưởng delivery, không gọi bù trừ để hủy đơn/thanh toán đã thành công.

## 5. Điểm cần chốt và giới hạn cam kết

| Quyết định | Owner / phần bị chặn |
|---|---|
| Mapping chính xác event → người nhận/kênh/template, nguồn email và biến bắt buộc | Cao Tất Thành cùng KAFKA-02, KAFKA-03, BE-65; chặn gửi thật, không suy diễn ai cần nhận |
| Operation key, unique constraint, lưu dedup in-app và durable enqueue | Notification cùng BE-62, BE-66; chặn replay/crash recovery, không chỉ dùng eventId global |
| Timeout/unknown SMTP, lease SENDING, retry limit và thao tác recovery | Notification cùng BE-66/KAFKA-08; phải nêu cửa sổ có thể gửi trùng khi SMTP outcome không xác định và cách xử lý |
| Payload invalid/missing template gửi DLQ hay quarantine, ai xử lý lại? | Owner Notification/Kafka; chặn kết luận không mất event hoặc poison-message loop |
| Event cũ/out-of-order và template thay phiên bản ảnh hưởng messageId ra sao? | Notification cùng producer; không đổi identity khi replay chỉ vì code/template mới |

## 6. Dependency và bàn giao

> Bảng handoff bên dưới giữ tham chiếu trước gộp. Dependency triển khai hiện hành là bảng đầu file; ID INT/TEST cũ chỉ là truy vết qua trang chuyển hướng, không phải task phải giao lại.

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [KAFKA-01](../../KAFKA-01.md) | Mai Sơn Việt | Topic config và producer/consumer factory/config; ranh giới retry/DLQ bàn giao cho KAFKA-08. | Chốt contract/cấu hình trước khi viết phần phụ thuộc; nghiệm thu bằng bản upstream đã bàn giao. |
| [BE-38](../../BE-38.md) | Cao Tất Thành | My notifications pagination và trạng thái read/read-all nhất quán. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-62](../../BE-62.md) | Cao Tất Thành | email_logs/mail_templates persistence; QUEUED/SENDING/SENT/FAILED, retry_count/last_error an toàn. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-66](../../BE-66.md) | Cao Tất Thành | Backoff hữu hạn, retry_count, terminal FAILED và retry idempotent. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [KAFKA-02](../../KAFKA-02.md) | Trần Đức Anh | order.created/status-changed/completed/cancelled với payload ổn định và đường retry bền vững. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [KAFKA-03](../../KAFKA-03.md) | Lê Phú Thịnh | Payment event contract/producer cho Order/Notification/Report. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |

Có thể chuẩn bị mapping/fixture trước. Chỉ nghiệm thu consumer end-to-end sau khi producer, persistence và sender/retry thực sự sẵn sàng; thời hạn giống nhau không chứng minh upstream đã bàn giao. promotion vẫn ngoài phạm vi hiện tại.

**Task nhận đầu ra theo dependency đã khai báo:** [INT-11](../../INT-11.md), [INT-50](../../INT-50.md), [INT-52](../../INT-52.md), [KAFKA-11](../../KAFKA-11.md), [UI-51](../../UI-51.md), [TEST-22](../../TEST-22.md), [TEST-23](../../TEST-23.md)

## 7. Tiêu chí nghiệm thu có tình huống lỗi

Chưa chạy Kafka/SMTP trong lần viết detail. Fixture E1 có một recipient và hai kênh nếu mapping đó được duyệt; event khác hoặc nhiều recipient dùng số delivery đúng bảng mapping.

| AC | Chuẩn bị / thao tác | Kết quả cần quan sát |
|---|---|---|
| AC-01 | Phát E1 hợp lệ từ producer, để sender xử lý | Có notification đúng user/refId, email log/messageId/template đúng; trạng thái gửi phản ánh SMTP outcome, không lộ secret |
| AC-02 | Replay E1 nhiều lần/đồng thời/sau restart khi đã xử lý thành công | Một in-app và một email job theo mapping; không gửi lại delivery đã SENT hoặc reset notification đã đọc |
| AC-03 | Một event có hai recipient hợp lệ hoặc hai kênh | Tạo đủ các delivery khác nhau; dedup không làm mất người nhận thứ hai hoặc kênh email |
| AC-04 | Crash sau DB commit trước ack; phát lại cùng event | Không mất intent/notification, không thêm bản trùng; tiếp tục delivery chưa hoàn thành |
| AC-05 | SMTP trả lỗi xác định trước khi chấp nhận | FAILED/retry hữu hạn theo policy, last_error an toàn; Order/Payment giữ trạng thái nghiệp vụ, không tạo thêm in-app mỗi lần retry |
| AC-06 | Thiếu recipient/template hoặc payload sai | Không gửi sai người; event được retry/quarantine/DLQ theo phân loại, có evidence truy vết, không ack mất dấu |
| AC-07 | SMTP đã nhận nhưng client timeout, hoặc worker treo SENDING | Ghi nhận/khôi phục đúng policy unknown outcome; không khẳng định chắc chắn chưa gửi, có giới hạn retry và trách nhiệm xử lý |
| AC-08 | DB lỗi khi ghi notification/dedup/email intent | Không commit một phần trái contract; không ack thành công trước durable handoff; retry tạo đúng số kết quả |

## 8. Checklist bàn giao

- [ ] Bảng event/recipient/template/key được producer và consumer thống nhất; đánh dấu promotion deferred rõ ràng.
- [ ] Có migration/constraint và cơ chế ack/enqueue/claim/recovery phù hợp, không chỉ test replay trong cùng process.
- [ ] Evidence AC-01–08 gồm eventId/correlationId đã làm sạch, record/log counts trước-sau và retry/crash; inbox thực chỉ kiểm tra bằng tài khoản test được phép.
- [ ] Gộp INT-42, INT-59 và TEST-21 vào evidence này, không mở task riêng hoặc tuyên bố exactly-once SMTP không có cơ sở.
- [ ] Ghi commit/môi trường/kết quả thực tế/bug có PIC và giới hạn còn lại; gộp TEST-15 cho critical path notification/email.

## 9. Truy vết gộp task

INT-42: Consumer: notification nhận mọi event (order.*, payment.*, promotion.*); INT-59: Notification email consumer idempotency + Kafka replay protection; TEST-21: Kafka replay does not send duplicate email

Không mở lại các ID đã gộp; phần việc gộp phải được kiểm chứng cùng task đích.

## 10. Tài liệu và source cần đọc

- [SRS](../../../docs/SRS.md), [Kiến trúc](../../../docs/Kiến%20trúc%20hệ%20thống.md), [API — Mail Sender](../../../docs/Đặc%20tả%20API.md), [Schema](../../../database/schema.sql).
- [Source Notification](../../../../backend/notification-service/src/main/java/com/clucky/notificationservice), [Migrations](../../../../backend/notification-service/src/main/resources/db/migration).
- [Order producer KAFKA-02](../../KAFKA-02.md), [Payment producer KAFKA-03](../../KAFKA-03.md), [Persistence BE-62](../../BE-62.md), [Retry BE-66](../../BE-66.md), [Template BE-65](../../BE-65.md).
- [Backlog và ước lượng](../../../../docs/backlog.md), [Error catalog](../../../../contracts/errors.json).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Cao Tất Thành
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 03/11/2026 08:00
**Deadline:** 04/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại (snapshot trước phân loại):** Task
**Mã Lark:** Mail-4491 / reczz28Rid5XkynV
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5XkynV
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 8 SP
**Time Estimated:** 12 giờ công
**Remaining Estimate:** 12 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Đã gồm INT-42/59 và TEST-21; orchestration/replay protection dùng persistence BE-62 và retry BE-66, không triển khai lại chúng.

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

## Phạm vi, AC và DoD nhận từ INT-50 — Payment timeout: QR expires → order/payment expired → notify customer

**Đầu mối nghiệm thu:** [BE-29](../../BE-29.md); **phối hợp:** [BE-30](../../BE-30.md), [BE-25](../../BE-25.md), [BE-44](../../BE-44.md), [KAFKA-03](../../KAFKA-03.md), [KAFKA-12](../../KAFKA-12.md), [UI-19](../../UI-19.md).

Đây là scope của TASK chính, không phải subtask mới. Dev tự test phần thuộc task này; đầu mối tổng hợp evidence xuyên luồng một lần, các task phối hợp dùng chung. Giữ toàn bộ AC/checklist để không mất trường hợp; không yêu cầu mỗi dev chạy lặp toàn bộ luồng.

Phạm vi/contract/fixture đầy đủ nằm trực tiếp tại [BE-29](../../BE-29.md), mục nhận từ INT-50. Task này giữ đầu ra domain của mình và thực hiện AC liên quan dưới đây, không trở thành task kiểm thử riêng.

### AC kế thừa INT-50

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| INT-50/AC-01 | Payment PENDING tới hạn, job xử lý rồi Customer reload | Trạng thái server/Order/thông báo đúng mapping đã duyệt, timer không tự cấp thêm hạn |
| INT-50/AC-02 | Webhook thắng race trước expiry | Không đổi payment PAID thành EXPIRED |
| INT-50/AC-03 | Timeout chạy lại | Không hủy/thông báo trùng |
| INT-50/AC-04 | QR hết hạn | UI không coi timer reset là payment mới |
| INT-50/AC-05 | Webhook confirm commit trước expiry và thứ tự ngược lại | Không PAID→EXPIRED; late payment đi policy đối soát, không mất giao dịch |
| INT-50/AC-06 | Scheduler/replay xử lý cùng payment nhiều lần | Không hủy/notify lặp, durable trace chỉ ra outcome cuối |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

### DoD và evidence kế thừa INT-50

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Controlled-clock cases, webhook-vs-timeout race và Order/payment/notification trace.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng INT-50/AC-01 đến INT-50/AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao boundary/race matrix, clock fixture và state/event readback, không dùng UI countdown làm bằng chứng scheduler.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

**Quy tắc hiện hành ưu tiên:** PIC task nhận chịu phần việc của mình; đầu mối trên điều phối AC chung. ID/PIC/lịch/dependency INT/TEST trong nội dung kế thừa chỉ truy vết lịch sử, không yêu cầu giữ record cũ. Không cộng nguyên SP/giờ gói cũ; phần phát sinh cần PIC rà estimate. Không suy ra đã test hoặc đổi trạng thái vì chuyển nội dung.

**Giữ quyết định Payment 04/11:** signature/idempotency, không xác nhận nhầm và ghi nhận bền vững vẫn bắt buộc. Quy trình tra soát thiếu/thừa tiền, sai nội dung, tiền đến muộn/hủy và giao dịch chuyển thêm vẫn hoãn; AC late-payment/đối soát không cho phép tự reopen, chuyển tiền hay triển khai policy chưa duyệt.

## Phạm vi, AC và DoD nhận từ INT-52 — Tích hợp refund: duyệt/từ chối, cập nhật thanh toán, thông báo và nghiệm thu

**Đầu mối nghiệm thu:** [BE-46](../../BE-46.md); **phối hợp:** [BE-26](../../BE-26.md), [BE-32](../../BE-32.md), [UI-24](../../UI-24.md), [KAFKA-03](../../KAFKA-03.md), [KAFKA-12](../../KAFKA-12.md).

Đây là scope của TASK chính, không phải subtask mới. Dev tự test phần thuộc task này; đầu mối tổng hợp evidence xuyên luồng một lần, các task phối hợp dùng chung. Giữ toàn bộ AC/checklist để không mất trường hợp; không yêu cầu mỗi dev chạy lặp toàn bộ luồng.

Phạm vi/contract/fixture đầy đủ nằm trực tiếp tại [BE-46](../../BE-46.md), mục nhận từ INT-52. Task này giữ đầu ra domain của mình và thực hiện AC liên quan dưới đây, không trở thành task kiểm thử riêng.

### AC kế thừa INT-52

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| INT-52/AC-01 | Request hợp lệ → approve → bước xử lý được xác nhận → REFUNDED | Từng state có evidence riêng, chỉ bước cuối thông báo đã hoàn tiền |
| INT-52/AC-02 | Reject thiếu điều kiện/lý do theo contract | Không ghi thành công giả |
| INT-52/AC-03 | Duplicate approve/refund | Không hoàn/notify hai lần |
| INT-52/AC-04 | Manager quán A duyệt B | Bị chặn |
| INT-52/AC-05 | Hai tab approve/reject hoặc retry mark-refunded | Một outcome hợp lệ theo concurrency rule, không hoàn/notify lặp |
| INT-52/AC-06 | Manager A duyệt B, STAFF approve hoặc reject thiếu reason bắt buộc | Không đổi state trái quyền/validation, UI giữ nội dung để sửa |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

### DoD và evidence kế thừa INT-52

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Full state sequence, permission/replay cases, order/payment/email/audit evidence.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng INT-52/AC-01 đến INT-52/AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao state ownership map, evidence từng bước và regression gộp INT-66/TEST-03/11; không mở lại các ID đã gộp.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

**Quy tắc hiện hành ưu tiên:** PIC task nhận chịu phần việc của mình; đầu mối trên điều phối AC chung. ID/PIC/lịch/dependency INT/TEST trong nội dung kế thừa chỉ truy vết lịch sử, không yêu cầu giữ record cũ. Không cộng nguyên SP/giờ gói cũ; phần phát sinh cần PIC rà estimate. Không suy ra đã test hoặc đổi trạng thái vì chuyển nội dung.

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

## Phạm vi, AC và DoD nhận từ TEST-22 — OTP/order/payment/refund email E2E flows

**Đầu mối nghiệm thu:** [KAFKA-12](../../KAFKA-12.md); **phối hợp:** [BE-16](../../BE-16.md), [BE-17](../../BE-17.md), [BE-60](../../BE-60.md), [BE-64](../../BE-64.md), [BE-65](../../BE-65.md), [BE-62](../../BE-62.md), [BE-66](../../BE-66.md), [BE-46](../../BE-46.md), [KAFKA-02](../../KAFKA-02.md), [KAFKA-03](../../KAFKA-03.md).

Đây là scope của TASK chính, không phải subtask mới. Dev tự test phần thuộc task này; đầu mối tổng hợp evidence xuyên luồng một lần, các task phối hợp dùng chung. Giữ toàn bộ AC/checklist để không mất trường hợp; không yêu cầu mỗi dev chạy lặp toàn bộ luồng.

### Phạm vi, contract và cách tự kiểm thử được chuyển đầy đủ

#### 1. Mục tiêu nghiệp vụ

Email OTP/order/payment/status/refund đúng người nhận, template và state thật sau nghiệp vụ.

#### 2. Phạm vi

##### Bao gồm

- E2E email matrix từ event/auth tới SMTP outcome và nội dung nhận được.
- OTP/order/payment/status/refund email đúng người nhận/template/state; promotion.approved theo backlog KAFKA-11.

##### Không bao gồm

promotion.approved thuộc KAFKA-11 backlog; không gửi thử tới khách thật không được phép.

##### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

BE-60, BE-61, BE-65, BE-66 và BE-78 là đầu vào sender/template/retry/trace. MailSenderProperties/config hoặc template file tồn tại chưa chứng minh SMTP gửi hay inbox nhận; dùng mailbox test được cho phép.

- [architechture/tasks/BE-60.md](../../../../architechture/tasks/BE-60.md)
- [architechture/tasks/BE-61.md](../../../../architechture/tasks/BE-61.md)
- [architechture/tasks/BE-65.md](../../../../architechture/tasks/BE-65.md)
- [architechture/tasks/BE-66.md](../../../../architechture/tasks/BE-66.md)
- [architechture/tasks/BE-78.md](../../../../architechture/tasks/BE-78.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

#### 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | INT-05, INT-09, INT-52, KAFKA-12, BE-64, BE-65, controlled recipients và email_logs. |
| Đầu ra / contract | E2E email matrix từ event/auth tới SMTP outcome và nội dung nhận được. |
| Điểm giao tiếp / deliverable đã cam kết | Email E2E |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

##### Mapping phải ghi trước khi nối luồng

Case nghiệp vụ OTP/register/reset/order/payment/refund → recipient/template/purpose → event/message/correlation → email log/SMTP outcome → mailbox evidence. APPROVED khác REFUNDED; accepted khác delivered/inbox, ghi thời điểm và mức chứng cứ.

#### 4. Thứ tự thực hiện cụ thể

1. Chốt mailbox/sender test và danh sách template version với owner; chưa có credential cấu hình an toàn thì blocked, không dùng Gmail khách.
2. Lập expected subject/body variables/recipient/state từ contract, gồm OTP purpose/expiry và refund semantic; không lưu OTP thật trong fixture report.
3. Mô tả tạo từng nghiệp vụ bằng API/UI thật, ghi IDs để nối producer→render→send→email log.
4. Đối chiếu mailbox test với log, kiểm link/reference/locale/escaping và không có dữ liệu khách khác; SMTP accepted không tự ghi inbox delivered.
5. Thêm replay event, recipient sai/thiếu và delayed delivery/expiry, theo policy dedup/unknown outcome, không resend vô hạn tới mailbox thật.
6. Bàn giao evidence đã mask, timing/outcomes và bug/PIC/retest; người dùng mới thực hiện gửi mail khi cho phép.

#### 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Bổ sung template BE-65 và sender/recipient bàn giao; phân biệt SMTP accepted với mail đến inbox/spam.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

##### Quyết định có owner và phần bị chặn

PIC Notification/domain chốt event-template map, expiry và delivery observation window. Không nhận được inbox chưa đủ kết luận không gửi; phân loại accepted/spam/unknown theo chứng cứ.

### Handoff nghiệm thu phần gộp

[BE-17](../../BE-17.md), [BE-16](../../BE-16.md), [UI-09](../../UI-09.md), [BE-29](../../BE-29.md), [BE-30](../../BE-30.md), [BE-32](../../BE-32.md), [BE-44](../../BE-44.md), [UI-19](../../UI-19.md), [UI-30](../../UI-30.md), [UI-44](../../UI-44.md), [BE-46](../../BE-46.md), [BE-26](../../BE-26.md), [UI-24](../../UI-24.md), [KAFKA-03](../../KAFKA-03.md)

Đây là đầu vào phối hợp AC, không tạo tự phụ thuộc hoặc tự đổi lịch triển khai. Dependency triển khai hiện hành ở đầu task; owner phối hợp giữ trách nhiệm domain của mình.

### AC kế thừa TEST-22

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| TEST-22/AC-01 | Mỗi nghiệp vụ trong matrix phát email tới mailbox test được phép | Recipient/template/state đúng, IDs nối được; ghi rõ accepted hay thực nhận |
| TEST-22/AC-02 | Refund mới approved | Không nhận email nói đã hoàn tiền |
| TEST-22/AC-03 | Replay event | Không nhận email trùng theo policy |
| TEST-22/AC-04 | OTP/reset | Đúng purpose/recipient/expiry, không lộ log |
| TEST-22/AC-05 | Refund chỉ APPROVED hoặc OTP/reset khác purpose | Không nói đã hoàn tiền trước REFUNDED, OTP đúng mục đích/expiry và không lộ log |
| TEST-22/AC-06 | Replay cùng logical message hoặc delayed SMTP outcome | Không gửi trùng ngoài policy, duplicate/unknown được trace minh bạch |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

### DoD và evidence kế thừa TEST-22

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Event/template matrix, masked email examples và log/message IDs.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- [ ] Ghi kết quả riêng TEST-22/AC-01 đến TEST-22/AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao event-template-recipient matrix và log/mailbox evidence redacted, không chứa OTP/password thật; chưa gửi SMTP trong lượt này.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

**Quy tắc hiện hành ưu tiên:** PIC task nhận chịu phần việc của mình; đầu mối trên điều phối AC chung. ID/PIC/lịch/dependency INT/TEST trong nội dung kế thừa chỉ truy vết lịch sử, không yêu cầu giữ record cũ. Không cộng nguyên SP/giờ gói cũ; phần phát sinh cần PIC rà estimate. Không suy ra đã test hoặc đổi trạng thái vì chuyển nội dung.

## Phạm vi, AC và DoD nhận từ TEST-23 — Email failure does not rollback order/payment

**Đầu mối nghiệm thu:** [KAFKA-12](../../KAFKA-12.md); **phối hợp:** [BE-25](../../BE-25.md), [BE-30](../../BE-30.md), [BE-32](../../BE-32.md), [BE-46](../../BE-46.md), [BE-60](../../BE-60.md), [BE-66](../../BE-66.md), [BE-67](../../BE-67.md).

Đây là scope của TASK chính, không phải subtask mới. Dev tự test phần thuộc task này; đầu mối tổng hợp evidence xuyên luồng một lần, các task phối hợp dùng chung. Giữ toàn bộ AC/checklist để không mất trường hợp; không yêu cầu mỗi dev chạy lặp toàn bộ luồng.

### Phạm vi, contract và cách tự kiểm thử được chuyển đầy đủ

#### 1. Mục tiêu nghiệp vụ

Gmail lỗi không làm rollback hoặc báo thất bại giả cho Order/Payment đã commit.

#### 2. Phạm vi

##### Bao gồm

- Failure-isolation evidence, retry hữu hạn và email FAILED state.
- Gmail lỗi/timeout không rollback order/payment; log FAILED và retry có giới hạn.

##### Không bao gồm

Không tắt email rồi coi đó là thử lỗi; không dùng mock Order thay persistence thật.

##### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Notification delivery là downstream, không được rollback Order/Payment đã commit. BE-66, BE-67 và KAFKA-08 cần retry/DLQ bền vững; fault test phải tách với credential production.

- [architechture/tasks/KAFKA-12.md](../../../../architechture/tasks/KAFKA-12.md)
- [architechture/tasks/BE-66.md](../../../../architechture/tasks/BE-66.md)
- [architechture/tasks/BE-67.md](../../../../architechture/tasks/BE-67.md)
- [architechture/tasks/KAFKA-08.md](../../../../architechture/tasks/KAFKA-08.md)
- [backend/notification-service](../../../../backend/notification-service)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

#### 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | BE-66, KAFKA-12, INT-07, INT-09, test SMTP auth/timeout faults và persisted nghiệp vụ. |
| Đầu ra / contract | Failure-isolation evidence, retry hữu hạn và email FAILED state. |
| Điểm giao tiếp / deliverable đã cam kết | Failure isolation test |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

##### Mapping phải ghi trước khi nối luồng

Baseline order/payment committed + message identity → SMTP timeout/auth failure → business state unchanged + delivery failure/retry/DLQ trace. Unknown SMTP outcome không mặc định fail-before-send; retry policy tránh gửi lặp ngoài guarantee.

#### 4. Thứ tự thực hiện cụ thể

1. Chốt môi trường/fault injection adapter hoặc cấu hình test biệt lập và restore plan; không đổi password sender production.
2. Chuẩn bị order/payment hợp lệ và expected persisted states trước fault, ghi correlation/message IDs đã mask.
3. Mô tả gây timeout/auth failure ở sender sau event nghiệp vụ, không thay response Order bằng mock fail.
4. Đối chiếu Order/Payment không rollback hoặc tự hủy, email log lưu failure/attempt và consumer timeout hữu hạn.
5. Khôi phục sender và retry/replay đúng message theo policy; kiểm business records/event effects không nhân đôi, mail unknown xử lý đúng rule.
6. Bàn giao timeline before/fault/recovery cùng bug/PIC, cleanup fault config an toàn; chưa chạy SMTP/Kafka/Order trong lượt detail.

#### 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt retry/backoff và safe fault injection, không thay credential production để test.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

##### Quyết định có owner và phần bị chặn

PIC Notification/Order/Payment chốt timeout budget, retry/terminal và unknown outcome. Không hứa zero duplicate email nếu SMTP acknowledgment bị mất mà contract chưa bảo đảm.

### Handoff nghiệm thu phần gộp

[BE-66](../../BE-66.md), [BE-25](../../BE-25.md), [BE-23](../../BE-23.md), [BE-24](../../BE-24.md), [UI-17](../../UI-17.md), [UI-18](../../UI-18.md), [BE-29](../../BE-29.md), [BE-30](../../BE-30.md), [BE-32](../../BE-32.md), [BE-44](../../BE-44.md), [UI-19](../../UI-19.md), [UI-30](../../UI-30.md), [UI-44](../../UI-44.md)

Đây là đầu vào phối hợp AC, không tạo tự phụ thuộc hoặc tự đổi lịch triển khai. Dependency triển khai hiện hành ở đầu task; owner phối hợp giữ trách nhiệm domain của mình.

### AC kế thừa TEST-23

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| TEST-23/AC-01 | Order/Payment đã commit gặp SMTP auth failure hoặc timeout | Business state giữ đúng, delivery failure có trace và không treo consumer vô hạn |
| TEST-23/AC-02 | SMTP auth sai | Order/payment không đảo ngược |
| TEST-23/AC-03 | Timeout nhiều lần | Consumer không treo vô hạn |
| TEST-23/AC-04 | Khôi phục SMTP/replay | Không tạo thêm order/payment hoặc gửi lặp ngoài policy |
| TEST-23/AC-05 | Fault kéo dài qua retry budget | Có terminal/DLQ bền vững theo policy, không ack mất message hoặc retry không kiểm soát |
| TEST-23/AC-06 | Khôi phục và replay cùng message | Không thêm Order/Payment, email outcome theo idempotency/unknown policy được ghi rõ |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

### DoD và evidence kế thừa TEST-23

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Before/after Order/Payment, email retry timeline và failure/recovery log đã mask.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- [ ] Ghi kết quả riêng TEST-23/AC-01 đến TEST-23/AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao fault/restore plan và state/count before-after cùng email retry evidence; không lưu credential thật hoặc thao tác production.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

**Quy tắc hiện hành ưu tiên:** PIC task nhận chịu phần việc của mình; đầu mối trên điều phối AC chung. ID/PIC/lịch/dependency INT/TEST trong nội dung kế thừa chỉ truy vết lịch sử, không yêu cầu giữ record cũ. Không cộng nguyên SP/giờ gói cũ; phần phát sinh cần PIC rà estimate. Không suy ra đã test hoặc đổi trạng thái vì chuyển nội dung.

## Phạm vi, AC và DoD nhận từ TEST-24 — Secret masking: App Password absent from logs/API

**Đầu mối nghiệm thu:** [BE-57](../../BE-57.md); **phối hợp:** [BE-58](../../BE-58.md), [BE-60](../../BE-60.md), [BE-67](../../BE-67.md), [BE-75](../../BE-75.md), [BE-78](../../BE-78.md), [KAFKA-12](../../KAFKA-12.md).

Đây là scope của TASK chính, không phải subtask mới. Dev tự test phần thuộc task này; đầu mối tổng hợp evidence xuyên luồng một lần, các task phối hợp dùng chung. Giữ toàn bộ AC/checklist để không mất trường hợp; không yêu cầu mỗi dev chạy lặp toàn bộ luồng.

Phạm vi/contract/fixture đầy đủ nằm trực tiếp tại [BE-57](../../BE-57.md), mục nhận từ TEST-24. Task này giữ đầu ra domain của mình và thực hiện AC liên quan dưới đây, không trở thành task kiểm thử riêng.

### AC kế thừa TEST-24

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| TEST-24/AC-01 | Marker test đi qua sender failure và API/log/DLQ theo checklist | Không xuất marker/credential trong sink, vẫn đủ error category/correlation để debug |
| TEST-24/AC-02 | Exception chứa credential | Không xuất giá trị qua response/log |
| TEST-24/AC-03 | .env.example | Chỉ placeholder |
| TEST-24/AC-04 | Evidence screenshot/file | Không chứa secret sau che |
| TEST-24/AC-05 | Tracked .env.example/config và collection/evidence artifacts | Chỉ placeholder/redacted, không private key/token/password thật |
| TEST-24/AC-06 | Phát hiện secret thật trong phạm vi được phép | Ghi vị trí đã mask, thông báo owner xử lý/rotate; không chép secret vào backlog hoặc screenshot |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

### DoD và evidence kế thừa TEST-24

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: File/response/log locations, masked findings và retest outcome.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- [ ] Ghi kết quả riêng TEST-24/AC-01 đến TEST-24/AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao sink coverage và findings redacted với severity/owner/retest; không chạy scanner/runtime fault trong lần biên soạn.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

**Quy tắc hiện hành ưu tiên:** PIC task nhận chịu phần việc của mình; đầu mối trên điều phối AC chung. ID/PIC/lịch/dependency INT/TEST trong nội dung kế thừa chỉ truy vết lịch sử, không yêu cầu giữ record cũ. Không cộng nguyên SP/giờ gói cũ; phần phát sinh cần PIC rà estimate. Không suy ra đã test hoặc đổi trạng thái vì chuyển nội dung.
