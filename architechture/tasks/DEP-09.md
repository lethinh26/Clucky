# [DEP-09] Tổng hợp Postman collection từ từng service, cấu hình gọi qua Gateway và bàn giao request mẫu cho luồng chính cùng trường hợp lỗi

> **SP hiện hành ngày 09/11/2026: 2 — SPRINT 3.** Thang 0/1/2/3/5/8, tối đa 8. Gom request/fixture và hướng dẫn Gateway từ contract từng owner; không làm lại API. Giữ nguyên AC/DoD, PIC, trạng thái và giờ nguồn; không hạ điểm do công đã làm, không quy đổi thành remaining/capacity. Phạm vi mở rộng RBAC A–E mới là kế hoạch đề xuất, chưa nằm trong estimate này. SP/lịch trong các mục lịch sử không phải estimate hiện hành.

> **Đã đồng bộ Lark 08/11/2026.** Title, scope, AC/DoD và SP kế hoạch đã cập nhật; giữ PIC/trạng thái/sprint/lịch thực tế trên Lark. Các ghi chú “chưa đồng bộ” và tiến độ bên dưới là snapshot lịch sử. [Kết quả đồng bộ và chênh lệch sprint](../docs/Lark_Backlog_Sync_2026-11-08.md).

> Detail thống nhất sau gộp và sizing — 08/11/2026. Chỉ biên soạn repository, chưa đồng bộ Lark và chưa chạy kiểm thử. Không thay SP/PIC/status/lịch chỉ vì detail đã đầy đủ.

## 1. Giao việc và kết quả cần bàn giao

| Thuộc tính | Hiện hành |
|---|---|
| Mã | DEP-09 |
| Loại | TASK — task chính, không có subtask INT/TEST |
| Nhóm | DEP |
| PIC | Mai Sơn Việt |
| Sprint | SPRINT 2 |
| SP hiện hành 09/11 | 2 |
| Trạng thái snapshot | TO DO — chưa đọc lại tiến độ Lark |
| Lịch cũ UTC+7 | 04/11/2026 08:00 → 05/11/2026 23:59; không phải cam kết mới |
| Giờ nguồn | 6 — chỉ lịch sử, chưa sizing lại giờ |
| Dependency triển khai | [BE-09](BE-09.md), [BE-17](BE-17.md), [UI-05](UI-05.md), [BE-54](BE-54.md), [BE-20](BE-20.md), [BE-25](BE-25.md), [BE-23](BE-23.md), [BE-24](BE-24.md), [UI-17](UI-17.md), [UI-18](UI-18.md), [BE-29](BE-29.md), [BE-30](BE-30.md), [BE-32](BE-32.md), [UI-19](UI-19.md), [UI-30](UI-30.md), [UI-44](UI-44.md), [BE-38](BE-38.md), [UI-32](UI-32.md), [BE-42](BE-42.md), [UI-14](UI-14.md), [UI-29](UI-29.md) |

**Làm xong phải dùng được:** Nhóm bàn giao một Postman collection qua Gateway với request/fixture/assertions đủ để người nhận tự chạy luồng nghiệp vụ và nhận biết lỗi đúng contract.

**SP hiện hành: 2.** Gom request/fixture và hướng dẫn Gateway từ contract từng owner; không làm lại API.

SP bao gồm triển khai/tích hợp/tự test/sửa lỗi đúng phạm vi, không phải remaining hoặc chứng nhận đủ capacity. [Bảng sizing 37 TASK/247 SP](../docs/Sprint_2_Story_Points_2026-11-08.md).

## 2. Phạm vi thống nhất và ranh giới

- Tổng hợp collection theo domain/role với environment placeholders, setup/cleanup an toàn và expected result
- Bao phủ positive/negative/auth/owner/retry của các task hiện hành, không tạo TEST task mới
- Không thay implementation hoặc coi export JSON là đã E2E; không gửi request tới production/khách thật khi chưa cho phép

Các ràng buộc có điều kiện “theo policy/contract đã chốt” cần quyết định ở mục 7 trước khi đánh PASS; không tự biến fixture, TTL ví dụ hay đề xuất thành business rule. Nghiệm thu một task không thay kết quả của task phối hợp.

## 3. Input, output và contract phải chốt

- Base URL Gateway, client header/cookie session theo Browser_Sessions; không hardcode business ports hoặc token/secret
- Request method/path/body/expected status+code theo API/contract owner, IDs từ fixture/response có liên kết
- Internal/webhook cases ghi rõ boundary và fixture riêng, không expose internal route để collection dễ gọi

**Bàn giao ra ngoài:** Tất cả domain owners bàn giao contract/fixtures; DEP-06/10 nhận collection và trạng thái ready/blocked thực, không lấy snapshot TO DO làm tiến độ mới.

Contract handoff cần ghi version, field/type/required/null, actor/scope, success/error, identity/retry và fixture mẫu phù hợp đầu ra. Tên route/DTO/event đã có trong đặc tả được ưu tiên; chỗ chưa có phải chốt với owner, không tự thêm API công khai hoặc trạng thái mới.

## 4. Bắt đầu từ đâu và thứ tự thực hiện

Đường dẫn dưới đây là điểm đọc source/tài liệu, **không phải xác nhận code đã hoàn thiện hoặc chạy đúng**. Giữ thay đổi local của người khác, tái dùng implementation hiện có thay vì tạo bản thứ hai.

- [architechture/docs/backlog.md](../../architechture/docs/backlog.md)
- [contracts/README.md](../../contracts/README.md)

1. Nhận contract/evidence/collection từng owner và inventory endpoint
2. Gộp folder/request name theo task/actor, environment placeholder và variables chain
3. Bổ sung expected success/error và điều kiện dừng/retry, fixture safe cleanup
4. Bàn giao manifest phiên bản/commit và run instructions; người dùng tự chạy khi ready

## 5. Dependency, handoff và điều kiện sẵn sàng

| Task đầu vào | PIC nguồn | Cần nhận trước phần liên quan |
|---|---|---|
| [BE-09](BE-09.md) | Trần Nguyễn Hữu Khánh | Triển khai xác thực JWT và kiểm tra vai trò, chủ sở hữu, cửa hàng tại Gateway và từng service nghiệp vụ; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-17](BE-17.md) | Trần Nguyễn Hữu Khánh | POST register/verify-otp/login/refresh/logout/forgot-password/reset-password; GET /api/auth/session qua Gateway theo API spec; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [UI-05](UI-05.md) | Trần Đức Anh | Thiết lập API Gateway, ánh xạ route qua Eureka và tích hợp xác thực để hai frontend gọi backend qua một đầu vào; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-54](BE-54.md) | Nguyễn Duy Quang Nhật | Public catalog routes qua Gateway/Eureka; key gồm phạm vi query/locale nếu ảnh hưởng response theo policy; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-20](BE-20.md) | Nguyễn Duy Quang Nhật | Cung cấp API công khai để tìm cửa hàng, duyệt menu, tìm kiếm và xem món hoặc combo với giá đúng chi nhánh; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-25](BE-25.md) | Trần Đức Anh | POST /api/orders CUS; PUT /api/orders/{id}/status STF/MGR/ADM theo ma trận state đã chốt; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-23](BE-23.md) | Trần Đức Anh | Triển khai giỏ hàng Redis cho khách vãng lai và Customer, hỗ trợ thêm, sửa, xóa món mà không trộn dữ liệu chủ sở hữu; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-24](BE-24.md) | Trần Đức Anh | POST /api/orders/preview CUS qua Gateway; actor/cart owner lấy từ auth; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [UI-17](UI-17.md) | Trần Đức Anh | Xây dựng và nối API trang giỏ hàng, hỗ trợ sửa số lượng, ghi chú, xóa món và cập nhật tổng tạm tính trước checkout; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [UI-18](UI-18.md) | Trần Đức Anh | Xây dựng và nối API checkout để chọn nhận hàng, áp dụng voucher hoặc điểm, xem chi tiết tiền và gửi yêu cầu tạo đơn; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-29](BE-29.md) | Lê Phú Thịnh | POST /api/payments/{orderId}/bank-transfer CUS hoặc internal đã xác thực; GET /api/payments/{orderId} theo owner/store; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-30](BE-30.md) | Lê Phú Thịnh | POST /api/payments/webhook/sepay là SYS, không dùng JWT Customer; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-32](BE-32.md) | Lê Phú Thịnh | confirm-manual MGR/ADM cần reason và căn cứ đối soát; confirm-cod STF/MGR/ADM đúng quán/state; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [UI-19](UI-19.md) | Trần Đức Anh | Xây dựng trang theo dõi đơn, tự cập nhật trạng thái bằng polling và hiển thị QR, thanh toán, thông tin giao hàng theo backend; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [UI-30](UI-30.md) | Trần Đức Anh | Xây dựng và nối API màn đơn hàng tại quán để Staff xem đơn hôm nay, chuyển trạng thái hợp lệ và xác nhận đã thu COD; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [UI-44](UI-44.md) | Lê Phú Thịnh | Xây dựng component QR, trạng thái thanh toán, phí giao và shipment, tích hợp hiển thị theo dữ liệu backend trong phạm vi MVP; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-38](BE-38.md) | Cao Tất Thành | GET my notifications và mark-read/read-all theo API/BE-52; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [UI-32](UI-32.md) | Cao Tất Thành | Xây dựng và nối API danh sách thông báo trên hai ứng dụng, hiển thị chưa đọc, mở nội dung và đánh dấu đã đọc; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-42](BE-42.md) | Mai Sơn Việt | API reports theo spec: from/to ISO date inclusive; thiếu to dùng hôm nay, thiếu from dùng đầu tháng của to; from>to/storeId<=0 trả400; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [UI-14](UI-14.md) | Mai Sơn Việt | Xây dựng dashboard nhân sự với thẻ thống kê, biểu đồ và bộ lọc, hiển thị số liệu backend đúng phạm vi vai trò; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [UI-29](UI-29.md) | Mai Sơn Việt | Xây dựng và nối API báo cáo, cho chọn kỳ, cửa hàng, xem biểu đồ và xuất Excel hoặc PDF đúng quyền; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |

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

- **Q01:** Owner thống nhất môi trường, tài khoản/quán fixture, safe recipients và cleanup phạm vi
- **Q02:** Auth API trong Postman không giống browser CSRF tự động: ghi explicit Origin/client/cookie, không nới backend để demo

Mỗi quyết định cần owner, lựa chọn, nguồn/phiên bản và AC bị ảnh hưởng. Khi chưa chốt thì đánh BLOCKED các AC đó, vẫn làm phần độc lập; không âm thầm hạ quyền kiểm tra, bỏ dữ liệu hoặc sửa AC để nhận DONE.

## 8. Acceptance Criteria — tình huống, kết quả và bằng chứng

Các AC dưới đây đều **CHƯA CHẠY trong lượt viết detail**. Dev cập nhật PASS/FAIL/BLOCKED kèm evidence; N/A chỉ khi ngoài phạm vi thực sự và có lý do/owner, không dùng N/A để bỏ security hoặc yêu cầu đã chốt.

| AC | Fixture / thao tác | Kết quả phải quan sát | Evidence cần nộp |
|---|---|---|---|
| DEP-09/AC-01 | Import collection/environment trên profile sạch | Không thiếu biến bắt buộc, placeholder được hướng dẫn rõ | Import checklist |
| DEP-09/AC-02 | Mỗi public/business request dùng base URL | Qua Gateway đúng route, không business service port hardcode | URL inventory |
| DEP-09/AC-03 | Login/session/refresh/logout hai client | Đúng cookie/client/Origin, không lưu token thật vào file export | Auth request matrix |
| DEP-09/AC-04 | Happy path mỗi domain có IDs chain | Expected status/body/data readback, không chỉ assert200 | Request inventory |
| DEP-09/AC-05 | Validation/unauth/forbidden/owner-store cases | Có expected code và side effect expectation, allow case đối chứng | Negative case matrix |
| DEP-09/AC-06 | Retry/idempotency/webhook replay cases được phép | Fixture/identity giữ đúng, không phát sinh chuyển tiền thật | Replay setup |
| DEP-09/AC-07 | Dependency chưa sẵn sàng | Runbook đánh BLOCKED và dừng chặng tương ứng, không fake success | Readiness checklist |
| DEP-09/AC-08 | Collection/env/export/log có secret marker | Không credential/token/PII thật, secret chỉ nhập local runtime | Sanitization checklist |
| DEP-09/AC-09 | Cleanup fixture sau run | Chỉ resource thuộc run đã xác định, không reset DB/volume hoặc seed chung | Cleanup manifest |
| DEP-09/AC-10 | API contract đổi | Collection/version/expected cập nhật cùng task, owner rõ | Version diff |
| DEP-09/AC-11 | Handoff thiếu version hoặc artifact không mở/nhập được | Ghi blocker/PIC, không coi đã export là bàn giao xong; không sửa môi trường production để né | Manifest và readiness checklist |
| DEP-09/AC-12 | Sửa artifact sau khi owner cập nhật evidence/contract | Các bản cùng version hoặc ghi rõ phần chưa đồng bộ, không dùng evidence cũ cho claim mới | Change log và link task |

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
- [ ] **DOD-11** — Artifact mở/nhập được theo công cụ đích, version và manifest đúng, đường dẫn tài nguyên không trỏ file cá nhân không bàn giao.
- [ ] **DOD-12** — Mọi claim demo/collection phân biệt planned, mock, recorded và live đã có evidence; không suy kết quả từ ảnh hoặc commit.
- [ ] **DOD-13** — Tài liệu bàn giao giữ đúng actor, quyền, trạng thái nghiệp vụ và số task/SP hiện hành; không công khai credential trong collection/deck.
- [ ] **DOD-14** — Bàn giao collection+environment placeholder+README+fixture manifest, không chỉ file JSON
- [ ] **DOD-15** — Có bảng endpoint→task→actor→expected→prerequisite và owner chưa bàn giao
- [ ] **DOD-16** — Không ghi PASS chạy collection nếu chỉ biên soạn/import, người dùng tự thực thi

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

**Bản này thay phần ghép nối cũ**, chỉ dùng một phạm vi, một bộ AC/DoD hiện hành. ID nguồn sau gộp không phải task/subtask độc lập: không có gói ID nhận thêm riêng trong bản nguồn.

[Bản detail trước biên soạn — chỉ lưu lịch sử](history/2026-11-08-before-detail-rewrite/DEP-09.md) giữ nguyên các contract/checklist/metadata cũ để đối chiếu. Không giao lại hoặc cộng SP từ bản lưu. Các AC lặp được hợp nhất theo mục tiêu, phần phối hợp domain khác nằm ở handoff chứ không giao cả kiểm thử toàn hệ thống cho mỗi task.

**Định danh Lark nguồn — chỉ để đối chiếu, không phải record mới:**
- Mail-4570 / reczz28Rid5Xhv3s

- [API](../docs/Đặc%20tả%20API.md) · [RBAC](../docs/Ma%20trận%20phân%20quyền.md) · [SRS](../docs/SRS.md) · [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md).
- [Error catalog và vi/en](../../contracts/README.md) · [Brand](../docs/Brand_Guidelines.md) · [Browser sessions 08/11](../docs/Browser_Sessions.md).
- [Backlog hiện hành](../docs/backlog.md) · [Gộp 08/11](../docs/Sprint_2_Consolidation_2026-11-08.md) · [Báo cáo biên soạn detail](../docs/Sprint_2_Task_Details_2026-11-08.md).
