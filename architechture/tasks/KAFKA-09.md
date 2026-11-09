# [KAFKA-09] Xử lý payment.failed để hủy đơn và giải phóng voucher, điểm đã giữ, bảo đảm các bước bù trừ không thực hiện trùng

> **Bổ sung triển khai loyalty — 08/11/2026, chưa nghiệm thu:** Loyalty release bám order.cancelled của saga hiện hành, không dùng REST release không tồn tại; chưa xác nhận nghiệm thu toàn bộ saga payment/voucher. [Contract, AC và giới hạn bàn giao](../specs/loyalty-end-to-end.md). Giữ nguyên PIC/SP/sprint/trạng thái snapshot; không đồng bộ Lark.


> **Đã đồng bộ Lark 08/11/2026.** Title, scope, AC/DoD và SP kế hoạch đã cập nhật; giữ PIC/trạng thái/sprint/lịch thực tế trên Lark. Các ghi chú “chưa đồng bộ” và tiến độ bên dưới là snapshot lịch sử. [Kết quả đồng bộ và chênh lệch sprint](../docs/Lark_Backlog_Sync_2026-11-08.md).

> Detail thống nhất sau gộp và sizing — 08/11/2026. Chỉ biên soạn repository, chưa đồng bộ Lark và chưa chạy kiểm thử. Không thay SP/PIC/status/lịch chỉ vì detail đã đầy đủ.

## 1. Giao việc và kết quả cần bàn giao

| Thuộc tính | Hiện hành |
|---|---|
| Mã | KAFKA-09 |
| Loại | TASK — task chính, không có subtask INT/TEST |
| Nhóm | KAFKA |
| PIC | Trần Đức Anh |
| Sprint | SPRINT 2 |
| SP kế hoạch 08/11 | 8 |
| Trạng thái snapshot | TO DO — chưa đọc lại tiến độ Lark |
| Lịch cũ UTC+7 | 04/11/2026 08:00 → 04/11/2026 23:59; không phải cam kết mới |
| Giờ nguồn | 12 — chỉ lịch sử, chưa sizing lại giờ |
| Dependency triển khai | [KAFKA-03](KAFKA-03.md), [BE-26](BE-26.md), [BE-34](BE-34.md), [BE-37](BE-37.md) |

**Làm xong phải dùng được:** payment.failed hợp lệ dẫn tới hủy đơn và giải phóng voucher/điểm theo policy, từng bước bù trừ có thể thử lại mà không hoàn hai lần.

**SP hiện hành: 8.** Compensation payment.failed xuyên Order/Promotion cần state, retry và giải phóng voucher/điểm đúng một lần; giữ điểm vì phục hồi từng chặng khó, không tính lại cancel API.

SP bao gồm triển khai/tích hợp/tự test/sửa lỗi đúng phạm vi, không phải remaining hoặc chứng nhận đủ capacity. [Bảng sizing 37 TASK/247 SP](../docs/Sprint_2_Story_Points_2026-11-08.md).

## 2. Phạm vi thống nhất và ranh giới

- Saga/compensation Payment→Order→Promotion, state/operation trace và recovery
- Dùng BE-26 cancel, BE-34 usage và BE-37 points contract; không transaction SQL liên DB
- Không hủy đơn PAID/terminal vì failure cũ, không tự triển khai bank refund hoặc policy late transfer hoãn

Các ràng buộc có điều kiện “theo policy/contract đã chốt” cần quyết định ở mục 7 trước khi đánh PASS; không tự biến fixture, TTL ví dụ hay đề xuất thành business rule. Nghiệm thu một task không thay kết quả của task phối hợp.

## 3. Input, output và contract phải chốt

- Input failure identity/order/payment/state/version theo KAFKA-03
- Mỗi bước compensation có operation key ổn định, retry riêng outcome, correlation nối toàn luồng
- Thứ tự cancel/release và final status được owner chốt; timeout không có nghĩa chưa commit
- Balance/quota release không vượt phần đã giữ/trừ

**Bàn giao ra ngoài:** KAFKA-03 cấp failure; BE-26/34/37 nhận idempotent ops; KAFKA-08 cấp failure/replay policy, Notification nhận committed states.

Contract handoff cần ghi version, field/type/required/null, actor/scope, success/error, identity/retry và fixture mẫu phù hợp đầu ra. Tên route/DTO/event đã có trong đặc tả được ưu tiên; chỗ chưa có phải chốt với owner, không tự thêm API công khai hoặc trạng thái mới.

## 4. Bắt đầu từ đâu và thứ tự thực hiện

Đường dẫn dưới đây là điểm đọc source/tài liệu, **không phải xác nhận code đã hoàn thiện hoặc chạy đúng**. Giữ thay đổi local của người khác, tái dùng implementation hiện có thay vì tạo bản thứ hai.

- [backend/cart-order-service](../../backend/cart-order-service)

1. Chốt failure eligibility và compensation state matrix với ba owners
2. Lưu tiến độ từng bước và outcome bền vững
3. Gọi idempotent domain ops, retry có giới hạn và handoff failure
4. Kiểm crash/restart/partial success/confirmed race

## 5. Dependency, handoff và điều kiện sẵn sàng

| Task đầu vào | PIC nguồn | Cần nhận trước phần liên quan |
|---|---|---|
| [KAFKA-03](KAFKA-03.md) | Lê Phú Thịnh | Payment state và Order state tách biệt; confirmed chỉ khi nghiệp vụ xác nhận tiền đủ điều kiện; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-26](BE-26.md) | Trần Đức Anh | PUT /api/orders/{id}/cancel CUS; reject STF/MGR/ADM; POST refund-requests CUS; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-34](BE-34.md) | Cao Tất Thành | Route /api/promotions theo API/BE-51; actor/store/order context trusted; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-37](BE-37.md) | Cao Tất Thành | Route /api/loyalty theo API/BE-51; config Admin, Customer chỉ owner; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |

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

- **Q01:** Chốt timeout/mismatch/expired mapping nào được trigger, canceled/refunded states và guard confirmed
- **Q02:** Chốt retry/durable saga record, lượng giữ/trừ và reversal policy; chưa rõ không tự refund tiền

Mỗi quyết định cần owner, lựa chọn, nguồn/phiên bản và AC bị ảnh hưởng. Khi chưa chốt thì đánh BLOCKED các AC đó, vẫn làm phần độc lập; không âm thầm hạ quyền kiểm tra, bỏ dữ liệu hoặc sửa AC để nhận DONE.

## 8. Acceptance Criteria — tình huống, kết quả và bằng chứng

Các AC dưới đây đều **CHƯA CHẠY trong lượt viết detail**. Dev cập nhật PASS/FAIL/BLOCKED kèm evidence; N/A chỉ khi ngoài phạm vi thực sự và có lý do/owner, không dùng N/A để bỏ security hoặc yêu cầu đã chốt.

| AC | Fixture / thao tác | Kết quả phải quan sát | Evidence cần nộp |
|---|---|---|---|
| KAFKA-09/AC-01 | Failure đủ điều kiện cho pending order | Cancel và release đúng quota/điểm, trạng thái cuối nhất quán | Order/usage/ledger trace |
| KAFKA-09/AC-02 | Failure stale sau confirmed/PAID | Không hủy/hoàn ưu đãi sai, xử lý theo version policy | Race fixture |
| KAFKA-09/AC-03 | Replay cùng failure hoặc hai consumer | Không cancel history/release effect hai lần | Concurrent outcomes |
| KAFKA-09/AC-04 | Cancel thành công, voucher release lỗi | Ghi partial progress, retry bước còn thiếu, không làm lại mù | Step-state records |
| KAFKA-09/AC-05 | Voucher release thành công, points timeout sau commit | Tra/retry cùng operation, không cộng điểm hai lần | Ambiguous outcome |
| KAFKA-09/AC-06 | Restart ở mỗi boundary | Khôi phục từ state bền vững, không bỏ saga dang dở | Crash matrix |
| KAFKA-09/AC-07 | Usage/points chưa từng reserve hoặc đã release | No-op/conflict theo contract, không tạo credit ngoài nguồn | Ledger fixtures |
| KAFKA-09/AC-08 | Thiếu order/payment hoặc payload mâu thuẫn | Không đoán liên kết; failure có owner/trace | Validation cases |
| KAFKA-09/AC-09 | Permanent failure/hết retry | Handoff DLQ/manual recovery theo quyền, không báo compensated giả | Terminal path |
| KAFKA-09/AC-10 | Notification lỗi sau compensation | Không rollback business và không email state sai | Cross-service readback |
| KAFKA-09/AC-11 | Hai operation dùng cùng correlationId và một operation bị retry | Correlation chỉ trace; mỗi operation có identity riêng, retry cùng operation giữ eventId/operation key theo contract | Event/operation identity matrix |
| KAFKA-09/AC-12 | Đối chiếu đầu ra qua API/domain readback sau event và recovery | Nguồn sự thật persisted khớp expected, không chỉ log consumed/sent; thiếu downstream ghi BLOCKED phạm vi đó | Persisted result và API evidence của owner |
| KAFKA-09/AC-13 | Config runtime hoặc payload lỗi có dữ liệu nhạy cảm | Config Server/Eureka và error policy được giữ; không log secret/raw sensitive payload khi báo lỗi | Config names, sanitized error/category và trace IDs |

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
- [ ] **DOD-15** — Bàn giao saga state/operation/recovery matrix, trace đủ từng boundary
- [ ] **DOD-16** — Có confirmed-vs-failed race và partial success recovery
- [ ] **DOD-17** — Nêu rõ người xử lý terminal failure, không dùng task TEST chung thay trách nhiệm domain

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

[Bản detail trước biên soạn — chỉ lưu lịch sử](history/2026-11-08-before-detail-rewrite/KAFKA-09.md) giữ nguyên các contract/checklist/metadata cũ để đối chiếu. Không giao lại hoặc cộng SP từ bản lưu. Các AC lặp được hợp nhất theo mục tiêu, phần phối hợp domain khác nằm ở handoff chứ không giao cả kiểm thử toàn hệ thống cho mỗi task.

**Định danh Lark nguồn — chỉ để đối chiếu, không phải record mới:**
- Mail-4517 / reczz28Rid5XkQIM

- [API](../docs/Đặc%20tả%20API.md) · [RBAC](../docs/Ma%20trận%20phân%20quyền.md) · [SRS](../docs/SRS.md) · [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md).
- [Error catalog và vi/en](../../contracts/README.md) · [Brand](../docs/Brand_Guidelines.md) · [Browser sessions 08/11](../docs/Browser_Sessions.md).
- [Backlog hiện hành](../docs/backlog.md) · [Gộp 08/11](../docs/Sprint_2_Consolidation_2026-11-08.md) · [Báo cáo biên soạn detail](../docs/Sprint_2_Task_Details_2026-11-08.md).
