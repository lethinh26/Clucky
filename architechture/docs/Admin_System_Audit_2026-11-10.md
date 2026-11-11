# Admin toàn hệ thống — Báo cáo rà soát 10/11/2026

## 1. Kết luận và phương pháp

**Admin có nhiều luồng thật nhưng chưa hoàn tất toàn hệ thống. Không cần dựng lại toàn bộ giao diện: ưu tiên lỗi quyền/hoàn tiền, phân trang và tích hợp thanh toán, rồi bổ sung các màn còn thiếu.**

- Snapshot: `main`, commit `a3c6e3e6825c359e0205224d26ca0c0639f09cc5`.
- Ba subagent chỉ đọc: backend/phân quyền; frontend/tích hợp; inventory task/spec. Agent tổng hợp đọc lại các blocker và kiểm tra các feature flag không nhạy cảm của container.
- Không sửa code/cấu hình ứng dụng, không thay task/PIC/SP/Lark, không khôi phục tài liệu đã xóa. Chỉ tạo báo cáo này, chưa commit.
- Không chạy test, lint, typecheck, request kiểm thử hoặc browser. Build/18 container healthy ở lượt trước không chứng minh nghiệp vụ đã nghiệm thu.

Backlog có **124 task: 37 DONE, 87 TO DO**. Toàn bộ 53 BE, 12 KAFKA, 14 DEP vẫn TO DO; UI có 37 DONE và 8 TO DO. Đây là nhãn tài liệu, không phải trạng thái code. Task README cũng nói DONE cũ không chứng minh acceptance mới đạt.

Nguồn: `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/architechture/tasks/README.md:7`; `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/architechture/docs/backlog.md:15`.

**Quy ước:** “Có luồng chính” = đã có route/handler/API tương ứng, chưa đồng nghĩa nghiệm thu; “Một phần” = thiếu code/UI/pipeline/acceptance; “Chưa có” = chưa có đường triển khai cho chức năng nêu rõ; “Hoãn” = chủ động chưa mở. Không tự tính phần trăm hoặc đổi DONE.

## 2. Ranh giới nghiệp vụ

Admin toàn chuỗi vẫn chịu điều kiện trạng thái đơn và bằng chứng thanh toán. Không tạo/promote Admin trong ứng dụng, không cho Admin checkout Customer để giả làm đơn quầy.

Replan đã chốt **mỗi quán một Manager + một tài khoản Staff dùng chung**, không nhân viên cá nhân/xếp ca/check-in. BE-19/UI-15, BE-22, BE-42 còn AC cũ cần đồng bộ; không triển khai hai mô hình mâu thuẫn.

Handoff F1–F4 ngày 08/11 từng ghi Dashboard/Reports/Reviews/Payments/Users bị khóa, nhưng router hiện mount các màn thật. Không lấy kết luận lịch sử đó làm hiện trạng. Notification và proposal/banner mới là các UI vẫn khóa.

Nguồn: `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/architechture/docs/Ma trận phân quyền.md:4`; `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/architechture/plans/RBAC_Branch_Operations_Replan_2026-11-08.md:280`; `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/frontend/react/src/App.tsx:109`.

## 3. Bảng task trực tiếp: đã làm gì, còn thiếu gì

Nhãn backlog giữ nguyên: **D = DONE, T = TO DO**. A–F là spec/mốc, không phải task mới đã tạo.

| Năng lực | Task/backlog | Đã có trong code | Chưa xong / kết luận |
| --- | --- | --- | --- |
| Đăng nhập, role/store/owner | BE-09/17 **T**; UI-02/09 **D**; F1/F2 | Session/JWT, Gateway, layout/route guard, backend checks | Có nền chính; chưa đóng BE-09 vì refund và Users legacy còn lệch policy |
| Tài khoản chi nhánh | BE-19 **T**; UI-15 **D**; A1–A3 | Cặp Manager/Staff, readiness, retry, activation/recovery, lock, migration inventory/report | Một phần: legacy bypass, email tắt, migration cần backup/mapping; AC xếp ca cũ cần thay phạm vi |
| Món/category/combo/options/topping | BE-21 **T**; UI-25 **D** | Backend CRUD; UI món thật, combo tạo/ảnh/bật-tắt/xóa | Thiếu category CRUD UI, edit combo hiện hữu; combo quantity cố định 1/item; Product/Combo thiếu version/audit |
| Chi nhánh | BE-21 **T**; UI-26 **D**; A1/B4 | Tạo/sửa, provisioning, recovery email, giờ/trạng thái, vị trí/radius | UI chưa có xóa; gán Manager legacy disabled không đồng nghĩa thiếu provisioning; một số mutation thiếu expected-version/audit |
| Kho theo quán | BE-22 **T**; UI-31 **D**; B4 | Lượng/ngưỡng/hết món; Staff không kiểm kê/đổi giá; không bán tồn 0 | Có luồng chính; DTO thiếu expected-version/idempotency stale form; cảnh báo chưa có durable retry |
| Ảnh catalog | BE-68/72/75 **T**; UI-25 **D** | Cloudinary adapter, upload/metadata, giới hạn file, cleanup sau commit | Runtime tắt; MIME client chưa đủ xác minh file; orphan/replace/concurrency thiếu; DELETE bỏ qua kết quả và reference |
| Đơn toàn chuỗi | BE-26/27 **T**; UI-24/30 **D**; B1/B3 | List/detail, chuyển trạng thái, hủy/reject có lý do, history/outbox | UI chỉ tải 20 đơn/20 refund đầu; filter/count thiếu; COD disabled; cancel chưa tự tạo refund như AC |
| Ngân hàng/thu tiền/đối soát | BE-29/30/32/50 **T**; UI-27 **D**; C1–C4 | Backend bank/receipt/collection/reconcile/assign, version/idempotency; UI bank/receipt/assign thật | UI chưa nối collection/reconcile/legacy/conflict đầy đủ; chưa nghiệm thu feed/saga; URL cũ không phải API mới |
| Hoàn tiền | BE-26/32 **T**; UI-24 **D**; D1–D3 | Approve/reject, claim, bank-details, attempt, evidence, confirm-refund | **Chưa an toàn/hoàn chỉnh:** role allowlist, evidence giả, live-payment 501, reservation/recovery/recipient thiếu |
| Voucher thường | BE-34 **T**; UI-28 **T** | CRUD, ALL/STORE, thời hạn, min-order, discount/cap; UI thật | Chưa có reserve/consume/release usage thực; quota cạnh tranh/store reference/audit thiếu; proposal mở lệch kế hoạch |
| Chính sách điểm/hạng | BE-37/KAFKA-06 **T**; UI-28/45 **T** dùng chung | Policy rate/ngưỡng/discount, validation/version; ledger/reserve/settlement có mã | Có luồng cấu hình chính; còn audit và nghiệm thu Order–Promotion; không tự thêm cộng/trừ điểm Customer tùy ý |
| Dashboard/report/export | BE-42/KAFKA-07 **T**; UI-14/29 **D** | API thật, Admin chuỗi/quán/kỳ, XLSX/PDF, backend scope | Projection runtime tắt; refund/policy thiếu; UI có stale data; KPI bếp từ 20 đơn đầu |
| Moderation đánh giá | BE-40 **T**; UI-16 **D**; E1 | Filter/page/summary, reply/hide, Admin soft-delete, version/idempotency | Có luồng chính; audit mới ghi intent, chưa dispatch/consume; chưa nghiệm thu visibility/đa quán |
| Phí ship/radius/shipment MVP | BE-33/KAFKA-05 **T**; UI-26/44 **D** | Admin phí chuỗi có version; radius; shipment CREATED idempotent, owner/store | Có luồng chính MVP; còn audit config/nghiệm thu; không bao gồm Phase 2 |
| Notification Admin | BE-38/52/KAFKA-12 **T**; UI-32/45 **T** | Backend inbox/read/read-all và consumer | Chuông còn UnavailableFeature; thiếu fan-out đầy đủ đơn mới tới Admin mọi quán/nhân sự |
| Email và email operations | BE-57/59/60/62/63 **T**; UI-50 **T** | Queue/claim/retry/failure, sender, branch-mail consumer | SMTP tắt; chưa có runtime API email-log Admin, UI log/detail/retry; retry cần contract/policy |
| Audit toàn chuỗi | BE-43/KAFKA-10 **T**; E1 | Service/schema riêng, filter/page API; UI audit nhúng từng quán | Thiếu producer/dispatcher nhiều domain; Review bị consumer bỏ; UI chưa all-store/actor/action/time đầy đủ |
| Customer management | FR-ADM-10; chưa có task chính riêng đủ phạm vi | Backend Users list/lock/unlock Customer | Chưa có màn Customer được route; chưa có lịch sử đơn lọc Customer cho Admin; UI-15 không thay thế |
| Settings tổng quát | FR-ADM-13; chưa có task chính riêng đủ phạm vi | Ngân hàng/loyalty/phí ship có ở màn riêng | Liên hệ hệ thống/phương thức thanh toán/feature toggle chưa có scope triển khai đủ; không nhất thiết gom vào một màn |

## 4. Blocker quan trọng đã kiểm tra chéo

### 4.1. Refund: quyền, evidence và luồng thanh toán mới

**Quyền:** create/get detail/update bank details kiểm một số nhánh Customer/Manager và chặn Staff, nhưng với đơn có Customer không deny các role còn lại như SHIPPER nếu có JWT hợp lệ. Controller không có allowlist bù lại. Cần allowlist tường minh rồi owner/store/state cho mọi action. Đây là kết luận tĩnh, chưa thực hiện request khai thác.

**Evidence giả:** Cloudinary tắt thì upload không lưu bytes, vẫn trả `local-evidence-*`; xem ảnh trả SVG placeholder. Confirm chỉ đòi publicId không rỗng trước khi xác nhận Payment/đổi REFUNDED. Order container hiện có `CLOUDINARY_ENABLED=false`. Cần fail-closed khi không lưu được file thật và evidence gắn đúng attempt. Khi provider bật, biến expiresAt hiện chưa được gắn URL dù response khai TTL 600 giây; cần triển khai delivery có hạn thật.

**Luồng mới:** create trả 501 nếu có paymentExpiresAt hoặc collectionMethod. Modal có đủ nút không chứng minh refund dùng được với payment mới. Cần eligibility theo ledger C3, idempotency đa instance, reservation/recovery Order–Payment và email recipient. Không gộp chi trả dư/đơn hết hạn đang hoãn vào refund cơ bản.

Nguồn:
- `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/backend/cart-order-service/src/main/java/com/clucky/cartorderservice/service/RefundRequestService.java:76`
- `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/backend/cart-order-service/src/main/java/com/clucky/cartorderservice/service/RefundRequestService.java:97`
- `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/backend/cart-order-service/src/main/java/com/clucky/cartorderservice/service/RefundRequestService.java:449`
- `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/backend/cart-order-service/src/main/java/com/clucky/cartorderservice/media/RefundEvidenceService.java:64`
- `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/backend/cart-order-service/src/main/java/com/clucky/cartorderservice/service/RefundRequestService.java:575`
- `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/backend/payment-service/src/main/java/com/clucky/paymentservice/service/PaymentRefundService.java:45`

### 4.2. Users legacy: đổi quán không revoke, mở lại account retired

assignStore ghi thẳng storeId: không xác minh quán, không revoke session, không phối hợp cặp account và không audit. Token đang sống vẫn mang scope cũ. Unlock không kiểm current/retired account; cần ngăn mở lại tài khoản đã loại khỏi cặp hiện hành. Ẩn UsersPage cũ không khóa API.

Cần thống nhất policy AdminUserService/BranchAccountService, validation/revocation/audit và conflict. Không mở lại tạo Staff tùy ý/xếp ca trái replan.

Nguồn: `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/backend/identity-service/src/main/java/com/clucky/identityservice/service/AdminUserService.java:71`; `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/backend/identity-service/src/main/java/com/clucky/identityservice/service/AuthService.java:126`.

### 4.3. Order/Refund UI: chỉ trang đầu, thu COD vẫn disabled

OrderContext gọi list không page/size; backend mặc định 20; adapter bỏ total/page metadata. Filter/count/tab và lựa chọn quán suy từ tập này không bao phủ toàn chuỗi. KPI bếp cũng lấy tập thiếu đó.

Cần giữ PageResponse, gửi filter/page về backend, lấy quán từ Catalog; không tải tất cả vô hạn. Nối collection/reconcile/legacy/conflict vào UI hiện hữu. Phân biệt khoản khai thu, ngân hàng xác minh, Order chấp nhận thu và Order hoàn thành; PENDING không phải thu thành công. Backend mới dùng `/api/payments/{orderId}/operations/*`, không phải confirm-manual/confirm-cod cũ.

Nguồn: `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/frontend/react/src/context/OrderContext.tsx:140`; `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/frontend/react/src/lib/api.ts:243`; `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/frontend/react/src/pages/Orders/components/OrderDetailDrawer.tsx:266`; `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/backend/payment-service/src/main/java/com/clucky/paymentservice/controller/PaymentOperationsController.java:19`.

### 4.4. Catalog/quán/media: thiếu action UI và bảo toàn dữ liệu

Cần CRUD category, edit combo và quantity/options phù hợp contract. Stores chưa có nút xóa dù adapter có delete. Không mở lại gán Manager legacy trước khi khớp cặp account mới.

Product/Combo thiếu version chống stale write; Inventory có version entity nhưng DTO chưa mang expected-version. Cảnh báo low-stock có publish sau commit nhưng chưa durable recovery khi broker/lookup lỗi. Media cần kiểm nội dung file, reference tài nguyên và cleanup; deleteMedia hiện trả 204 dù adapter báo xóa không thành công.

Nguồn: `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/frontend/react/src/pages/Catalog/index.tsx:469`; `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/frontend/react/src/lib/api.ts:507`; `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/frontend/react/src/pages/Stores/index.tsx:484`; `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/backend/catalog-store-service/src/main/java/com/clucky/catalogstoreservice/controller/MediaController.java:18`; `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/backend/catalog-store-service/src/main/java/com/clucky/catalogstoreservice/service/LowStockAlertPublisher.java:35`.

### 4.5. Voucher: CRUD có, quota chưa xong; proposal mở lệch scope

VoucherUsage có entity/repository nhưng chưa có flow reserve/consume/release lượt dùng thực. usedCount được đọc/khởi tạo, chưa có cập nhật tiêu lượt tương ứng. Cần contract với Order, chống tranh lượt cuối, release/replay idempotent và xác minh quán tồn tại. Ledger điểm Loyalty không thay ledger lượt voucher.

UI proposal khóa nhưng store-proposals vẫn cho Manager tạo, approve vẫn hoạt động; approval chưa phát promotion.approved. Cần khóa API theo scope hiện hành hoặc xin đổi phạm vi rõ ràng; UI khóa không có nghĩa backend khóa.

Nguồn: `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/backend/promotion-loyalty-service/src/main/java/com/clucky/promotionloyaltyservice/service/VoucherService.java:207`; `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/backend/promotion-loyalty-service/src/main/java/com/clucky/promotionloyaltyservice/controller/VoucherController.java:124`.

### 4.6. Reports: pipeline tắt, UI có thể hiển thị số cũ

Container có REPORT_REVENUE_EVENT=false. Cần chốt policy ghi nhận tiền/refund/excess trước bật; không bật chỉ để có biểu đồ. Projection chưa có adjustment refund đầy đủ. Dữ liệu seed/daily_stats không chứng minh sự kiện mới được xử lý đúng.

UI có all-store và XLSX/PDF thật, không còn dashboard doanh thu fixture. Nhưng đổi filter/lỗi có thể giữ số cũ; cần phân biệt loading, zero, error và stale. KPI hoạt động không được suy từ 20 đơn đầu.

Nguồn: `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/backend/review-report-service/README.md:3`; `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/config-repo/review-report-service.yml:5`; `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/frontend/react/src/pages/Reports/index.tsx:148`; `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/frontend/react/src/pages/Dashboard/index.tsx:480`.

### 4.7. Audit: chưa phủ mọi thay đổi Admin

Review mới ghi audit_outbox, chưa dispatcher. Audit consumer chỉ nhận Identity/Order/Payment, ACK-bỏ nguồn khác, gồm Review. Catalog/kho/voucher/loyalty/shipping config và Users legacy còn thiếu producer tương ứng. Cần inventory mutation, durable publish/retry/dedup, payload allowlist và readback; không chỉ thêm listener.

Có bảng audit trong account của từng quán, không phải thiếu UI hoàn toàn. Nhưng request luôn có storeId, chưa tra cứu chuỗi với actor/action/time/detail đầy đủ.

Nguồn: `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/backend/review-report-service/src/main/java/com/clucky/reviewreportservice/service/ReviewAuditOutbox.java:20`; `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/backend/audit-service/src/main/java/com/clucky/auditservice/service/AccountAuditConsumer.java:23`; `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/frontend/react/src/pages/Users/BranchAccountsPage.tsx:100`.

### 4.8. Notification/email/Customer/Settings

- Chuông Admin chỉ mở UnavailableFeature. Cần inbox/unread/read-all/navigation và fan-out đúng Admin/nhân sự; consumer hiện chọn một customerId hoặc managerUserId, không giải quyết đủ đơn mới toàn chuỗi.
- Sender có queue/claim/retry nhưng SMTP đang tắt; activation/recovery chưa thể coi vận hành được qua email. Refund event thiếu recipient email, consumer không lookup bù; bật SMTP riêng chưa sửa được email refund.
- BE-63/UI-50 chưa có API/màn log/detail/retry Admin hoàn chỉnh. Retry cần policy/contract, không tự thêm gửi lại tùy ý.
- /admin/users mount BranchAccountsPage; UsersPage cũ không được route, còn mockStores. Cần scope Customer list/search/lock/history; Order list hiện chưa có customer filter cho Admin.
- Ngân hàng/loyalty/phí ship có rồi. Settings khác trong FR-ADM-13 cần phân rã yêu cầu, không phát minh bảng config tùy ý.

Nguồn: `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/frontend/react/src/components/ui/AdminNotificationCenter.tsx:8`; `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/backend/notification-service/src/main/java/com/clucky/notificationservice/consumer/NotificationConsumer.java:136`; `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/backend/cart-order-service/src/main/java/com/clucky/cartorderservice/service/OrderEventPublisher.java:73`; `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/frontend/react/src/App.tsx:181`; `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/architechture/docs/SRS.md:176`.

## 5. Feature flag runtime đã đọc trực tiếp

| Container | Flag không nhạy cảm | Giá trị | Ý nghĩa |
| --- | --- | --- | --- |
| review-report-service | REPORT_REVENUE_EVENT | false | Projection doanh thu chưa kích hoạt |
| notification-service | MAIL_SENDER_ENABLED | false | Worker gửi mail/listener branch-mail bị gate |
| catalog-store-service | CLOUDINARY_ENABLED | false | Upload catalog trả dependency unavailable; không phải mất toàn bộ CRUD |
| cart-order-service | CLOUDINARY_ENABLED | false | Evidence đi vào fallback placeholder cần sửa |

Chỉ đọc cấu hình container, không kiểm thử SMTP/Cloudinary/Kafka/bank feed, không in credential và không thay flag.

## 6. Inventory phụ thuộc và phần hoãn

Các task sau liên quan Admin qua nền tảng/đầu vào, không phải tính năng Admin độc lập. Đã inventory/truy vết theo nhu cầu Admin; **không có nghĩa từng AC của mọi dependency đã được audit hoặc nghiệm thu**.

| Nhóm | ID hiện hành | Đánh giá giới hạn |
| --- | --- | --- |
| Schema/security/error/cache/docs/health | BE-01–10, BE-12/13/15 | Có nền service/schema/controller; BE-09 có blocker cụ thể; chưa xác nhận mọi AC |
| Auth/profile/avatar | BE-17/18/77; UI-09 | Auth dùng chung; profile/avatar cá nhân không thay Customer management; avatar backlog |
| Catalog/checkout/payment đầu vào | BE-20/23/24/25/29/30/50/51/54 | Ảnh hưởng đơn/tiền Admin; Admin không được dùng checkout Customer |
| Event và xử lý lại | KAFKA-01/02/03/05/06/07/08/09/10/12 | Có nhiều producer/consumer; gap quota, report, audit, notification; chưa nghiệm thu pipeline |
| Mail/media chung | BE-52/57/59/60/62/63/68/72/75 | Có phần triển khai; còn các gap code/config nêu trên |
| Shell/components/UI quality | UI-02/08/43/44/45/46/47/48/34 | Component có không chứng minh nghiệp vụ/accessibility/responsive; chưa browser audit |
| Build/hạ tầng/deploy | UI-03/04/05/06/39/40/41; DEP-01–12/20/22 | Local build/18 container healthy ở lượt trước; không suy CI/VPS/backup/restore đều xong |

Toàn bộ BE/KAFKA/DEP ở trên đang T; UI-34/45/48 đang T, UI còn lại trong bảng đang D theo backlog.

Các UI Customer UI-01/07/10–13/17–23/49/51 và BE-76 chỉ là đầu ra đối chiếu E2E gián tiếp, không gán thành chức năng Admin. UI-23 liên quan nguồn yêu cầu Party nhưng không chứng minh màn xử lý Party Admin.

### Chủ động hoãn / không thuộc MVP hiện tại

| Task/spec | Hiện trạng |
| --- | --- |
| BE-28, UI-23, Party | Controller denyAll; chưa UI Admin tiếp nhận/báo giá. Form Customer DONE không thay nghiệp vụ Admin |
| BE-35/KAFKA-04/KAFKA-11, proposal UI-28 | Theo kế hoạch hoãn; UI khóa nhưng API mở lệch, cần xử lý scope; approval event chưa đầy đủ |
| BE-36, banner UI-28 | Chưa CRUD/upload/public runtime đầy đủ; UI khóa, component mock không tính triển khai |
| BE-31 Casso | Chỉ làm khi được chọn, không bắt buộc cho SePay hiện tại |
| BE-47 | Shipper/assignment/tracking sau CREATED thuộc Phase 2 |
| UI-50 | Email log/retry backlog, phải chốt contract/quyền/chính sách trước mở |
| Chi trả dư / tiền chuyển cho đơn hết hạn | Hoãn riêng; vẫn phải lưu/phân loại/đối soát, không tự refund hoặc tính excess là doanh thu |

## 7. Spec bổ sung, alias và khoảng trống task

| Spec | Mapping chính | Trạng thái |
| --- | --- | --- |
| F1–F4 | BE-09/17/19/21/22/25/26/27/32/34/42 và UI tương ứng | Có nhiều sửa mã; refund/legacy Users/proposal còn lệch policy; chưa nghiệm thu |
| A1–A3 | BE-19, UI-15/26; Identity/Catalog/Notification | Provision/recovery/migration có; còn legacy bypass và gate vận hành |
| B1–B4 | UI-24/30/31/26; BE-21/22/25/26/27/32 | Workspace/kho có; **B2 counter-order chưa có API/UI riêng**, collection UI thiếu |
| C1–C4 | BE-29/30/32, UI-27/30, KAFKA-03 | Backend nhiều phần có; UI bank/receipt/assign chưa thay collection/reconcile |
| D1–D3 | BE-26/32/60/62, UI-24, KAFKA-03/12; media | Blocker role/evidence/live-payment/recipient; BE-72 catalog không tự bao phủ evidence riêng tư |
| E1 | BE-40/42/43, KAFKA-07/10, UI-14/16/29 | Moderation/report UI tiến triển; audit/projection/contract/tài liệu chưa đóng |

**Chưa có canonical task riêng đủ phạm vi:** Customer management, audit UI toàn chuỗi, Settings ngoài các config domain; A–E cũng chưa được phân bổ đầy đủ vào acceptance task mới. Cần phân bổ hoặc sửa scope được duyệt, không tự đặt ID mới trong báo cáo.

Không đếm hai lần mã cũ: BE-41 → BE-40; BE-45/46 → BE-32; BE-48 → BE-33; INT-45 → KAFKA-07; INT-48 → KAFKA-10; INT-61 → BE-19/UI-15; INT-62 → BE-34/UI-28; INT-63 → BE-32/UI-27; INT-71 → UI-50; UI-52 và BE-70/71/74 → BE-72. Acceptance INT/TEST đã gộp vẫn cần nghiệm thu ở task chính.

Nguồn: `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/architechture/tasks/README.md:156`; `D:/Work/Ptit/Lap-Trinh-Mang/Clucky/architechture/specs/rbac-branch-operations/README.md:9`.

## 8. Thứ tự đề xuất để làm tiếp

PIC lấy từ task hiện hữu, không tự thay người hoặc giao thêm phạm vi.

| Ưu tiên | Việc cụ thể | Task/PIC hiện tại | Điều kiện đóng |
| --- | --- | --- | --- |
| 1 | Refund allowlist, evidence thật và TTL | BE-26: Trần Đức Anh; BE-32: Lê Phú Thịnh; phối hợp media | Role/owner/store/state đúng; thiếu provider/file thật không confirm |
| 1 | Hợp nhất Users legacy/branch policy | BE-09/19, UI-15: Trần Nguyễn Hữu Khánh | Không giữ session scope cũ, không unlock retired; validation/audit |
| 1 | Phân trang Order/Refund; nối collection/reconcile | UI-24/30: Trần Đức Anh; BE-32/UI-27: Lê Phú Thịnh | Đủ dữ liệu nhiều trang; trạng thái tiền/đơn không suy diễn |
| 2 | Refund live-payment/ledger/reservation/recovery/recipient | BE-26/32; KAFKA-12/BE-60/62: Cao Tất Thành phối hợp | Luồng mới hợp lệ; retry/race không nhân tiền; thông báo đúng người |
| 2 | Đóng proposal ngoài scope; hoàn thiện quota voucher | BE-34/UI-28: Cao Tất Thành | Quyền đúng; reserve/consume/release và tranh lượt cuối nhất quán |
| 2 | Audit coverage và UI toàn chuỗi | BE-43/KAFKA-10: Mai Sơn Việt; owner domain viết producer | Durable delivery, dedup/readback; actor/action/time/all-store |
| 2 | Policy/projection/refund report; stale-data UI | BE-42/KAFKA-07/UI-29: Mai Sơn Việt | Policy duyệt, dữ liệu mới đúng, export/API cùng filter |
| 3 | Category CRUD/edit combo/delete store, concurrency/media | BE-21/22/72, UI-25/26/31: Nguyễn Duy Quang Nhật | UI đủ action; chống stale write; không mất ảnh/thành công giả |
| 3 | Customer, notification, email ops, scope Settings | Customer/Settings cần task; UI-32: Cao Tất Thành; BE-63/UI-50: Mai Sơn Việt | Route/API thật; retry chỉ mở sau contract |
| Song song | Đồng bộ task/spec/SRS/RBAC/API | E1 và owner domain | Không còn hai chuẩn trái nhau; không đổi DONE chỉ vì healthy |

**Nên bắt đầu ưu tiên 1**, không mở Phase 2/Party/proposal để làm đầy menu.

## 9. Điều kiện nghiệm thu còn thiếu

Cần bằng chứng theo commit/môi trường: Admin chuỗi; Manager/Staff quán A/B; Customer owner; direct API Gateway; persisted readback; retry/concurrency/failure; downstream event; export file; UI loading/error/empty và accessibility. Đây là việc cần người dùng nghiệm thu, **không phải kiểm thử đã chạy**.

Các báo cáo subagent là đầu vào rà soát tĩnh. Blocker nổi bật đã đọc lại source; không thực hiện request khai thác/giao dịch thử. Tài liệu handoff/lịch sử thiếu trên working tree không được dùng làm bằng chứng nghiệm thu.

Không sửa code/cấu hình ứng dụng nên không rebuild Docker trong lượt này. Không commit/push hoặc thay dữ liệu Lark.
