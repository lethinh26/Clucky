# Đề xuất sắp xếp lại backlog Clucky — ĐÃ DUYỆT

Ngày lập đề xuất: 29/10/2026. Người dùng đã duyệt và yêu cầu áp dụng lên Lark cùng task detail. Bản này giữ nội dung đề xuất để truy vết; lịch thực hiện và kết quả xem TASK-PLAN.md cùng manifest ngày 30/10/2026.

Nguồn: [SCRUM BOARD trên Lark](https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&view=vewfbS1kNZ), SRS/API/kiến trúc/RBAC/database trong `architechture/docs/`, `architechture/database/schema.sql`, task detail và các file migration hiện có.

## 1. Hiện trạng đã đọc trực tiếp

| Sprint hiện tại | Khoảng ngày task | Số task | DONE |
|---|---|---:|---:|
| Sprint 1 | 26–28/10 | 49 | 37 |
| Sprint 2 | 29/10–02/11 | 131 | 0 |
| Sprint 3 | 03–04/11 | 52 | 0 |

Tổng 232 record, 54 record có nhiều PIC. Trạng thái DONE là trạng thái trên Lark, chưa phải xác nhận lại chất lượng mã nguồn.

| Người | Task riêng Sprint 2 cũ | Task chung Sprint 2 cũ | Tổng lượt được giao |
|---|---:|---:|---:|
| Trần Nguyễn Hữu Khánh | 11 | 7 | 18 |
| Nguyễn Duy Quang Nhật | 11 | 9 | 20 |
| Trần Đức Anh | 13 | 14 | 27 |
| Lê Phú Thịnh | 27 | 11 | 38 |
| Cao Tất Thành | 28 | 13 | 41 |
| Mai Sơn Việt | 17 | 3 | 20 |

Các lượt giao chung không phải task độc lập; không cộng cột cuối để suy ra số task. Task tích hợp, test và hardening đang chồng lấn nhiều với task triển khai. TASK-PLAN.md còn ghi 212 task, README task ghi 227, trong khi Lark hiện có 232: dùng Lark làm danh sách record để sửa, không đồng bộ đè từ số liệu cũ.

## 2. Quy tắc lịch đã được người dùng chọn

- Sprint 1: **26/10/2026–01/11/2026**, đủ 7 ngày.
- Sprint 2: **02/11/2026–08/11/2026**, đủ 7 ngày.
- Deadline từng task: **23:59 ngày đến hạn, Asia/Ho_Chi_Minh (UTC+7)**. Bỏ giờ 15:30; không tự đổi sang 23:59 UTC. 23:30 đang có ở UI-01 cũng chuẩn hóa thành 23:59 nếu cập nhật trường deadline.
- Giữ 37 trạng thái DONE; không sửa ngày hoàn thành thực tế, không đưa các task đó trở lại TO DO. Task còn lại không đặt deadline mới về ngày đã qua.
- Chỉ lập kế hoạch hai sprint này. Task chưa cam kết để Sprint trống trong BACKLOG; không gom toàn bộ Sprint 3 vào Sprint 2.
- Chưa biết số giờ làm mỗi ngày. Lịch dưới đây là đề xuất thứ tự và phạm vi, chưa phải cam kết năng lực theo giờ hoặc cam kết hoàn thành toàn dự án ngày 08/11.
- Mỗi record đúng một PIC. Người phối hợp được thể hiện bằng dependency/ghi chú, không thêm vào PIC. Task tích hợp do một người chịu trách nhiệm kết nối; phần producer/consumer của service khác vẫn nằm trong task service tương ứng.

## 3. Flyway và database

**Bỏ yêu cầu viết lại Flyway V1 tạo schema nghiệp vụ ở BE-01…BE-08. Không xóa phần entity/repository và cấu hình kết nối.** Đổi tên thành “Ánh xạ entity/repository vào schema hiện có — <service>”.

Lý do đã đối chiếu bằng cách đọc file:

- `architechture/database/schema.sql` đã có bảng nghiệp vụ của 8 service.
- Cả 8 file `src/main/resources/db/migration/V1__init.sql` chỉ có bảng mẫu `service_bootstrap`.
- SQL dùng các schema như `identity_service`, `catalog_service`; tài liệu thiết kế gọi `identity_db`, `catalog_db`. Cần xác nhận và cấu hình theo database thực tế; không mặc định tên trong tài liệu trùng runtime.
- Có schema.sql không chứng minh database đang chạy đã import đúng. Việc kiểm tra entity/schema nằm trong tiêu chí nghiệm thu của từng task, không tạo thêm 8 task “viết V1”.
- BE-56 nhập vào BE-07: dùng `email_logs`, `mail_templates` hiện có; bỏ yêu cầu tạo thêm `mail_deliveries` khi tài liệu/database chưa yêu cầu.
- BE-69: bỏ task tạo lại `image_public_id/avatar_public_id` vì schema.sql đã có các cột tương ứng. Đối chiếu database thực tế là checklist của BE-01/BE-02/BE-05; chỉ thêm migration nếu thật sự thiếu.
- BE-76 vẫn giữ thay đổi Google login: SQL hiện tại thiếu `firebase_uid`, `password_hash` vẫn NOT NULL trong khi tài liệu mô tả nullable. Đây là thay đổi schema có căn cứ, không phải tạo lại V1.
- Không đề xuất tắt Flyway hay sửa migration đã áp dụng. Migration mới chỉ dành cho chênh lệch thực sự sau baseline hiện có. Chưa truy cập database chạy thật trong lần lập kế hoạch này.

## 4. Sprint 1 — hoàn tất UI và chuẩn bị backend

37 task DONE giữ nguyên. UI còn TO DO được hoàn tất/chuẩn hóa trong 29/10–01/11. Đưa phần nền tảng đang dồn đầu Sprint 2 cũ vào các ngày còn lại Sprint 1.

| PIC | Phạm vi ngoài các task DONE | Mốc đến hạn đề xuất |
|---|---|---|
| Khánh | BE-01 entity Identity; BE-09 security/JWT/RBAC template; UI-34 sau gộp checklist UI chung | Entity 30/10; security 31/10; UI chung 01/11 |
| Nhật | BE-02 entity Catalog; BE-20 API menu công khai; BE-68 cấu hình Cloudinary | Entity/config 30/10; menu 01/11 |
| Đức Anh | BE-03 entity Order; BE-23 Cart Redis CRUD | Entity 30/10; cart 01/11 |
| Thịnh | BE-04 và BE-06 entity Payment/Shipping; BE-10 + BE-14 chuẩn response/error; BE-13 OpenAPI; BE-15 correlation/health; BE-50 payment contract | Entity/response 30/10; contract/OpenAPI 31/10; correlation 01/11 |
| Thành | UI-45, UI-22, UI-28, UI-32, UI-48 còn TO DO; BE-05 và BE-07 entity Promotion/Notification (gồm BE-56); BE-51 voucher contract; BE-57 cấu hình mail + BE-59 email message contract | UI 29–31/10; entity/mail config/contract 01/11 |
| Việt | BE-08 entity Review/Report; BE-11 Kafka config; BE-12 Redis config; BE-52 notification DTO/pagination contract | Kafka/Redis 30/10; entity/contract 31/10 |

Các mốc trên đều kết thúc 23:59. UI-34 gồm kiểm tra chung và tổng hợp lỗi; sửa lỗi domain thuộc task của owner domain, không để một người gánh việc triển khai lại mọi màn hình. UI-46/UI-47 đã DONE giữ nguyên; UI-48 của Thành tiếp tục hoàn thành.

Đầu ra Sprint 1: UI còn thiếu được hoàn tất; entity trỏ đúng schema; có nền tảng security/response/Kafka/Redis và contract cần thiết. Menu công khai và giỏ là hai luồng API ưu tiên. Chưa coi mock UI hoặc DTO là luồng nghiệp vụ end-to-end đã hoàn thành.

Rủi ro tải: Thành còn 5 task UI, Thịnh còn nhiều phần nền tảng. Ưu tiên contract trước phần trang trí; nếu không kịp mốc, ghi rõ carry-over chứ không tự đánh DONE hay tự tăng PIC.

## 5. Sprint 2 — chức năng và tích hợp theo domain

| PIC | Nhóm chức năng giữ lại | ID chính để đối chiếu |
|---|---|---|
| Khánh | Auth email/OTP/login/refresh/reset; hồ sơ/địa chỉ; quản trị tài khoản/ca; security qua Gateway và kiểm tra phạm vi dữ liệu | BE-16…19, BE-53; INT-05/53/55/61/67/69 |
| Nhật | Quản trị catalog/store/inventory; trạng thái bán/cache; Cloudinary cho sản phẩm/combo; nối UI và API | BE-21/22/54/70/71/72/74; INT-01/04/06/15/54/72/73 |
| Đức Anh | Preview/checkout/tạo đơn; trạng thái/hủy/hoàn tiền; lịch sử/đặt lại; Kafka Order; tích hợp voucher/catalog/payment/shipping; polling đơn | BE-24…27/55; INT-07/08/14/35…39/47/56/68 |
| Thịnh | VietQR + SePay thật; COD/manual/mismatch/refund; query payment có ownership; tính phí và shipment CREATED; Google login Firebase | BE-29/30/32/33/44/45/46/48/49/75/76; INT-09/37/38/40/43/49/50/51/52/63…66/74 |
| Thành | Voucher/loyalty; Notification in-app; Gmail transactional, template, retry và chống gửi trùng; nối UI | BE-34/37/38/39/58/60/61/62/64/65/66; INT-10/11/41/42/44/58/59/62 theo phần còn giữ |
| Việt | Review/report/dashboard/export/audit; email-log API, lỗi/DLQ/correlation; tích hợp báo cáo và tài liệu local | BE-40…43/63/67; INT-12/13/45/46/48/60 |

Một ID xuất hiện ở cột phụ thuộc domain khác không tạo thêm task hoặc PIC. Owner cuối cùng theo bảng mục 8; các record một PIC vốn có giữ người phụ trách hiện tại.

Trình tự thời gian dự kiến:

| Ngày | Công việc | Điều kiện phụ thuộc |
|---|---|---|
| 02–03/11 | Auth và SMTP OTP; CRUD; tính giá/voucher/phí; payment initiation; consumer cơ bản | Nền tảng/contract Sprint 1 |
| 04–05/11 | Nối checkout, SePay/COD, trạng thái đơn, notification, loyalty/report; Cloudinary; Google login | API và producer/consumer tương ứng đã có |
| 06/11 | Hoàn thiện hủy/hoàn tiền, quyền theo quán/chủ sở hữu, các màn quản trị và tích hợp còn lại | Luồng chính đã nối |
| 07–08/11 | Nhóm tự kiểm thử luồng chính và lỗi, sửa lỗi, cập nhật bằng chứng/tài liệu | Không xếp thêm chức năng mới vào hai ngày dự phòng này |

Mỗi task có phạm vi riêng và deadline 23:59 ngày kết thúc của nó; không đặt cùng 15:30 cho mọi task. Khi ghi lên Lark, xếp producer trước consumer/integration; ngày bắt đầu task không đồng nghĩa thời gian làm đủ 7,5 giờ.

Không giảm các điều kiện: ownership/storeId, refresh/OTP an toàn, SePay signature và idempotency, bảo vệ giao dịch khỏi lỗi email, consumer idempotent, mã lỗi theo docs. Shipping MVP chỉ tính phí/lưu CREATED; không thêm giao hàng thực tế.

## 6. Giảm nhẹ phạm vi — 1–2 đầu việc/người

Đề xuất chuyển về BACKLOG, chưa gán sprint. Đây là giảm phạm vi tạm thời cần duyệt, khác với gộp record trùng. Không xóa khỏi yêu cầu sản phẩm.

| PIC | Đầu việc chuyển sau | Các phần phụ thuộc phải chuyển cùng |
|---|---|---|
| Khánh | 1. Upload/thay avatar — INT-03 và phần avatar BE-73 | Phần UI upload avatar trong INT-72; profile/address vẫn giữ |
| Nhật | 1. Đo/tối ưu mục tiêu menu <500ms — TEST-13 | Cache/correctness BE-54 vẫn giữ; chưa tuyên bố đạt NFR hiệu năng |
| Đức Anh | 1. Đặt tiệc — BE-28; 2. UI trạng thái gửi email trên đơn — INT-70 | UI-23 đã DONE vẫn giữ lịch sử; backend party chưa hoàn thành. Email transactional và tracking/polling đơn vẫn giữ |
| Thịnh | 1. Webhook Casso — BE-31; 2. Lịch sử giao hàng mở rộng — phần BE-47 ngoài MVP | SePay thật giữ nguyên. Chi tiết shipment CREATED gộp BE-33, không bỏ thông tin giao hàng MVP |
| Thành | 1. Đề xuất/duyệt voucher chi nhánh — BE-35; 2. Quản trị banner — BE-36 | Dời INT-41/58 gắn sự kiện promotion.approved; banner BE-73 + INT-02; phần banner/approve của INT-62/73 và TEST-06. Voucher thường/loyalty vẫn giữ; banner công khai có thể dùng dữ liệu sẵn có |
| Việt | 1. Load test 50 đơn đồng thời — TEST-14; 2. Màn tra cứu/retry email quản trị — INT-71 | Email-log API BE-63, log lỗi/retry nền vẫn giữ; chưa tuyên bố đạt NFR tải |

Tổng **10 đầu việc** (1+1+2+2+2+2), không phải chỉ 10 record vì một chức năng có các task tích hợp đi kèm. Đề xuất dời BE-35 ảnh hưởng cả khả năng Admin duyệt voucher chi nhánh; cần được duyệt rõ, không mặc định chức năng đó đã đủ theo SRS.

## 7. Gộp phần trùng mà giữ nội dung cần làm

- BE-10 giữ task response/error, nhập BE-14 vào checklist.
- BE-07 nhận BE-56; BE-69 bỏ record trùng như mục 3.
- BE-39 giữ task Notification consumer/email, nhập INT-42 và INT-59; BE-62 cung cấp persistence/idempotency, BE-66 cung cấp retry, không triển khai ba lần một cơ chế gửi mail.
- BE-70 giữ Cloudinary adapter, nhập INT-01; BE-71 là validation contract riêng. BE-74 giữ cleanup/failure, nhập INT-04.
- BE-24 giữ preview/checkout integration, nhập INT-35 và INT-38. BE-25 giữ tạo đơn/kiểm tra giá/khởi tạo payment, nhập INT-36 và INT-37.
- BE-53 nhập tiêu chí vào BE-16/17; BE-55 nhập validation/locking vào BE-25. Không bỏ nội dung hardening.
- INT-56 nhập contract event vào INT-39. INT-57 nhập vào INT-40. INT-55 nhập vào BE-16.
- Các test trùng một luồng được gom checklist trong task tích hợp: INT-49 nhận TEST-08/09; INT-50 nhận TEST-10; INT-52 nhận INT-66 + TEST-03/11; INT-74 nhận TEST-29; BE-60 nhận TEST-19; BE-66 nhận TEST-20; INT-59 (đã nhập BE-39) nhận TEST-21; BE-74 nhận TEST-27; BE-75 nhận TEST-28.
- TEST-15 bỏ record giao cả nhóm, chuyển test critical path vào tiêu chí hoàn thành task của đúng owner. TEST-18 bỏ record “cả nhóm sửa mọi bug”; lỗi cụ thể được ghi nhận với đúng một PIC và được sửa trong quỹ ngày 07–08/11.
- Các task smoke/runbook domain DEP-13…17 có thể nhập checklist vào task tích hợp tương ứng của Khánh/Nhật/Đức Anh/Thịnh/Thành; không đánh DONE thay cho chưa kiểm chứng.
- DEP-18/19 nhập checklist cấu hình mail BE-57; DEP-21 nhập BE-68; DEP-23 nhập BE-76. Giữ nguyên yêu cầu secret/env, không cần thêm task giấy tờ trùng.

Gộp record giúp rõ người chịu trách nhiệm và tránh lặp việc. **Không tính số record giảm sau gộp là phần trăm giảm khối lượng.** Không gộp cả domain thành một task khổng lồ; nhiệm vụ quá lớn phải giữ các đầu ra riêng.

## 8. Cách xử lý đủ 54 record đang có nhiều PIC

“Giữ” bên dưới là giữ/gom phạm vi thành một record với một PIC. “Nhập” nghĩa là chuyển đủ mô tả/tiêu chí/link vào record đích rồi bỏ record nguồn trùng. Không xóa trước khi bảo toàn nội dung.

| Record hiện tại | Xử lý | PIC duy nhất sau chỉnh |
|---|---|---|
| UI-19 | Giữ DONE | Đức Anh |
| UI-40 | Giữ DONE | Việt |
| UI-34 | Giữ làm checklist UI chung | Khánh |
| UI-33, UI-35, UI-36, UI-37, UI-38, UI-42 | Nhập UI-34; domain fix vẫn ở task domain | Khánh |
| BE-68 | Giữ cấu hình Cloudinary | Nhật |
| BE-69 | Bỏ task tạo metadata trùng; checklist entity từng domain | Không còn record riêng |
| BE-73 | Đưa phần avatar vào INT-03/Khánh; phần banner vào BE-36/Thành, cùng ở backlog | Mỗi record đích một người |
| BE-74 | Giữ cleanup/failure Cloudinary | Nhật |
| INT-04 | Nhập BE-74 | Nhật |
| INT-35, INT-38 | Nhập BE-24 | Đức Anh |
| INT-36, INT-37 | Nhập BE-25 | Đức Anh |
| INT-47 | Giữ điều phối compensation/order; phụ thuộc payment event và API release promotion | Đức Anh |
| INT-50 | Giữ luồng timeout/expiry | Thịnh |
| INT-51 | Giữ COD integration | Thịnh |
| INT-52 | Giữ refund integration | Thịnh |
| INT-53 | Giữ Identity–Gateway security | Khánh |
| INT-54 | Giữ Catalog–Gateway | Nhật |
| INT-55 | Nhập BE-16 | Khánh |
| INT-56 | Nhập INT-39 | Đức Anh |
| INT-57 | Nhập INT-40 | Thịnh |
| INT-66 | Nhập INT-52 | Thịnh |
| INT-67 | Giữ audit RBAC/ownership xuyên API; triển khai enforcement thuộc task service | Khánh |
| INT-70 | Backlog chưa gán sprint | Đức Anh |
| INT-72 | Giữ component upload/preview chung, demo sản phẩm; các điểm gắn UI theo task domain | Nhật |
| INT-73 | Giữ kết nối quản trị product/combo; phần banner nhập BE-36 và dời cùng | Nhật |
| INT-74 | Giữ Google E2E | Thịnh |
| TEST-01 | Giữ nghiệm thu Guest→auth→menu→cart→COD | Đức Anh |
| TEST-02 | Nhập INT-09, giữ tiêu chí payment PAID và order CONFIRMED | Thịnh |
| TEST-03, TEST-11 | Nhập INT-52 | Thịnh |
| TEST-04 | Nhập INT-14, giữ login/đơn/COD branch flow | Đức Anh |
| TEST-05 | Giữ Manager flow; phụ thuộc staff API và report | Việt |
| TEST-06 | Giữ store/product/voucher flow; approve chuyển theo BE-35 | Nhật |
| TEST-10 | Nhập INT-50 | Thịnh |
| TEST-15 | Bỏ record cả nhóm; nhập checklist test vào task chức năng | Owner từng task đích |
| TEST-17 | Giữ kiểm tra responsive sau tích hợp (khác UI mock Sprint 1) | Nhật |
| TEST-18 | Bỏ record chung; bug cụ thể một PIC, chưa tạo bug không tồn tại | Owner domain phát sinh |
| TEST-19 | Nhập BE-60 | Thành |
| TEST-20 | Nhập BE-66 | Thành |
| TEST-22 | Giữ nghiệm thu email transactional còn trong scope | Thành |
| TEST-23 | Giữ xác minh lỗi email không rollback order/payment | Thành |
| TEST-27 | Nhập BE-74 | Nhật |
| TEST-28 | Nhập BE-75 | Thịnh |
| DEP-06 | Giữ smoke VPS trong backlog release | Việt |
| DEP-09 | Giữ tổng hợp API collection, Sprint 2 | Việt |
| DEP-10 | Giữ script/demo/slides, Sprint 2 | Khánh |
| DEP-11 | Giữ review/release trong backlog, chưa thực hiện publish/tag/push | Việt |

## 9. Xử lý Sprint 3 cũ và các record còn lại

- Các TEST liên quan chức năng giữ lại chuyển sang Sprint 2 (07–08/11), hoặc nhập checklist theo mục 7–8. TEST-13/14 về backlog theo phạm vi đã dời.
- DEP-01…08, DEP-11/12, DEP-20/22 để BACKLOG chưa gán sprint: triển khai VPS, domain/HTTPS, backup, smoke production, handover/release. Đây là **12 record vận hành chưa cam kết vào hai tuần**, được nêu riêng ngoài 10 đầu việc giảm nhẹ ở mục 6. Đồ án vẫn còn các việc này sau hai sprint; không tuyên bố “xong toàn bộ” ngày 08/11.
- DEP-09/10 ở Sprint 2. DEP-13…19/21/23 gộp vào task domain/config theo mục 7.
- Các BE/INT một PIC không được chỉ định chuyển Sprint 1, gộp hoặc đưa backlog thì giữ PIC hiện tại và vào Sprint 2; giữ các task có đầu ra độc lập.
- UI giữ Sprint 1, trừ record gộp; cập nhật deadline còn TO DO về ngày phù hợp 29/10–01/11. Không chỉnh lại ngày bắt đầu/hoàn tất thực tế của việc DONE.
- Bỏ view Sprint 3 khỏi phần kế hoạch sau khi record đã được phân về hai sprint hoặc backlog; không xóa task chỉ vì view bị bỏ. Nếu xóa option Sprint 3 cần bảo đảm không còn record tham chiếu.

## 10. Các bước áp dụng sau khi duyệt

1. Chụp lại/export dữ liệu hiện tại, giữ ID/link/mô tả/trạng thái để truy vết.
2. Giữ record DONE và người phụ trách chính; không tạo bản sao để tăng số lượng task.
3. Đổi scope BE-01…08, gộp các record trùng và đổi PIC theo bảng; không làm mất tiêu chí nghiệm thu khi bỏ record nguồn.
4. Sửa Sprint, ngày đến hạn và giờ 23:59; lập dependency theo luồng API→integration→verification.
5. Kiểm tra lại số record, không còn PIC rỗng/nhiều người; record backlog được phân người nhưng chưa gán sprint; không deadline ngoài sprint đối với task đang cam kết.
6. Cập nhật nội dung mô tả và liên kết task detail trên Lark; nếu duyệt đồng bộ repo thì cập nhật TASK-PLAN.md/task detail để không tiếp tục dùng lịch 10 ngày cũ.
7. Báo cáo số lượng trước/sau riêng cho: gộp trùng, chuyển backlog, thay PIC, đổi deadline; xác nhận DONE không bị reset.

Kế hoạch đã được duyệt. Người dùng cung cấp bot Lark để áp dụng qua API; không cần đăng nhập trình duyệt. Thông tin xác thực không lưu trong repo.

## 11. Kiểm chứng của lần lập kế hoạch

Đã đọc đủ 232 record bằng thao tác copy bảng Lark và đối chiếu tài liệu/file trong repo. Chưa chạy test/lint/typecheck/build, chưa kiểm thử ứng dụng qua trình duyệt, chưa bật Docker/backend và chưa truy cập database chạy thật, theo yêu cầu repository. Việc đọc Lark là khảo sát backlog, không phải kiểm thử frontend Clucky.
