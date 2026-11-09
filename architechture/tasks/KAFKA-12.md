# [KAFKA-12] Xử lý sự kiện Order, Payment để tạo thông báo và yêu cầu gửi email đúng người, chống trùng và không rollback nghiệp vụ khi email lỗi

> **Đã đồng bộ Lark 08/11/2026.** Title, scope, AC/DoD và SP kế hoạch đã cập nhật; giữ PIC/trạng thái/sprint/lịch thực tế trên Lark. Các ghi chú “chưa đồng bộ” và tiến độ bên dưới là snapshot lịch sử. [Kết quả đồng bộ và chênh lệch sprint](../docs/Lark_Backlog_Sync_2026-11-08.md).

> Detail thống nhất sau gộp và sizing — 08/11/2026. Chỉ biên soạn repository, chưa đồng bộ Lark và chưa chạy kiểm thử. Không thay SP/PIC/status/lịch chỉ vì detail đã đầy đủ.

## 1. Giao việc và kết quả cần bàn giao

| Thuộc tính | Hiện hành |
|---|---|
| Mã | KAFKA-12 |
| Loại | TASK — task chính, không có subtask INT/TEST |
| Nhóm | KAFKA |
| PIC | Cao Tất Thành |
| Sprint | SPRINT 2 |
| SP kế hoạch 08/11 | 8 |
| Trạng thái snapshot | TO DO — chưa đọc lại tiến độ Lark |
| Lịch cũ UTC+7 | 03/11/2026 08:00 → 04/11/2026 23:59; không phải cam kết mới |
| Giờ nguồn | 12 — chỉ lịch sử, chưa sizing lại giờ |
| Dependency triển khai | [KAFKA-01](KAFKA-01.md), [BE-38](BE-38.md), [BE-62](BE-62.md), [KAFKA-02](KAFKA-02.md), [KAFKA-03](KAFKA-03.md) |

**Làm xong phải dùng được:** Event Order/Payment tạo in-app notification và email job đúng người, đúng template, một lần về hiệu ứng; email lỗi không đảo ngược nghiệp vụ gốc.

**SP hiện hành: 8.** Orchestration nhiều event thành notification/email, mapping recipient/template, replay protection và không rollback nghiệp vụ; không tính lại SMTP, renderer hoặc scheduler ở BE-60/62.

SP bao gồm triển khai/tích hợp/tự test/sửa lỗi đúng phạm vi, không phải remaining hoặc chứng nhận đủ capacity. [Bảng sizing 37 TASK/247 SP](../docs/Sprint_2_Story_Points_2026-11-08.md).

## 2. Phạm vi thống nhất và ranh giới

- Consumer orchestration, event→channel/recipient/template mapping, dedup và enqueue durable
- Nhận INT-42/59/TEST-21 lịch sử; phối hợp OTP/order/payment/refund email evidence
- Không làm SMTP/renderer BE-60, scheduler BE-62, failure API BE-63; promotion.approved/email vẫn backlog

Các ràng buộc có điều kiện “theo policy/contract đã chốt” cần quyết định ở mục 7 trước khi đánh PASS; không tự biến fixture, TTL ví dụ hay đề xuất thành business rule. Nghiệm thu một task không thay kết quả của task phối hợp.

## 3. Input, output và contract phải chốt

- Envelope validated event/source/version và delivery identity; eventId/correlationId/messageId có vai trò riêng
- Một event có thể nhiều người/kênh/template: khóa logical delivery theo contract, không eventId-only làm mất recipient hợp lệ
- Inbox insert/dedup/email intent có boundary bền vững, không ack trước khi giữ việc cần làm
- Template từ state snapshot, APPROVED không gửi đã REFUNDED; auth OTP do Identity contract

**Bàn giao ra ngoài:** KAFKA-02/03 cung cấp event; BE-38 đọc inbox; BE-60 render/send, BE-62 delivery/retry, BE-63 terminal/log.

Contract handoff cần ghi version, field/type/required/null, actor/scope, success/error, identity/retry và fixture mẫu phù hợp đầu ra. Tên route/DTO/event đã có trong đặc tả được ưu tiên; chỗ chưa có phải chốt với owner, không tự thêm API công khai hoặc trạng thái mới.

## 4. Bắt đầu từ đâu và thứ tự thực hiện

Đường dẫn dưới đây là điểm đọc source/tài liệu, **không phải xác nhận code đã hoàn thiện hoặc chạy đúng**. Giữ thay đổi local của người khác, tái dùng implementation hiện có thay vì tạo bản thứ hai.

- [backend/notification-service](../../backend/notification-service)
- [backend/notification-service/src/main/java/com/clucky/notificationservice/dto/DomainEvent.java](../../backend/notification-service/src/main/java/com/clucky/notificationservice/dto/DomainEvent.java)
- [backend/notification-service/src/main/resources/db/migration/V2__domain_schema.sql](../../backend/notification-service/src/main/resources/db/migration/V2__domain_schema.sql)

1. Lập supported-event matrix với producer và recipient source trusted
2. Hoàn thiện validation/mapping và transaction dedup/inbox/enqueue
3. Tích hợp BE-60/62/63, không gọi sender để block nghiệp vụ nguồn
4. Kiểm channel partial failure/replay/restart/PII và readback cả inbox/email

## 5. Dependency, handoff và điều kiện sẵn sàng

| Task đầu vào | PIC nguồn | Cần nhận trước phần liên quan |
|---|---|---|
| [KAFKA-01](KAFKA-01.md) | Mai Sơn Việt | Cấu hình topic, producer và consumer Kafka cho các service, thống nhất JSON event, group, serializer và cách xác nhận xử lý; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-38](BE-38.md) | Cao Tất Thành | GET my notifications và mark-read/read-all theo API/BE-52; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-62](BE-62.md) | Cao Tất Thành | Identity delivery theo messageId/eventId/operation đã chốt, correlation chỉ trace; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [KAFKA-02](KAFKA-02.md) | Trần Đức Anh | Envelope eventId/correlationId/eventType/sourceService/occurredAt và payload snapshot đã chốt; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [KAFKA-03](KAFKA-03.md) | Lê Phú Thịnh | Payment state và Order state tách biệt; confirmed chỉ khi nghiệp vụ xác nhận tiền đủ điều kiện; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |

- Có thể đọc source, chốt DTO/ma trận, chuẩn bị fixture hoặc triển khai phần độc lập trước khi upstream hoàn tất. Phần dùng dữ liệu thật ghi BLOCKED khi thiếu handoff.
- Không tự thêm cạnh dependency, đổi lịch hoặc kéo task backlog vào sprint; phối hợp nghiệm thu không tự trở thành blocker triển khai ngược chiều.
- PIC nhận đầu ra nêu ở mục 3; phối hợp chỉ bàn giao phần domain của mình, không chạy/tính công cả pipeline nhiều lần.

## 6. Fixture và điều kiện tự kiểm thử

- Ghi commit/build/config version, môi trường được phép, actor/role và store A/B khi có scope; chuẩn bị allow và deny cùng loại tài nguyên. Không dùng account/secret của khách.
- Với mỗi AC, ghi input/baseline/expected trước thao tác; dữ liệu tiền, thời gian, size, quota hoặc số dư phải có boundary fixture tính được, không chỉ một happy path.
- Chuẩn bị điều kiện dependency lỗi, retry/replay/concurrent hoặc crash theo AC của task; sử dụng fixture/mock phải ghi rõ giới hạn, không coi đó là tích hợp runtime đã đạt.
- Evidence chỉ lưu IDs, hash hoặc metadata đã mask; cleanup chỉ dữ liệu của run đã định danh. Không xóa volume/database, seed chung hoặc pending event để làm kết quả đẹp.
- **Lượt biên soạn này không chạy test/lint/typecheck/build/browser/Docker/backend/hạ tầng.** Dev/người dùng tự kiểm chứng khi có điều kiện; không gửi email/chuyển tiền thật ngoài phạm vi được phép.

## 7. Quyết định còn mở và cách xử lý blocker

- **Q01:** Chốt event nào gửi kênh nào, recipient/template/version và operation key đa recipient
- **Q02:** Chốt retry delivery khi SMTP accepted nhưng mất response với BE-62; không hứa mailbox exactly-once
- **Q03:** Map mismatch/expired/refund theo KAFKA-03 đã duyệt, không tự thêm topic hoặc campaign

Mỗi quyết định cần owner, lựa chọn, nguồn/phiên bản và AC bị ảnh hưởng. Khi chưa chốt thì đánh BLOCKED các AC đó, vẫn làm phần độc lập; không âm thầm hạ quyền kiểm tra, bỏ dữ liệu hoặc sửa AC để nhận DONE.

## 8. Acceptance Criteria — tình huống, kết quả và bằng chứng

Các AC dưới đây đều **CHƯA CHẠY trong lượt viết detail**. Dev cập nhật PASS/FAIL/BLOCKED kèm evidence; N/A chỉ khi ngoài phạm vi thực sự và có lý do/owner, không dùng N/A để bỏ security hoặc yêu cầu đã chốt.

| AC | Fixture / thao tác | Kết quả phải quan sát | Evidence cần nộp |
|---|---|---|---|
| KAFKA-12/AC-01 | Order/payment event được hỗ trợ hợp lệ | Inbox/job đúng recipient/template/refId/state, trace nối được | Mapping matrix/readback |
| KAFKA-12/AC-02 | Một event cần nhiều recipient/kênh | Không dedup nhầm mất kênh/người, cũng không nhân job | Delivery identity fixture |
| KAFKA-12/AC-03 | Replay/concurrent cùng event | Không duplicate inbox/email logical job | Counts/atomic boundary |
| KAFKA-12/AC-04 | Inbox commit nhưng enqueue email lỗi hoặc ngược lại | Recovery theo transaction/intent, không mất kênh âm thầm | Partial-failure trace |
| KAFKA-12/AC-05 | Crash sau effect trước ACK | Replay tiếp tục/no-op đúng, không nhân gửi logic | Restart proof |
| KAFKA-12/AC-06 | SMTP failed/unknown hoặc BE-62 unavailable | Outcome bàn giao, không rollback Order/Payment | Cross-domain readback |
| KAFKA-12/AC-07 | Refund chỉ APPROVED | Không gửi nội dung đã hoàn; REFUNDED mới dùng template tương ứng | State/template matrix |
| KAFKA-12/AC-08 | OTP/register/reset evidence phối hợp | Đúng purpose/expiry/recipient, không lộ OTP; không nhận producer ngoài scope đã đạt | Auth mail handoff |
| KAFKA-12/AC-09 | Event malformed/unknown/không được hỗ trợ | Failure/ignore theo policy có trace, không gửi nhầm | Schema/type cases |
| KAFKA-12/AC-10 | Payload chứa recipient giả hoặc dữ liệu nhạy cảm thừa | Nguồn recipient tin cậy, minimize/sanitize trước log/DLQ | Tamper/canary |
| KAFKA-12/AC-11 | Promotion email đang backlog | Không tự bật consumer/campaign để hoàn matrix | Scope config |
| KAFKA-12/AC-12 | Customer/Staff đọc inbox sau xử lý | BE-38 trả đúng owner/read-state, không dùng inbox seed thay pipeline | API/UI readback |
| KAFKA-12/AC-13 | Hai operation dùng cùng correlationId và một operation bị retry | Correlation chỉ trace; mỗi operation có identity riêng, retry cùng operation giữ eventId/operation key theo contract | Event/operation identity matrix |
| KAFKA-12/AC-14 | Đối chiếu đầu ra qua API/domain readback sau event và recovery | Nguồn sự thật persisted khớp expected, không chỉ log consumed/sent; thiếu downstream ghi BLOCKED phạm vi đó | Persisted result và API evidence của owner |
| KAFKA-12/AC-15 | Config runtime hoặc payload lỗi có dữ liệu nhạy cảm | Config Server/Eureka và error policy được giữ; không log secret/raw sensitive payload khi báo lỗi | Config names, sanitized error/category và trace IDs |

## 9. Definition of Done — checklist của chính TASK

- [ ] **DOD-01** — Phạm vi, ma trận quyền và các quyết định còn mở liên quan AC đã được owner chốt bằng link/version; chưa chốt ghi BLOCKED, không chọn mặc định cho xong.
- [ ] **DOD-02** — Bàn giao đúng đầu ra ở mục 1–3 và contract cho task nhận; không chỉ có DTO/template/file scaffold hoặc screenshot fixture.
- [ ] **DOD-03** — Người phụ trách tự kiểm chứng từng AC hiện hành, ghi trạng thái, expected/actual, dữ liệu đầu vào, commit và môi trường. Không đánh PASS từ lần sửa tài liệu này.
- [ ] **DOD-04** — Có fixture/setup/cleanup an toàn; không dùng khách thật, chuyển tiền thật, gửi email hàng loạt hoặc reset dữ liệu/volume dùng chung để tạo evidence.
- [ ] **DOD-05** — Có allow-case đối chứng cùng deny-case, negative/boundary và failure/retry phù hợp task; không chỉ kiểm status HTTP mà phải đối chiếu side effect/readback.
- [ ] **DOD-06** — Mỗi evidence gắn task/AC và source version. Case trùng có thể dùng chung evidence, không tự bỏ coverage hoặc chạy/tính công nhiều lần.
- [ ] **DOD-07** — Lỗi thuộc phạm vi được sửa và retest; lỗi còn mở có mức ảnh hưởng, PIC, bước tái hiện và AC bị chặn. Không tạo lại INT/TEST subtask để đẩy trách nhiệm.
- [ ] **DOD-08** — Không secret/token/OTP/PII không cần thiết trong API/log/DLQ/file/ảnh bằng chứng; canary dùng giá trị giả, chỉ ghi metadata đã mask.
- [ ] **DOD-09** — README/contract/fixture và hướng dẫn bàn giao cập nhật cùng đầu ra; giờ công/lịch/tiến độ chỉ sửa khi có đầu vào thật, không suy từ 247 SP.
- [ ] **DOD-10** — Phần HOÃN/Phase 2 tách khỏi AC bắt buộc sprint; phần chưa chạy ghi CHƯA CHẠY, phần thiếu upstream ghi BLOCKED, không nhận toàn task DONE khi AC bắt buộc chưa đạt.
- [ ] **DOD-11** — Frontends chỉ gọi Gateway; service runtime qua Config Server/Eureka. Mỗi service/schema sở hữu dữ liệu riêng, không join/FK/write SQL xuyên service.
- [ ] **DOD-12** — HTTP dùng DTO/input validation và error catalog chung; quyền/ownership/storeId được enforce backend. Không đổi UI guard để thay security server.
- [ ] **DOD-13** — Schema thay đổi dùng Flyway mới, không sửa migration đã áp dụng; có kế hoạch bảo toàn/backfill/rollback dữ liệu khi cần. Không thêm abstraction/dependency không phục vụ phạm vi.
- [ ] **DOD-14** — Có case kiểm thử tự động nhỏ trong cấu trúc sẵn có cho logic mới phù hợp, kèm hướng dẫn người dùng chạy; việc biên soạn task không chạy test/lint/typecheck/build/browser hoặc hạ tầng.
- [ ] **DOD-15** — Bàn giao event→recipient/channel/template/identity matrix kể cả không gửi
- [ ] **DOD-16** — Có partial failure/crash/replay và no-rollback evidence
- [ ] **DOD-17** — Phân biệt enqueue, SMTP accepted và inbox received; giữ supported-event phạm vi rõ

## 10. Mẫu bàn giao và ghi kết quả

| Trường | Dev điền khi tự kiểm chứng |
|---|---|
| Commit / môi trường / config-contract version | Chưa cung cấp |
| Fixture / actor / store / nguồn dữ liệu | Chưa cung cấp; không ghi secret |
| AC-ID → kết quả → expected/actual → evidence | CHƯA CHẠY; ghi từng AC, dùng lại evidence có truy vết khi trùng |
| Lỗi còn mở / PIC / retest | Chưa cập nhật; không mặc định không có bug |
| Handoff cho task nhận / phần còn blocked | Chưa xác nhận |
| Quyết định Qxx đã chốt / link nguồn | Chưa xác nhận ngoài contract đã nêu rõ |

Bàn giao chỉ hoàn tất khi đầu ra và AC bắt buộc có bằng chứng, lỗi ảnh hưởng được xử lý hoặc có quyết định nghiệm thu rõ. Không tự thay trạng thái Lark khi ghi tài liệu.

## 11. Truy vết phạm vi và nguồn yêu cầu

**Bản này thay phần ghép nối cũ**, chỉ dùng một phạm vi, một bộ AC/DoD hiện hành. ID nguồn sau gộp không phải task/subtask độc lập: INT-50, INT-52, TEST-16, TEST-22, TEST-23, TEST-24.

[Bản detail trước biên soạn — chỉ lưu lịch sử](history/2026-11-08-before-detail-rewrite/KAFKA-12.md) giữ nguyên các contract/checklist/metadata cũ để đối chiếu. Không giao lại hoặc cộng SP từ bản lưu. Các AC lặp được hợp nhất theo mục tiêu, phần phối hợp domain khác nằm ở handoff chứ không giao cả kiểm thử toàn hệ thống cho mỗi task.

**Định danh Lark nguồn — chỉ để đối chiếu, không phải record mới:**
- Mail-4491 / reczz28Rid5XkynV

- [API](../docs/Đặc%20tả%20API.md) · [RBAC](../docs/Ma%20trận%20phân%20quyền.md) · [SRS](../docs/SRS.md) · [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md).
- [Error catalog và vi/en](../../contracts/README.md) · [Brand](../docs/Brand_Guidelines.md) · [Browser sessions 08/11](../docs/Browser_Sessions.md).
- [Backlog hiện hành](../docs/backlog.md) · [Gộp 08/11](../docs/Sprint_2_Consolidation_2026-11-08.md) · [Báo cáo biên soạn detail](../docs/Sprint_2_Task_Details_2026-11-08.md).
