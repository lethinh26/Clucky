# [KAFKA-01] Cấu hình topic, producer và consumer Kafka cho các service, thống nhất JSON event, group, serializer và cách xác nhận xử lý

> **Đã đồng bộ Lark 08/11/2026.** Title, scope, AC/DoD và SP kế hoạch đã cập nhật; giữ PIC/trạng thái/sprint/lịch thực tế trên Lark. Các ghi chú “chưa đồng bộ” và tiến độ bên dưới là snapshot lịch sử. [Kết quả đồng bộ và chênh lệch sprint](../docs/Lark_Backlog_Sync_2026-11-08.md).

## Phân loại hiện hành — 07/11/2026

| Thuộc tính | Giá trị hiện hành |
|---|---|
| Mã | KAFKA-01 |
| Loại | TASK — task chính, không có parent/subtask |
| Nhóm | KAFKA |
| Mã gốc | BE-11 |
| Dependency triển khai | [UI-06](UI-06.md) |
| Nhận thêm phạm vi/AC/DoD | Không có gói gộp mới |
| Ước lượng | Giữ snapshot, chưa xác nhận remaining thực tế |

Áp dụng [phân loại 07/11](../docs/Backlog_Reclassification_2026-11-07.md). Metadata/lịch/nhãn cũ bên dưới là lịch sử, bị thay thế khi khác bảng hiện hành. AC/DoD nhận thêm ở cuối file thuộc TASK này, không phải subtask. Chưa đồng bộ Lark, chưa xác nhận nghiệm thu mới.


> Detail viết lại theo mẫu đã duyệt ngày 03/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Mai Sơn Việt |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 1 |
| Bắt đầu → deadline (UTC+7) | 30/10/2026 08:00 → 30/10/2026 23:59 |
| SP / giờ công dự kiến | 5 SP / 6 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Làm xong task này thì được gì?

Mỗi service có cấu hình Kafka dùng được độc lập, gửi/nhận JSON event đúng envelope và giữ eventId/correlationId. Người làm consumer biết lấy topic, group, serializer và ack policy ở đâu, không phải dựng lại factory riêng.

**Bàn giao cấu hình và cách sử dụng, không bàn giao toàn bộ xử lý nghiệp vụ.** Producer idempotent không đồng nghĩa business exactly-once; retry/DLQ bền vững thuộc KAFKA-08, idempotency từng consumer thuộc domain owner.

## 2. Bắt đầu từ đâu?

Đường dẫn tính từ gốc repo; hiện trạng từ đọc source ngày 03/11, chưa kết nối broker.

| Vị trí | Hiện trạng / việc cần làm |
|---|---|
| `backend/identity-service/src/main/java/com/clucky/identityservice/config/KafkaConfig.java` và bản cùng tên ở các service | Có topic declarations và DefaultErrorHandler; dùng làm mẫu đối chiếu, không tạo factory tùy biến khi auto-config đáp ứng |
| `config-repo/application.yml` | Có bootstrap server, String serializer/deserializer, acks=all, producer idempotence, group theo application name, auto commit=false, manual_immediate và read_committed |
| `backend/identity-service/src/main/java/com/clucky/identityservice/dto/DomainEvent.java`, `mapper/EventMapper.java` | Có validate envelope/JSON, serialize, topic từ eventType, aggregate key và header |
| `backend/identity-service/src/main/java/com/clucky/identityservice/logging/KafkaLogging.java` | Hook producer/record consumer dùng auto-config; không tự bao phủ factory tùy biến/batch listener |
| `backend/identity-service/build.gradle` | Đã có spring-kafka; không thêm thư viện để tạo lại tính năng đang có |

## 3. Contract cần bàn giao

### Topic và cấu hình

Danh sách trong KafkaConfig khớp bảng sự kiện kiến trúc: `order.created`, `order.status-changed`, `order.completed`, `order.cancelled`, `payment.confirmed`, `payment.failed`, `promotion.approved`, `audit.recorded`. Không tự thêm topic email hoặc đổi tên topic trong task config; contract email cần owner xác nhận.

| Cấu hình hiện có | Ý nghĩa / giới hạn |
|---|---|
| KAFKA_BOOTSTRAP_SERVERS | Địa chỉ broker từ Config Server/environment, không hardcode trong producer |
| clucky.kafka.partitions / replicas | Mặc định 3 / 1, phải dương; replica phải phù hợp số broker, không coi default local là cấu hình production |
| group-id=${spring.application.name} | Service khác nhau nhận độc lập; nhiều instance cùng service chia partition trong cùng group |
| StringSerializer / StringDeserializer | Value là chuỗi JSON do EventMapper tạo; không gửi object trực tiếp rồi trông chờ StringSerializer xử lý |
| enable-auto-commit=false, manual_immediate | Listener chỉ ack sau khi xử lý thành công; không ack trước transaction nghiệp vụ hoàn tất |
| read_committed, acks=all, enable.idempotence=true | Là thiết lập transport; không tự tạo transaction Kafka/DB hoặc xử lý trùng nghiệp vụ |

### Envelope đang có

`eventId` không rỗng, tối đa 160 ký tự; `correlationId` khớp `[A-Za-z0-9._-]{1,128}`; `eventType`/`sourceService` tối đa 100 ký tự; `occurredAt` là Instant; `payload` là JSON object. EventMapper từ chối body rỗng, JSON lỗi/trailing token, sai expectedEventType và envelope không hợp lệ.

Gửi bằng `eventMapper.toRecord(event, aggregateKey)` để topic=eventType và có `X-Event-ID`/`X-Correlation-ID`. Aggregate key là ID ổn định của cùng đối tượng, không random theo lần gửi. Retry cùng event giữ eventId; correlationId chỉ dùng truy vết, không thay idempotency key.

## 4. Các bước thực hiện

1. Đối chiếu cấu hình chung với bản KafkaConfig trong từng service và tên application; lập bảng service → producer/consumer topic → group theo tài liệu kiến trúc.
2. Dùng KafkaTemplate/factory do Spring Boot cấu hình sẵn. Chỉ tạo bean riêng khi có yêu cầu được chốt và ghi rõ lý do; nếu tùy biến phải nối lại error handler/logging hooks.
3. Chuẩn bị envelope fixture qua EventMapper; validate trước gửi, deserialize/validate trước gọi business handler. Payload nghiệp vụ phải theo owner, không dùng fixture để tự chốt DTO đơn hàng.
4. Xử lý kết quả gửi bất đồng bộ: ghi nhận broker ack hoặc lỗi, không báo publish thành công ngay sau khi gọi send. Broker ack cũng không có nghĩa consumer đã xử lý xong.
5. Listener record ack sau commit thành công. Lỗi phải đi qua handler, không catch rồi bỏ qua/ack. Có replay vẫn cần domain dedup eventId.
6. Bàn giao ranh giới retry cho KAFKA-08: code hiện backoff 1000ms với 2 retry; recovery ném lỗi vì chưa có durable DLQ và ackAfterHandle=false. Không mô tả đó là DLQ đã hoạt động.
7. Người phụ trách tự kiểm tra các AC bằng broker/môi trường riêng khi được phép; không tự bật Docker/broker trong lần biên soạn detail.

## 5. Các điểm cần chốt

| Câu hỏi | Owner / ảnh hưởng |
|---|---|
| Payload, version và aggregate key của từng event là gì? | Mai Sơn Việt phối hợp KAFKA-02, KAFKA-03 và domain producer/consumer; chặn tích hợp payload thật, không chặn envelope/config |
| Retry hết thì lưu DLQ ở đâu, ack khi nào? | KAFKA-08 chốt topic recovery, lỗi không retry và cách replay; không đổi handler thành bỏ qua lỗi. Chặn nghiệm thu recovery bền vững |
| Partitions/replicas và quyền tạo topic từng môi trường? | PIC phối hợp UI-06/deploy; NewTopics có trong source chưa chứng minh broker đã tạo đúng. Không xóa/tạo lại topic đang có dữ liệu |

Không thêm outbox hoặc cam kết atomic DB+Kafka chỉ bằng config. Cơ chế phát tin bền vững thuộc task domain/integration được duyệt.

## 6. Dependency và bàn giao

> Bảng handoff bên dưới giữ tham chiếu trước gộp. Dependency triển khai hiện hành là bảng đầu file; ID INT/TEST cũ chỉ là truy vết qua trang chuyển hướng, không phải task phải giao lại.

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [UI-06](UI-06.md) | Mai Sơn Việt | Docker Compose infra, healthcheck và hướng dẫn up/down không mất volume ngoài ý muốn. | Trước chạy môi trường tích hợp; có thể soạn cấu hình/contract trước, chưa được ghi runtime đạt. |

**Task nhận đầu ra theo dependency đã khai báo:** [KAFKA-12](KAFKA-12.md), [BE-67](BE-67.md), [KAFKA-02](KAFKA-02.md), [KAFKA-03](KAFKA-03.md), [KAFKA-04](KAFKA-04.md), [KAFKA-08](KAFKA-08.md), [KAFKA-10](KAFKA-10.md)

Có thể đối chiếu source trước; cần broker đúng cấu hình để kiểm tra delivery. Giữ nguyên dependency snapshot, không tự đổi PIC/lịch/estimate.

## 7. Tiêu chí nghiệm thu cho người phụ trách

| AC | Chuẩn bị / thao tác | Kết quả phải thấy |
|---|---|---|
| AC-01 | Đọc effective config của một service trong môi trường kiểm tra | Đúng broker/group/serializer/ack và topic settings; không lộ credential trong bằng chứng |
| AC-02 | Serialize rồi deserialize event fixture với eventId=map-event-01, correlationId=map-request-01 và payload object | Metadata/payload giữ nguyên, header khớp envelope; JSON sai/type sai bị từ chối trước business handler |
| AC-03 | Broker không nhận được publish trong môi trường kiểm tra | Kết quả gửi thất bại được xử lý; không báo nghiệp vụ publish thành công giả hoặc log raw payload |
| AC-04 | Hai group khác nhau đọc cùng topic; hai instance trong một group | Mỗi group có luồng nhận riêng; instance cùng group chia công việc, không khẳng định mọi instance nhận mọi event |
| AC-05 | Consumer lỗi trước commit; kiểm tra vị trí ack và hành vi handler | Không ack sớm/nuốt lỗi; retry theo config, chưa có DLQ phải ghi chưa hoàn thành recovery |
| AC-06 | Gửi lại cùng event fixture | eventId/key không đổi; kết quả này chỉ xác nhận transport, chưa thay bằng chứng consumer idempotent |

## 8. Checklist bàn giao

- [ ] Bảng topic/group/config từng service; ví dụ gửi/nhận qua helper và thời điểm ack.
- [ ] Kết quả AC đạt/chưa đạt/blocked do người phụ trách ghi; không dùng log gọi send làm bằng chứng broker ack.
- [ ] Ranh giới còn thiếu với KAFKA-08/domain owner, commit/file và fixture không có secret. Gộp critical path TEST-15, không mở task trùng.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu nguồn

- [Kiến trúc, mục 3.2](../docs/Kiến%20trúc%20hệ%20thống.md), [Observability — Kafka](../docs/observability.md): topic, ownership, event headers và giới hạn hook.
- [Config chung](../../config-repo/application.yml), [Hướng dẫn backend](../../backend/CONFIG-AND-EXCEPTION-GUIDE.md).
- [Backlog](../docs/backlog.md): metadata lịch sử giữ nguyên; chưa xác nhận runtime hoặc đồng bộ Lark.

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**Story Point:** 5 SP
**Time Estimated:** 6 giờ công
**Remaining Estimate:** 6 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Tính triển khai đúng domain, DTO/validation/quyền, tự kiểm chứng và sửa lỗi cục bộ; không cộng lại nối UI và regression độc lập ở INT/TEST.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../docs/backlog.md#quy-ước-ước-lượng).

Lịch Sprint 1 được giữ nguyên để không viết lại tiến độ. Nếu chưa hoàn tất, ghi nhận blocker/carry-over trước luồng Sprint 2 phụ thuộc; không tự chuyển sprint hoặc đánh DONE. Phần còn lại thuộc phạm vi hiện tại phải xử lý trước 05/11.

**PIC:** Mai Sơn Việt
**Trạng thái trên Lark:** TO DO
**Sprint (snapshot kế hoạch 30/10):** SPRINT 1
**Khoảng sprint (snapshot kế hoạch):** 26/10/2026–01/11/2026
**Bắt đầu:** 30/10/2026 08:00
**Deadline:** 30/10/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại (snapshot trước phân loại):** Task
**Mã Lark:** Mail-4460 / reczz28Rid5Xl8kt
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5Xl8kt
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Nhóm sprint hiện tại trên Lark (01/11):** CustomerAdmin — giữ thay đổi của người dùng, không ghi đè bằng snapshot cũ. Ngày Sprint 1 giữ làm lịch sử; không tự reset tiến độ.

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
