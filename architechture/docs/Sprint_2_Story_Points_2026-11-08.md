# Ước lượng lại Story Point Sprint 2 — 08/11/2026

> **Đã đồng bộ Lark ngày 08/11/2026:** 124 TASK chính; 60 record nguồn đã xoá sau khi chuyển dữ liệu. Tập sizing 37 TASK/247 SP đã cập nhật đủ; trường Sprint 2 thực tế có 35 TASK/218 SP vì giữ lịch nhóm đã đổi. Các ghi chú “chưa đồng bộ” bên dưới là lịch sử biên soạn. [Báo cáo đồng bộ và bảng đối chiếu](Lark_Backlog_Sync_2026-11-08.md).

> **Detail tiếp tục được biên soạn thống nhất ngày 08/11:** xem [phạm vi, AC/DoD và handoff hiện hành](Sprint_2_Task_Details_2026-11-08.md). Gỡ phần ghép lặp/loại trừ lỗi thời, giữ 37 TASK/247 SP, PIC, dependency và trạng thái. Bản detail trước đó được lưu lịch sử; chưa đồng bộ Lark hoặc chạy kiểm thử.

## Kết quả

**37 TASK, 247 SP kế hoạch mới.** 328 chỉ là tổng SP nguồn trước sizing, không dùng cho kế hoạch hiện hành. Đã đánh giá lại tất cả 37 task; task giữ điểm vẫn đã được rà, không có yêu cầu phải giảm mọi con số.

Chỉ sửa SP Sprint 2; không đổi task/PIC, scope, AC/DoD, dependency, trạng thái hoặc lịch. Chưa đồng bộ Lark; đây là estimate kế hoạch do rà backlog, chưa phải planning poker của nhóm, remaining đã đo hay cam kết đủ capacity.

## Cách chấm và mốc so sánh

- Dùng thang tương đối 1, 2, 3, 5, 8, 13, 21; không đổi SP thành giờ, không lấy số task nhân SP trung bình, không giảm theo tỷ lệ hoặc ép về tổng mong muốn.
- **2 SP:** tài liệu/demo từ đầu vào đã được owner cung cấp, ví dụ DEP-10; không tính thời gian chờ.
- **3 SP:** luồng hẹp, ít quy tắc, có nền/contract dùng chung, ví dụ BE-18 hoặc KAFKA-05; quyền, validation và self-test vẫn bắt buộc.
- **5 SP:** một cụm nghiệp vụ có validation/quyền và một số nhánh lỗi/tích hợp, ví dụ BE-19 hoặc BE-33.
- **8 SP:** nhiều contract, state hoặc rủi ro replay/security/recovery, ví dụ BE-30, BE-62 hoặc KAFKA-09.
- **13 SP:** đầu ra lớn xuyên nhiều bước, nhiều race/transaction boundary, ví dụ BE-25, BE-32, BE-72. Không có trần bắt buộc 13; nếu owner phát hiện độ bất định lớn hơn thì tăng estimate hoặc chốt lại phạm vi, không cắt AC để giữ điểm.
- Chấm toàn bộ scope hiện hành và phần frontend đã nhận khi có; tính code, tích hợp, tự test và sửa lỗi một lần. Component/DTO, validation, template, error handling và cùng bộ evidence được dùng chung không cộng lặp theo record cũ.
- Implementation thuộc task khác chỉ là đầu vào/contract, không tính lại cả hai phía. Tuy vậy task nhận vẫn chịu công tích hợp, xử lý lỗi và kiểm chứng đầu ra của mình.
- Nền/schema/config/contract trong task prerequisite được giả định bàn giao đúng; thiếu handoff phải ghi blocker, không giả định đã DONE hoặc dùng code có sẵn làm bằng chứng runtime. Nếu prerequisite đổi phạm vi phải rà lại SP, không âm thầm bỏ việc.
- Performance/load hoãn, Shipping Phase 2, promotion email/approval, avatar/banner và UI email-log hoãn vẫn ngoài scope sprint đã cam kết. Các biên an toàn Payment/secret/idempotency không được loại khỏi estimate.

## Phân bổ theo người

| PIC | TASK | SP nguồn cũ | SP kế hoạch mới |
|---|---:|---:|---:|
| Cao Tất Thành | 7 | 60 | 45 |
| Lê Phú Thịnh | 8 | 74 | 53 |
| Mai Sơn Việt | 8 | 63 | 53 |
| Nguyễn Duy Quang Nhật | 4 | 52 | 29 |
| Trần Nguyễn Hữu Khánh | 4 | 32 | 23 |
| Trần Đức Anh | 6 | 47 | 44 |
| **Tổng** | **37** | **328** | **247** |

Sự chênh lệch là thay đổi cách ước lượng sau loại công tính lặp và phân định owner, không phải khối lượng đã hoàn thành hoặc giờ tiết kiệm. Không dùng SP để xếp hạng năng suất hoặc kết luận ai quá tải khi chưa có capacity.

## Cơ sở cho đủ 37 TASK

| TASK | Đầu ra | SP nguồn | SP mới | Cơ sở đánh giá lại |
|---|---|---:|---:|---|
| [BE-17](../tasks/BE-17.md) | Hoàn thiện xác thực tài khoản: đăng ký và OTP, đăng nhập, làm mới phiên, đăng xuất và đặt lại mật khẩu trên hai ứng dụng | 16 | 13 | Một luồng xác thực thống nhất trên hai app nhưng có OTP, refresh rotation, logout, reset và nhiều biên bảo mật; dùng chung session/error/email contract, không cộng riêng từng màn và từng bước. |
| [BE-18](../tasks/BE-18.md) | Cung cấp API xem, sửa hồ sơ và quản lý sổ địa chỉ, bảo đảm mỗi khách chỉ có một địa chỉ mặc định | 5 | 3 | CRUD hồ sơ/địa chỉ trong một domain với DTO và guard dùng chung; vẫn tính ownership, địa chỉ mặc định duy nhất và ca concurrent, không cộng avatar đang hoãn. |
| [BE-19](../tasks/BE-19.md) | Cung cấp API tạo, khóa nhân viên, gán cửa hàng cho Admin và xếp ca cho Manager đúng phạm vi quản lý | 8 | 5 | Một cụm quản lý nhân sự với ma trận Admin/Manager/Staff, gán quán và xếp ca; tính validation/scope và self-test một lần, không tính thêm task nối UI đã gộp. |
| [BE-21](../tasks/BE-21.md) | Cung cấp API quản lý cửa hàng, danh mục, món, combo và tùy chọn, kiểm tra quyền và lưu dữ liệu nhất quán | 13 | 8 | Nhiều tài nguyên Catalog nhưng dùng chung cấu trúc CRUD, validation, quyền và transaction; độ phức tạp nằm ở combo/options và readback, không nhân SP theo số entity hoặc form; upload riêng BE-72. |
| [BE-22](../tasks/BE-22.md) | Cung cấp API cập nhật tồn kho, bật hoặc tắt bán món theo chi nhánh và phản ánh thay đổi lên menu | 5 | 3 | Cập nhật tồn/trạng thái bán có phạm vi hẹp trên Catalog; tính quyền quán và thông báo invalidation, không tính lại toàn bộ cache do BE-54 sở hữu. |
| [BE-24](../tasks/BE-24.md) | Cung cấp API xem trước đơn hàng, tính giá món, voucher, điểm và phí giao từ backend mà chưa tạo đơn hoặc thanh toán | 8 | 8 | Preview phối hợp Catalog/Promotion/Shipping, tính breakdown authoritative và xử lý upstream lỗi; giữ điểm vì nhiều contract và nguy cơ sai tiền, không có side effect tạo đơn. |
| [BE-25](../tasks/BE-25.md) | Triển khai tạo đơn từ checkout, chốt giá và trạng thái bán, khởi tạo thanh toán và chống tạo trùng khi gửi lại | 13 | 13 | Luồng tạo đơn xuyên service, snapshot giá, availability, idempotency và race payment/state; một mốc lớn, không hạ điểm chỉ vì bỏ INT/TEST; load test 50 concurrent còn hoãn không tính vào sprint. |
| [BE-26](../tasks/BE-26.md) | Triển khai hủy hoặc từ chối đơn đúng quyền, đúng trạng thái và tạo yêu cầu hoàn tiền cho đơn đã chuyển khoản | 5 | 5 | State transition hủy/từ chối theo owner/store và tạo refund request; tính race và kiểm chứng nhưng không tính lại phê duyệt/ghi nhận hoàn tiền BE-32. |
| [BE-27](../tasks/BE-27.md) | Cung cấp API lịch sử, chi tiết và đặt lại đơn, lọc theo chủ sở hữu hoặc cửa hàng và dùng giá hiện hành khi đặt lại | 8 | 5 | Query lịch sử/chi tiết dùng chung filter/quyền; reorder phải lấy giá/availability mới, polling UI phải đúng lifecycle. Không tính lại tạo đơn hoặc toàn bộ checkout. |
| [BE-29](../tasks/BE-29.md) | Cung cấp luồng QR chuyển khoản, thời hạn và tra cứu trạng thái thanh toán, kèm contract và tài liệu tích hợp Payment/Shipping | 13 | 8 | Gộp QR, status/ownership, expiry race và tài liệu contract trong một luồng Payment; DTO/OpenAPI dùng chung, webhook BE-30 và phí giao BE-33 chỉ là handoff, không tính lại implementation. |
| [BE-30](../tasks/BE-30.md) | Tiếp nhận webhook SePay, xác thực chữ ký và đối chiếu mã đơn, số tiền để ghi nhận thanh toán đúng một lần | 8 | 8 | Xác thực raw-body, đối chiếu đúng giao dịch/amount/reference, chống replay/concurrent và ACK an toàn; giữ mức cao do rủi ro nhận tiền nhầm, không bao gồm policy tra soát nâng cao đang hoãn. |
| [BE-32](../tasks/BE-32.md) | Hoàn thiện quản lý thanh toán: tra cứu và đối soát giao dịch, xác nhận chuyển khoản hoặc COD, duyệt hoàn tiền và cấu hình ngân hàng | 21 | 13 | Quản trị payment/COD, bank config và refund state machine liên quan Order, audit và concurrency; các action dùng chung guard/query/mutation nhưng vẫn là gói lớn, không cộng cơ học 21 SP nguồn. |
| [BE-33](../tasks/BE-33.md) | Hoàn thiện tính và cấu hình phí giao theo quán, khoảng cách, ngưỡng miễn phí và nhận tại quán, kèm API đọc shipment MVP | 8 | 5 | Tính phí/config theo quán, pickup, threshold/override và đọc shipment CREATED dùng chung một bộ quy tắc; không tính lại consumer tạo shipment KAFKA-05 hoặc tracking Phase 2. |
| [BE-34](../tasks/BE-34.md) | Cung cấp API quản lý và áp dụng voucher toàn chuỗi hoặc từng quán, kiểm tra điều kiện và trả số tiền giảm hợp lệ | 8 | 5 | CRUD voucher và validate eligibility/scope dùng chung mô hình và validation; giữ các ca hết hạn, hết lượt, sai quán, không tính lại preview Order, ledger điểm hay proposal/banner hoãn. |
| [BE-37](../tasks/BE-37.md) | Cung cấp API điểm và hạng thành viên, cấu hình tích hoặc đổi điểm và lưu biến động số dư không bị cộng, trừ lặp | 8 | 8 | Ledger điểm, redeem/earn và số dư concurrent cần transaction/idempotency rõ; giữ mức cao, tách consumer order.completed KAFKA-06 khỏi implementation của API/ledger. |
| [BE-38](../tasks/BE-38.md) | Cung cấp API danh sách thông báo, đánh dấu từng mục hoặc tất cả đã đọc và nối với giao diện đúng người nhận | 3 | 3 | Inbox cá nhân, phân trang, read/read-all và nối UI là luồng hẹp; ownership và read-state bắt buộc, không cộng công producer/orchestration KAFKA-12. |
| [KAFKA-12](../tasks/KAFKA-12.md) | Xử lý sự kiện Order, Payment để tạo thông báo và yêu cầu gửi email đúng người, chống trùng và không rollback nghiệp vụ khi email lỗi | 8 | 8 | Orchestration nhiều event thành notification/email, mapping recipient/template, replay protection và không rollback nghiệp vụ; không tính lại SMTP, renderer hoặc scheduler ở BE-60/62. |
| [BE-40](../tasks/BE-40.md) | Hoàn thiện đánh giá món đã mua: khách tạo, sửa, xóa; nhân sự phản hồi hoặc ẩn nội dung đúng quyền và cửa hàng | 8 | 5 | Create/edit/delete/reply/hide dùng chung review resource và luồng readback; cộng độ khó kiểm đơn hoàn tất, quyền quán và audit, không cộng riêng mỗi endpoint thành một task. |
| [BE-42](../tasks/BE-42.md) | Cung cấp dashboard và báo cáo doanh thu theo quyền, hỗ trợ lọc kỳ, cửa hàng và xuất Excel hoặc PDF khớp số liệu | 13 | 8 | Dashboard/query theo role và export Excel/PDF dùng chung tập filter/cách tính; projection consumer ở KAFKA-07 được sizing riêng, giữ công đối chiếu dữ liệu và quyền nhưng không tính tổng hợp hai lần. |
| [BE-43](../tasks/BE-43.md) | Xây dựng Audit Service độc lập, sở hữu bảng audit_logs và cung cấp API tra cứu nhật ký quản trị theo quyền | 5 | 5 | Service Audit độc lập, migration/schema và API tra cứu có RBAC/storeId; giữ điểm cho nền service và bảo mật, producer/consumer phủ domain nằm KAFKA-10. |
| [BE-54](../tasks/BE-54.md) | Kết nối menu qua Gateway và triển khai cache theo quán, làm mới dữ liệu khi giá hoặc trạng thái bán thay đổi | 5 | 5 | Cache key theo quán, invalidation sau commit và contract freshness/availability có ca stale/race; giữ điểm cho correctness, mục tiêu performance <500ms vẫn hoãn. |
| [BE-60](../tasks/BE-60.md) | Hoàn thiện gửi email nghiệp vụ qua Gmail SMTP: kiểm tra đầu vào, render mẫu OTP, đơn hàng, thanh toán và hoàn tiền, trả rõ kết quả gửi | 15 | 8 | Gmail adapter, render và các mẫu OTP/order/payment/refund dùng chung một pipeline; tính TLS/timeout, template validation, secret và unknown outcome, không cộng từng template hoặc DTO riêng. |
| [BE-62](../tasks/BE-62.md) | Quản lý vòng đời gửi email: lưu trạng thái, chống job trùng, phục hồi worker và gửi lại có giới hạn trước khi chuyển FAILED | 13 | 8 | Một state machine email gom persistence/atomic claim, recovery, retry/backoff và FAILED; dùng chung identity/idempotency, vẫn phải xử lý concurrency và outcome chưa xác định, không cộng SMTP hoặc DLQ API. |
| [BE-63](../tasks/BE-63.md) | Hoàn thiện vận hành email: ghi nhận failure/DLQ bền vững, truy vết các lần gửi và cung cấp API tra cứu log đúng quyền | 13 | 8 | Gom failure/DLQ, trace/metrics và API log trên cùng delivery identity; có durable handoff, masking và quyền Manager nên không coi là CRUD đơn giản; không tính lại retry worker hoặc UI email-log đang hoãn. |
| [BE-72](../tasks/BE-72.md) | Hoàn thiện upload và thay ảnh món, combo từ giao diện đến Cloudinary: kiểm tra file, lưu metadata, xử lý lỗi và dọn ảnh an toàn | 29 | 13 | Luồng upload/thay ảnh end-to-end gồm component, validation, provider adapter, metadata và cleanup/recovery; product/combo dùng chung đường upload, error handling và evidence nên không cộng 29 SP nguồn; vẫn giữ điểm lớn cho data-loss/security. |
| [BE-75](../tasks/BE-75.md) | Chuẩn hóa DTO metadata ảnh và loại credential, payload nhạy cảm khỏi response, log và bundle frontend | 3 | 3 | Whitelist metadata và rà exposure response/log/config/frontend theo canary; giữ coverage nhiều domain và owner riêng, không tính implementation adapter/cleanup hoặc coi ảnh demo là đã kiểm chứng secret. |
| [BE-76](../tasks/BE-76.md) | Triển khai đăng nhập Google qua Firebase, xác minh ID token, yêu cầu tài khoản mới hoàn tất mật khẩu và phát JWT Clucky | 13 | 8 | Firebase đảm nhiệm xác thực Google; Identity vẫn verify ID token, link user an toàn, pending-token/complete-password, phát JWT và migration; tính biên email trùng/uid/expiry, không tính lại email-password session BE-17. |
| [DEP-09](../tasks/DEP-09.md) | Tổng hợp Postman collection từ từng service, cấu hình gọi qua Gateway và bàn giao request mẫu cho luồng chính cùng trường hợp lỗi | 3 | 3 | Tổng hợp collection Gateway có fixture và positive/negative cases, kiểm đủ contract/handoff; không tính lại implementation domain hoặc toàn bộ regression như task TEST riêng. |
| [DEP-10](../tasks/DEP-10.md) | Chuẩn bị kịch bản demo, ảnh minh chứng và slide Sprint Review, phân biệt rõ chức năng đã nghiệm thu với phần còn hạn chế | 3 | 2 | Biên soạn kịch bản, ảnh và slide từ evidence owner đã bàn giao; chỉ tính công chuẩn bị/demo và ghi hạn chế, không tính lại tự test của tất cả domain hoặc thời gian chờ evidence. |
| [KAFKA-02](../tasks/KAFKA-02.md) | Phát sự kiện tạo, đổi trạng thái, hoàn tất và hủy đơn sau khi Order commit, giữ eventId và correlationId khi gửi lại | 5 | 5 | Nhiều event Order tại các điểm commit, envelope và cơ chế gửi bền vững dùng chung; giữ điểm cho transaction boundary/retry, không tính lại business handler hay consumer. |
| [KAFKA-03](../tasks/KAFKA-03.md) | Phát sự kiện xác nhận hoặc thất bại thanh toán và dữ liệu hết hạn, sai lệch, hoàn tiền theo contract cho các service nhận | 5 | 5 | Producer Payment cần mapping đúng trạng thái, durable publication và ID ổn định khi retry; giữ điểm vì event liên quan tiền, không cộng webhook/refund handler BE-30/32. |
| [KAFKA-05](../tasks/KAFKA-05.md) | Xử lý sự kiện order.created để tạo một shipment CREATED cho mỗi đơn, không tạo trùng khi Kafka gửi lại | 3 | 3 | Một consumer order.created tạo shipment CREATED có unique/idempotency và replay; không nhận giao vận Phase 2 hoặc tính lại fee API. |
| [KAFKA-06](../tasks/KAFKA-06.md) | Xử lý sự kiện order.completed để cộng điểm cho đúng khách, lưu biến động điểm và không cộng lại khi nhận sự kiện trùng | 5 | 5 | Consumer completed gọi ledger/earn, xử lý replay và trace theo đúng order/customer; giữ công tích hợp/idempotency, không tính lại API và quy tắc ledger do BE-37 sở hữu. |
| [KAFKA-07](../tasks/KAFKA-07.md) | Xử lý sự kiện Order và Payment để cập nhật thống kê từng quán theo ngày, không cộng doanh thu hai lần khi nhận lại sự kiện | 8 | 8 | Projection nhiều loại event, lệch thứ tự/replay và thống kê doanh thu đúng theo ngày/quán; giữ điểm cao cho đối chiếu/recovery, không tính lại report API/export. |
| [KAFKA-08](../tasks/KAFKA-08.md) | Triển khai retry, DLQ và xử lý sự kiện không lặp hiệu ứng cho Kafka consumer, hỗ trợ phát lại có kiểm soát khi khôi phục lỗi | 8 | 8 | Retry/DLQ/ack/replay là chính sách dùng chung nhưng có failure/recovery nhiều consumer; giữ điểm cho nguy cơ mất event, không cộng lại mọi nghiệp vụ domain được replay. |
| [KAFKA-09](../tasks/KAFKA-09.md) | Xử lý payment.failed để hủy đơn và giải phóng voucher, điểm đã giữ, bảo đảm các bước bù trừ không thực hiện trùng | 8 | 8 | Compensation payment.failed xuyên Order/Promotion cần state, retry và giải phóng voucher/điểm đúng một lần; giữ điểm vì phục hồi từng chặng khó, không tính lại cancel API. |
| [KAFKA-10](../tasks/KAFKA-10.md) | Phát sự kiện cho mọi thay đổi quản trị đã commit và ghi tập trung vào Audit Service, chống trùng và loại dữ liệu nhạy cảm | 5 | 8 | Tăng từ 5 lên 8 vì coverage producer mọi thao tác quản trị, durable commit, masking và consumer dedup trải nhiều domain; không chỉ dựng listener, đồng thời không tính lại domain CRUD hoặc API đọc Audit. |

## Áp dụng

- Backlog Sprint 2 và đầu từng task dùng SP mới trong bảng này; bảng gộp trước đó cập nhật cột SP kế hoạch nhưng giữ SP nguồn để truy vết. Snapshot 07/11 và trước gộp 08/11 không sửa ngược.
- Giờ công nguồn chưa được ước lượng lại: không dùng chúng như thời gian tương ứng với 247 SP. Không tự sửa deadline, trạng thái DONE hoặc công còn lại.
- Các checklist/metadata nguồn trong phần thu gọn là lịch sử. Estimate hiện hành đầu file ưu tiên; cần chốt thêm contract thì owner ghi rõ rủi ro và điều chỉnh có lý do.
- Chưa đồng bộ Lark. Không chạy test, lint, typecheck, build, browser hoặc hạ tầng; lần này chỉ biên soạn ước lượng.
