# [KAFKA-10] Phát sự kiện cho mọi thay đổi quản trị đã commit và ghi tập trung vào Audit Service, chống trùng và loại dữ liệu nhạy cảm

> **SP hiện hành ngày 09/11/2026: 5 — SPRINT 3.** Thang 0/1/2/3/5/8, tối đa 8. Một đường publish/consume/read audit với actor/store; không cộng điểm theo từng action quản trị. Giữ nguyên AC/DoD, PIC, trạng thái và giờ nguồn; không hạ điểm do công đã làm, không quy đổi thành remaining/capacity. Phạm vi mở rộng RBAC A–E mới là kế hoạch đề xuất, chưa nằm trong estimate này. SP/lịch trong các mục lịch sử không phải estimate hiện hành.

> **Đã đồng bộ Lark 08/11/2026.** Title, scope, AC/DoD và SP kế hoạch đã cập nhật; giữ PIC/trạng thái/sprint/lịch thực tế trên Lark. Các ghi chú “chưa đồng bộ” và tiến độ bên dưới là snapshot lịch sử. [Kết quả đồng bộ và chênh lệch sprint](../docs/Lark_Backlog_Sync_2026-11-08.md).

> Detail thống nhất sau gộp và sizing — 08/11/2026. Chỉ biên soạn repository, chưa đồng bộ Lark và chưa chạy kiểm thử. Không thay SP/PIC/status/lịch chỉ vì detail đã đầy đủ.

## 1. Giao việc và kết quả cần bàn giao

| Thuộc tính | Hiện hành |
|---|---|
| Mã | KAFKA-10 |
| Loại | TASK — task chính, không có subtask INT/TEST |
| Nhóm | KAFKA |
| PIC | Mai Sơn Việt |
| Sprint | SPRINT 2 |
| SP hiện hành 09/11 | 5 |
| Trạng thái snapshot | TO DO — chưa đọc lại tiến độ Lark |
| Lịch cũ UTC+7 | 03/11/2026 08:00 → 04/11/2026 23:59; không phải cam kết mới |
| Giờ nguồn | 6 — chỉ lịch sử, chưa sizing lại giờ |
| Dependency triển khai | [KAFKA-01](KAFKA-01.md), [BE-43](BE-43.md) |

**Làm xong phải dùng được:** Các thao tác quản trị thành công được phát bền vững và ghi một lần vào Audit Service; actor/store tin cậy và before/after đã loại secret.

**SP hiện hành: 5.** Một đường publish/consume/read audit với actor/store; không cộng điểm theo từng action quản trị.

SP bao gồm triển khai/tích hợp/tự test/sửa lỗi đúng phạm vi, không phải remaining hoặc chứng nhận đủ capacity. [Bảng sizing 37 TASK/247 SP](../docs/Sprint_2_Story_Points_2026-11-08.md).

## 2. Phạm vi thống nhất và ranh giới

- Producer coverage tài khoản/quyền, catalog/store/kho, order/payment/refund, promotion/loyalty/config, review
- Consumer audit.recorded, durable dispatch/retry, allowlist và readback API BE-43
- Không chỉ một listener; từng owner domain viết producer của mình, PIC Việt điều phối matrix/evidence

Các ràng buộc có điều kiện “theo policy/contract đã chốt” cần quyết định ở mục 7 trước khi đánh PASS; không tự biến fixture, TTL ví dụ hay đề xuất thành business rule. Nghiệm thu một task không thay kết quả của task phối hợp.

## 3. Input, output và contract phải chốt

- Envelope audit.recorded và payload actorId/actorRole/storeId/action/targetType/targetId/before/after từ backend
- Business mutation+durable intent atomic; retry giữ eventId; không fire-and-forget làm mất audit
- Consumer dedup eventId vào audit_service.audit_logs; không write Audit schema từ domain
- Review outbox chỉ intent; status/replyId được allowlist, không audit reason/content tự do hoặc OTP/password

**Bàn giao ra ngoài:** Từng BE owner cung cấp producer/intent; BE-43 đọc cùng audit table; KAFKA-08 cấp retry/DLQ, Admin/Manager nhận query evidence.

Contract handoff cần ghi version, field/type/required/null, actor/scope, success/error, identity/retry và fixture mẫu phù hợp đầu ra. Tên route/DTO/event đã có trong đặc tả được ưu tiên; chỗ chưa có phải chốt với owner, không tự thêm API công khai hoặc trạng thái mới.

## 4. Bắt đầu từ đâu và thứ tự thực hiện

Đường dẫn dưới đây là điểm đọc source/tài liệu, **không phải xác nhận code đã hoàn thiện hoặc chạy đúng**. Giữ thay đổi local của người khác, tái dùng implementation hiện có thay vì tạo bản thứ hai.

- [backend/audit-service](../../backend/audit-service)

1. Lập action inventory theo domain/role và owner, đánh dấu chưa có producer
2. Chốt schema/allowlist và event boundary từng mutation
3. Nối dispatcher ACK/retry và consumer dedup với BE-43
4. Kiểm rollback/crash/replay/secret, đọc lại qua API Admin/Manager

## 5. Dependency, handoff và điều kiện sẵn sàng

| Task đầu vào | PIC nguồn | Cần nhận trước phần liên quan |
|---|---|---|
| [KAFKA-01](KAFKA-01.md) | Mai Sơn Việt | Cấu hình topic, producer và consumer Kafka cho các service, thống nhất JSON event, group, serializer và cách xác nhận xử lý; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-43](BE-43.md) | Mai Sơn Việt | GET /api/audit-logs MGR/ADM; filter actorId/actorRole/sourceService/action/targetType/targetId/storeId/from/to; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |

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

- **Q01:** Owner từng domain xác nhận action/fields trước-sau và cách durable publish
- **Q02:** Chốt schema evolution/unknown action, migration audit legacy với BE-43
- **Q03:** Không bỏ action vì chưa có code; ghi BLOCKED coverage chưa bàn giao

Mỗi quyết định cần owner, lựa chọn, nguồn/phiên bản và AC bị ảnh hưởng. Khi chưa chốt thì đánh BLOCKED các AC đó, vẫn làm phần độc lập; không âm thầm hạ quyền kiểm tra, bỏ dữ liệu hoặc sửa AC để nhận DONE.

## 8. Acceptance Criteria — tình huống, kết quả và bằng chứng

Các AC dưới đây đều **CHƯA CHẠY trong lượt viết detail**. Dev cập nhật PASS/FAIL/BLOCKED kèm evidence; N/A chỉ khi ngoài phạm vi thực sự và có lý do/owner, không dùng N/A để bỏ security hoặc yêu cầu đã chốt.

| AC | Fixture / thao tác | Kết quả phải quan sát | Evidence cần nộp |
|---|---|---|---|
| KAFKA-10/AC-01 | Mỗi loại mutation trong inventory commit | Có đúng audit logical event và record giải thích thay đổi | Coverage matrix+IDs |
| KAFKA-10/AC-02 | Mutation rollback hoặc optimistic conflict | Không audit thành thay đổi thành công | Transaction proof |
| KAFKA-10/AC-03 | Broker outage và crash sau publish trước mark-sent | Intent còn, retry giữ eventId, không mất audit | Recovery trace |
| KAFKA-10/AC-04 | Replay/concurrent cùng event | Một audit record, không duplicate | Unique/dedup counts |
| KAFKA-10/AC-05 | Actor/role/store client giả | Audit dùng identity và resource backend, không ghi actor tự khai | Tamper fixture |
| KAFKA-10/AC-06 | Payload password/hash/OTP/token/reply text/hide reason | Lọc trước publish và persist/DTO, vẫn giữ action/target cần thiết | Canary allowlist |
| KAFKA-10/AC-07 | Review reply/hide từ outbox hiện có | Dispatcher handoff không xóa pending trước ACK, consumer nhận status/replyId | Outbox→audit trace |
| KAFKA-10/AC-08 | Event thiếu field/unknown action/version | Không lưu audit vô nghĩa hoặc fail-open; failure policy rõ | Schema cases |
| KAFKA-10/AC-09 | Admin và Manager đọc audit sau consume | BE-43 scope đúng, Manager chỉ STAFF quán mình | API permission evidence |
| KAFKA-10/AC-10 | Một domain chưa có producer hoặc event bị treo | Inventory ghi missing/blocked với PIC, không tuyên bố mọi admin action đã phủ | Coverage status |
| KAFKA-10/AC-11 | Audit service/DB lỗi | Consumer retry/DLQ an toàn, business committed không bị xóa lại | Failure recovery |
| KAFKA-10/AC-12 | Hai operation dùng cùng correlationId và một operation bị retry | Correlation chỉ trace; mỗi operation có identity riêng, retry cùng operation giữ eventId/operation key theo contract | Event/operation identity matrix |
| KAFKA-10/AC-13 | Đối chiếu đầu ra qua API/domain readback sau event và recovery | Nguồn sự thật persisted khớp expected, không chỉ log consumed/sent; thiếu downstream ghi BLOCKED phạm vi đó | Persisted result và API evidence của owner |
| KAFKA-10/AC-14 | Config runtime hoặc payload lỗi có dữ liệu nhạy cảm | Config Server/Eureka và error policy được giữ; không log secret/raw sensitive payload khi báo lỗi | Config names, sanitized error/category và trace IDs |

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
- [ ] **DOD-15** — Action coverage matrix đủ domain/role với owner và evidence từng action
- [ ] **DOD-16** — Có proof atomic intent, ACK và dedup; không tính HTTP access log là audit nghiệp vụ
- [ ] **DOD-17** — Schema/allowlist tương thích BE-43 và kế hoạch migrate không phá dữ liệu

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

**Bản này thay phần ghép nối cũ**, chỉ dùng một phạm vi, một bộ AC/DoD hiện hành. ID nguồn sau gộp không phải task/subtask độc lập: TEST-16.

[Bản detail trước biên soạn — chỉ lưu lịch sử](history/2026-11-08-before-detail-rewrite/KAFKA-10.md) giữ nguyên các contract/checklist/metadata cũ để đối chiếu. Không giao lại hoặc cộng SP từ bản lưu. Các AC lặp được hợp nhất theo mục tiêu, phần phối hợp domain khác nằm ở handoff chứ không giao cả kiểm thử toàn hệ thống cho mỗi task.

**Định danh Lark nguồn — chỉ để đối chiếu, không phải record mới:**
- Mail-4518 / reczz28Rid5XjWiu

- [API](../docs/Đặc%20tả%20API.md) · [RBAC](../docs/Ma%20trận%20phân%20quyền.md) · [SRS](../docs/SRS.md) · [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md).
- [Error catalog và vi/en](../../contracts/README.md) · [Brand](../docs/Brand_Guidelines.md) · [Browser sessions 08/11](../docs/Browser_Sessions.md).
- [Backlog hiện hành](../docs/backlog.md) · [Gộp 08/11](../docs/Sprint_2_Consolidation_2026-11-08.md) · [Báo cáo biên soạn detail](../docs/Sprint_2_Task_Details_2026-11-08.md).
