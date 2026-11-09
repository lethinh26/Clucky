# [DEP-10] Chuẩn bị kịch bản demo, ảnh minh chứng và slide Sprint Review, phân biệt rõ chức năng đã nghiệm thu với phần còn hạn chế

> **SP hiện hành ngày 09/11/2026: 1 — SPRINT 3.** Thang 0/1/2/3/5/8, tối đa 8. Demo và slide từ kết quả owner bàn giao; không tính implementation hoặc nghiệm thu thay owner. Giữ nguyên AC/DoD, PIC, trạng thái và giờ nguồn; không hạ điểm do công đã làm, không quy đổi thành remaining/capacity. Phạm vi mở rộng RBAC A–E mới là kế hoạch đề xuất, chưa nằm trong estimate này. SP/lịch trong các mục lịch sử không phải estimate hiện hành.

> **Đã đồng bộ Lark 08/11/2026.** Title, scope, AC/DoD và SP kế hoạch đã cập nhật; giữ PIC/trạng thái/sprint/lịch thực tế trên Lark. Các ghi chú “chưa đồng bộ” và tiến độ bên dưới là snapshot lịch sử. [Kết quả đồng bộ và chênh lệch sprint](../docs/Lark_Backlog_Sync_2026-11-08.md).

> Detail thống nhất sau gộp và sizing — 08/11/2026. Chỉ biên soạn repository, chưa đồng bộ Lark và chưa chạy kiểm thử. Không thay SP/PIC/status/lịch chỉ vì detail đã đầy đủ.

## 1. Giao việc và kết quả cần bàn giao

| Thuộc tính | Hiện hành |
|---|---|
| Mã | DEP-10 |
| Loại | TASK — task chính, không có subtask INT/TEST |
| Nhóm | DEP |
| PIC | Trần Nguyễn Hữu Khánh |
| Sprint | SPRINT 2 |
| SP hiện hành 09/11 | 1 |
| Trạng thái snapshot | TO DO — chưa đọc lại tiến độ Lark |
| Lịch cũ UTC+7 | 04/11/2026 08:00 → 05/11/2026 23:59; không phải cam kết mới |
| Giờ nguồn | 8 — chỉ lịch sử, chưa sizing lại giờ |
| Dependency triển khai | [BE-25](BE-25.md), [BE-17](BE-17.md), [BE-20](BE-20.md), [BE-23](BE-23.md), [BE-24](BE-24.md), [BE-32](BE-32.md), [UI-09](UI-09.md), [UI-11](UI-11.md), [UI-17](UI-17.md), [UI-18](UI-18.md), [UI-30](UI-30.md), [BE-19](BE-19.md), [BE-42](BE-42.md), [UI-15](UI-15.md), [UI-29](UI-29.md), [BE-21](BE-21.md), [BE-34](BE-34.md), [UI-25](UI-25.md), [UI-26](UI-26.md), [UI-28](UI-28.md), [BE-09](BE-09.md), [BE-22](BE-22.md), [BE-26](BE-26.md), [BE-27](BE-27.md), [BE-33](BE-33.md), [BE-40](BE-40.md), [BE-43](BE-43.md), [BE-63](BE-63.md), [BE-72](BE-72.md) |

**Làm xong phải dùng được:** Sprint Review có kịch bản demo, ảnh và slide phản ánh đúng chức năng đã được owner nghiệm thu, giới hạn và lỗi còn mở.

**SP hiện hành: 1.** Demo và slide từ kết quả owner bàn giao; không tính implementation hoặc nghiệm thu thay owner.

SP bao gồm triển khai/tích hợp/tự test/sửa lỗi đúng phạm vi, không phải remaining hoặc chứng nhận đủ capacity. [Bảng sizing 37 TASK/247 SP](../docs/Sprint_2_Story_Points_2026-11-08.md).

## 2. Phạm vi thống nhất và ranh giới

- Script theo actor/flow, evidence/screenshots, slides, danh sách limitation/bug và điều kiện demo
- Dùng 37 TASK/247 SP hiện hành, không quảng bá 55 task/328 SP như kế hoạch mới
- Không tự chạy test/demo/deploy, không làm bù feature hoặc tạo evidence giả

Các ràng buộc có điều kiện “theo policy/contract đã chốt” cần quyết định ở mục 7 trước khi đánh PASS; không tự biến fixture, TTL ví dụ hay đề xuất thành business rule. Nghiệm thu một task không thay kết quả của task phối hợp.

## 3. Input, output và contract phải chốt

- Mỗi bước demo liên kết task, commit/environment, fixture, expected và evidence thật nếu có
- Đánh dấu live/recorded/mock/blocked; screenshot UI không chứng minh Payment/webhook/Kafka đã đạt
- Dữ liệu khách/sender/bank/account dùng fixture được phép, không secret; lịch Review cũ không tự thành lịch mới

**Bàn giao ra ngoài:** Domain owners cung cấp evidence; DEP-09 cung cấp collection; nhóm Review nhận danh sách ready/blocked và giới hạn trung thực.

Contract handoff cần ghi version, field/type/required/null, actor/scope, success/error, identity/retry và fixture mẫu phù hợp đầu ra. Tên route/DTO/event đã có trong đặc tả được ưu tiên; chỗ chưa có phải chốt với owner, không tự thêm API công khai hoặc trạng thái mới.

## 4. Bắt đầu từ đâu và thứ tự thực hiện

Đường dẫn dưới đây là điểm đọc source/tài liệu, **không phải xác nhận code đã hoàn thiện hoặc chạy đúng**. Giữ thay đổi local của người khác, tái dùng implementation hiện có thay vì tạo bản thứ hai.

- [architechture/docs/backlog.md](../../architechture/docs/backlog.md)
- [contracts/README.md](../../contracts/README.md)

1. Thu status/evidence từ owner, không suy DONE từ commit
2. Chọn critical path đã sẵn sàng, viết script actor/setup/step/expected/fallback
3. Biên soạn ảnh/slide và phân biệt actual vs planned/blocked
4. Rà đối chiếu task/SP/limitations và bàn giao cho người trình bày

## 5. Dependency, handoff và điều kiện sẵn sàng

| Task đầu vào | PIC nguồn | Cần nhận trước phần liên quan |
|---|---|---|
| [BE-25](BE-25.md) | Trần Đức Anh | POST /api/orders CUS; PUT /api/orders/{id}/status STF/MGR/ADM theo ma trận state đã chốt; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-17](BE-17.md) | Trần Nguyễn Hữu Khánh | POST register/verify-otp/login/refresh/logout/forgot-password/reset-password; GET /api/auth/session qua Gateway theo API spec; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-20](BE-20.md) | Nguyễn Duy Quang Nhật | Cung cấp API công khai để tìm cửa hàng, duyệt menu, tìm kiếm và xem món hoặc combo với giá đúng chi nhánh; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-23](BE-23.md) | Trần Đức Anh | Triển khai giỏ hàng Redis cho khách vãng lai và Customer, hỗ trợ thêm, sửa, xóa món mà không trộn dữ liệu chủ sở hữu; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-24](BE-24.md) | Trần Đức Anh | POST /api/orders/preview CUS qua Gateway; actor/cart owner lấy từ auth; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-32](BE-32.md) | Lê Phú Thịnh | confirm-manual MGR/ADM cần reason và căn cứ đối soát; confirm-cod STF/MGR/ADM đúng quán/state; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [UI-09](UI-09.md) | Trần Nguyễn Hữu Khánh | Xây dựng và nối API đăng nhập, đăng ký Customer, xác thực OTP, quên hoặc đặt lại mật khẩu cho đúng luồng của hai ứng dụng; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [UI-11](UI-11.md) | Nguyễn Duy Quang Nhật | Xây dựng và nối API trang menu theo quán, hỗ trợ danh mục, tìm kiếm, bộ lọc và đồng bộ lựa chọn với URL; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [UI-17](UI-17.md) | Trần Đức Anh | Xây dựng và nối API trang giỏ hàng, hỗ trợ sửa số lượng, ghi chú, xóa món và cập nhật tổng tạm tính trước checkout; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [UI-18](UI-18.md) | Trần Đức Anh | Xây dựng và nối API checkout để chọn nhận hàng, áp dụng voucher hoặc điểm, xem chi tiết tiền và gửi yêu cầu tạo đơn; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [UI-30](UI-30.md) | Trần Đức Anh | Xây dựng và nối API màn đơn hàng tại quán để Staff xem đơn hôm nay, chuyển trạng thái hợp lệ và xác nhận đã thu COD; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-19](BE-19.md) | Trần Nguyễn Hữu Khánh | GET /api/users ADM; POST /api/users/staff ADM/MGR; PUT assign-store ADM; lock/unlock theo RBAC; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-42](BE-42.md) | Mai Sơn Việt | API reports theo spec: from/to ISO date inclusive; thiếu to dùng hôm nay, thiếu from dùng đầu tháng của to; from>to/storeId<=0 trả400; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [UI-15](UI-15.md) | Trần Nguyễn Hữu Khánh | Xây dựng và nối API quản lý tài khoản nhân sự, hỗ trợ tìm kiếm, tạo, khóa hoặc mở tài khoản và gán quán đúng quyền; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [UI-29](UI-29.md) | Mai Sơn Việt | Xây dựng và nối API báo cáo, cho chọn kỳ, cửa hàng, xem biểu đồ và xuất Excel hoặc PDF đúng quyền; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-21](BE-21.md) | Nguyễn Duy Quang Nhật | Route /api/stores và /api/catalog theo API; DTO riêng cho resource và mutation; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-34](BE-34.md) | Cao Tất Thành | Route /api/promotions theo API/BE-51; actor/store/order context trusted; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [UI-25](UI-25.md) | Nguyễn Duy Quang Nhật | Xây dựng và nối API form quản lý món, combo, tùy chọn và topping, hỗ trợ upload ảnh và giữ dữ liệu khi lưu lỗi; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [UI-26](UI-26.md) | Nguyễn Duy Quang Nhật | Xây dựng và nối API quản lý chi nhánh, hỗ trợ danh sách, thêm, sửa, xóa, giờ mở và khu vực giao theo quyền; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [UI-28](UI-28.md) | Cao Tất Thành | Xây dựng và nối API quản lý voucher thường; giữ phần đề xuất chi nhánh và banner ở trạng thái backlog, chưa triển khai nghiệp vụ; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-09](BE-09.md) | Trần Nguyễn Hữu Khánh | Triển khai xác thực JWT và kiểm tra vai trò, chủ sở hữu, cửa hàng tại Gateway và từng service nghiệp vụ; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-22](BE-22.md) | Nguyễn Duy Quang Nhật | GET/PUT inventory và PUT availability dưới /api/stores/{storeId}; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-26](BE-26.md) | Trần Đức Anh | PUT /api/orders/{id}/cancel CUS; reject STF/MGR/ADM; POST refund-requests CUS; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-27](BE-27.md) | Trần Đức Anh | GET /api/orders/my, /api/orders/{id}, /api/orders theo quyền; reorder endpoint/method phải chốt nếu API chưa khai báo; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-33](BE-33.md) | Lê Phú Thịnh | Route /api/shipping calculate-fee/config/shipment theo API; cấu hình hệ thống chỉ Admin; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-40](BE-40.md) | Mai Sơn Việt | Review routes theo API; internal Order verification dùng Bearer Customer+correlation qua Eureka, Gateway không công bố; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-43](BE-43.md) | Mai Sơn Việt | GET /api/audit-logs MGR/ADM; filter actorId/actorRole/sourceService/action/targetType/targetId/storeId/from/to; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-63](BE-63.md) | Mai Sơn Việt | GET /api/notifications/email-logs ADM/MGR theo API; scope store phải trusted, auth/OTP/global log không tự gán quán từ email; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |
| [BE-72](BE-72.md) | Nguyễn Duy Quang Nhật | POST /api/catalog/products/{id}/image và combos/{id}/image ADMIN, multipart theo contract hiện có; cần contract/version và trạng thái bàn giao, không suy từ deadline hoặc code. |

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

- **Q01:** Nhóm chốt demo scope/môi trường/recipient và người trình bày, lịch mới nếu cần
- **Q02:** Evidence chưa có thì ghi chưa nghiệm thu, không dựng screenshot thành công giả hoặc tự chuyển tiền để có minh chứng

Mỗi quyết định cần owner, lựa chọn, nguồn/phiên bản và AC bị ảnh hưởng. Khi chưa chốt thì đánh BLOCKED các AC đó, vẫn làm phần độc lập; không âm thầm hạ quyền kiểm tra, bỏ dữ liệu hoặc sửa AC để nhận DONE.

## 8. Acceptance Criteria — tình huống, kết quả và bằng chứng

Các AC dưới đây đều **CHƯA CHẠY trong lượt viết detail**. Dev cập nhật PASS/FAIL/BLOCKED kèm evidence; N/A chỉ khi ngoài phạm vi thực sự và có lý do/owner, không dùng N/A để bỏ security hoặc yêu cầu đã chốt.

| AC | Fixture / thao tác | Kết quả phải quan sát | Evidence cần nộp |
|---|---|---|---|
| DEP-10/AC-01 | Script critical path hợp lệ với fixture/actor rõ | Người trình bày biết setup, thao tác, expected và cleanup | Script review |
| DEP-10/AC-02 | Mỗi claim hoàn thành trên slide | Có task/commit/environment/evidence owner xác nhận | Traceability matrix |
| DEP-10/AC-03 | Flow Payment hiện QR nhưng chưa webhook | Trình bày đúng pending, không nói đã nhận tiền | Claim check |
| DEP-10/AC-04 | Kafka/email/audit chỉ có code hoặc mock | Ghi chưa nghiệm thu runtime, không gán PASS | Evidence classification |
| DEP-10/AC-05 | Phần chưa sẵn sàng hoặc dependency lỗi | Có nhánh dừng/giới hạn rõ, không sửa feature trong demo để che lỗi | Fallback plan |
| DEP-10/AC-06 | Ảnh/video/tài liệu chứa user/credential thật | Redact hoặc dùng fixture, không leak secret | Artifact review |
| DEP-10/AC-07 | Tổng task/SP và tên task trên slides | 37 TASK/247 SP theo kế hoạch mới, không dùng số nguồn như hiện hành | Numbers cross-reference |
| DEP-10/AC-08 | Actor Staff/Manager/Admin trong demo | Chỉ dùng quyền đúng, không Admin giả làm Staff để vượt lỗi | Actor matrix |
| DEP-10/AC-09 | Bug/limitation và Phase 2 | Nêu owner/impact/trạng thái, không quảng bá shipping tracking hoặc policy hoãn | Known-issues list |
| DEP-10/AC-10 | Evidence chưa được cung cấp | Đánh BLOCKED/chưa chạy, bản draft không xem là nghiệm thu | Readiness table |
| DEP-10/AC-11 | Handoff thiếu version hoặc artifact không mở/nhập được | Ghi blocker/PIC, không coi đã export là bàn giao xong; không sửa môi trường production để né | Manifest và readiness checklist |
| DEP-10/AC-12 | Sửa artifact sau khi owner cập nhật evidence/contract | Các bản cùng version hoặc ghi rõ phần chưa đồng bộ, không dùng evidence cũ cho claim mới | Change log và link task |

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
- [ ] **DOD-14** — Bàn giao script, deck, ảnh và index evidence có version/owner
- [ ] **DOD-15** — Phân biệt kế hoạch với kết quả thực, không thay trạng thái Lark từ tài liệu
- [ ] **DOD-16** — Dùng lại evidence domain, không cộng công self-test toàn dự án vào task slide

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

[Bản detail trước biên soạn — chỉ lưu lịch sử](history/2026-11-08-before-detail-rewrite/DEP-10.md) giữ nguyên các contract/checklist/metadata cũ để đối chiếu. Không giao lại hoặc cộng SP từ bản lưu. Các AC lặp được hợp nhất theo mục tiêu, phần phối hợp domain khác nằm ở handoff chứ không giao cả kiểm thử toàn hệ thống cho mỗi task.

**Định danh Lark nguồn — chỉ để đối chiếu, không phải record mới:**
- Mail-4571 / reczz28Rid5XheDN

- [API](../docs/Đặc%20tả%20API.md) · [RBAC](../docs/Ma%20trận%20phân%20quyền.md) · [SRS](../docs/SRS.md) · [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md).
- [Error catalog và vi/en](../../contracts/README.md) · [Brand](../docs/Brand_Guidelines.md) · [Browser sessions 08/11](../docs/Browser_Sessions.md).
- [Backlog hiện hành](../docs/backlog.md) · [Gộp 08/11](../docs/Sprint_2_Consolidation_2026-11-08.md) · [Báo cáo biên soạn detail](../docs/Sprint_2_Task_Details_2026-11-08.md).
