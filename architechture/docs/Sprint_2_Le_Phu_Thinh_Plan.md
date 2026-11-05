# Sprint 2 — Kế hoạch triển khai của Lê Phú Thịnh

Ngày lập: 04/11/2026 (UTC+7). Baseline ban đầu: `4a0d7d9`; cập nhật Google/email ngày 05/11/2026 trên main `470ef46`. Mục 9 là yêu cầu Google/email mới nhất, thay phần đề xuất tương ứng trước đó.

## 1. Nguồn và giới hạn

- Nguồn: [backlog](backlog.md), [Sprint Planning](Sprint_2_Planning.md), detail trong `../tasks/`, đối chiếu source sau khi pull main.
- Có **23 task: 11 BE, 11 INT, 1 TEST; 132 SP, 185 giờ công ước lượng gốc**. Tất cả đang TO DO trong snapshot; chưa xác minh trạng thái Lark trực tiếp. 185 giờ không phải remaining đã kiểm chứng.
- Hạn của sprint: **05/11/2026 23:59**, review 06/11. Nhiều deadline task đã nằm ở 02–03/11; cần cập nhật remaining với PIC, không tự coi task đã hoàn thành hoặc tự dời lịch.
- Đây là kế hoạch đề xuất, không thay PIC, phạm vi hay trạng thái backlog. Không triển khai tính năng hoặc chạy kiểm thử trong lượt lập kế hoạch.

## 2. Hiện trạng source

- Payment/Shipping đã có entity, repository, DTO, migration V1/V2 và cấu hình nền; `PaymentServiceTemplate.get` và `ShipmentServiceTemplate.get` vẫn trả NOT_IMPLEMENTED. Chưa có luồng nghiệp vụ hoàn chỉnh để chỉ nối UI là xong.
- Identity đã có AuthController/AuthService, JWT, refresh cookie và session revocation từ main. Google mới thấy route được permit và cấu hình TTL; chưa thấy endpoint Google/Firebase verifier trong implementation auth đã đọc. Tích hợp vào luồng auth hiện có, không xây hệ token riêng.
- Frontend đã có widget Payment/Shipping, VietQR helper, Google flow và dữ liệu mock. Tái sử dụng UI, thay nguồn dữ liệu theo contract; fixture/mock không chứng minh E2E thật.
- Catalog trên main đã có CloudinaryMediaAdapter và MediaDto.UploadResponse với secureUrl/publicId/metadata. BE-75 tập trung rà response, error/log và frontend exposure; không viết lại upload của Nhật.

## 3. Toàn bộ task và đầu ra

| Gói | Task của Thịnh | Đầu ra / ràng buộc |
|---|---|---|
| A. Payment nền | BE-29, BE-44 | Tạo bank-transfer PENDING + QR/expiresAt từ Order snapshot tin cậy; query trạng thái đúng owner/store và đúng payment attempt. Tạo QR không xác nhận đã nhận tiền. |
| B. COD và quản trị | BE-32, INT-51, INT-63 | Manual/COD/refund primitives, transactions/bank config; phân biệt xác nhận đơn với thu COD; nối màn hình quản trị. INT-63 cần BE-45 của gói C. |
| C. SePay, reconciliation, event và contract | BE-30, BE-45, INT-40, INT-49, INT-09, BE-49 | Xác minh ingress, match code/amount, unique bankTxId, mismatch workflow; payment.confirmed/failed có durable delivery, eventId/correlationId; QR/webhook/COD tích hợp; OpenAPI/payload examples. INT-09 chờ cả B. |
| D. Shipping MVP | BE-33, BE-48, INT-43, INT-65, TEST-12 | Fee/config/override và đọc shipment; consumer order.created tạo CREATED idempotent; nối UI và checklist pickup/free-threshold/store-override. Không assignment/tracking Phase 2. |
| E. Timeout và refund | BE-46, INT-50, INT-52, INT-64 | Refund PENDING → APPROVED/REJECTED → REFUNDED; expiry tránh race webhook; đồng bộ Order/Notification; UI pending/paid/expired/mismatch/refund từ dữ liệu thật. |
| F. Media security | BE-75 | Whitelist DTO, rà exception/log/config và dữ liệu đưa vào frontend; bàn giao cùng owner media. Không kết luận an toàn chỉ vì DTO không có secret. |
| G. Google login | BE-76, INT-74 | Firebase verify, link/create Customer, pendingToken một lần TTL 10 phút, complete-password, JWT/cookie theo Identity hiện có; migration mới, env/runbook; nối UI-49 và checklist token lỗi/email trùng/tài khoản cũ-mới. |

Không đưa BE-31 (Casso), BE-47 (tracking Phase 2) hoặc task của PIC khác vào phạm vi của Thịnh.

## 4. Thứ tự triển khai đề xuất

1. **Chốt contract và prerequisite trước:** kiểm tra BE-04/06/09/10/11/12/13/17/50 đã bàn giao phần cần dùng; chốt endpoint Order snapshot/ownership, số tiền, reference, role/store, event và error shape. Có code nền không đồng nghĩa dependency đã nghiệm thu.
2. **Mở đường checkout:** BE-33 → BE-48 và BE-29 → BE-44; bàn giao phí giao hàng cho BE-24/25, payment DTO cho Order/UI. Đặt cấu hình ở Config Server, thêm migration mới nếu schema thiếu.
3. **Hoàn thiện COD + payment events:** BE-32 → INT-51 theo handoff BE-25; chốt delivery/recovery với INT-40 ngay lúc thiết kế transaction, không thêm publish thiếu bảo đảm sau cùng.
4. **Hoàn thiện chuyển khoản:** BE-30 → BE-45 → INT-49; hoàn tất INT-40, nối INT-09 sau INT-51; INT-63 sau BE-32/45. BE-49 viết cùng endpoint/event, không chờ cuối sprint mới mô tả contract.
5. **Đóng vòng đời:** BE-26 + BE-32 → BE-46 → INT-52; BE-29 + INT-40 + BE-26/39 → INT-50; sau đó INT-64. Phân biệt Payment state và Order state, không tự coi tên trạng thái giống nhau.
6. **Đóng Shipping:** sau INT-39/BE-06 làm INT-43, ghép BE-33/48 thành INT-65 rồi bàn giao TEST-12 để người dùng chạy.
7. **Google và media theo handoff:** BE-76 sau BE-17/09/12, INT-74 sau BE-76 + UI-49; BE-75 rà phần đã có ngay, nghiệm thu toàn luồng sau BE-70/72/INT-73. Hai nhánh độc lập với phần lớn Payment nhưng cùng một PIC, không giả định có thêm capacity song song.

## 5. Những quyết định chặn triển khai/nghiệm thu

| Điểm cần chốt | Phối hợp | Điều kiện bắt đầu phần phụ thuộc |
|---|---|---|
| Order snapshot, owner/store, orderCode, số tiền, retry/tái tạo QR, TTL và qrContent là URL hay payload | Đức Anh + Thịnh | Contract thống nhất; frontend không cung cấp amount/owner làm nguồn tin cậy. |
| SePay auth mode/header/thuật toán, raw body, ACK/retry và payload | Thịnh + owner provider + Khánh | Xác minh tài liệu chính thức và cấu hình account thực tế trước khi viết verifier/mở webhook. Không đoán HMAC/header. |
| Late payment, thiếu/thừa tiền, khoản thứ hai và race expiry | Thịnh + Đức Anh | Có state/compensation policy; không tự reopen Order hoặc xác nhận mismatch. |
| Durable event, retry/dedup và handoff order.created/payment events | Thịnh + Đức Anh + Việt | Có event contract, eventId riêng correlationId và recovery khi DB commit nhưng publish lỗi. |
| Refund request, approve/reject, quyền và bằng chứng hoàn tiền | Đức Anh + Thịnh + Thành | BE-26/39 bàn giao; không coi approve là tiền đã hoàn. |
| Khoảng cách tính phí, subtotal tính ngưỡng, ưu tiên override | Đức Anh + Thịnh | Rule được xác nhận, không thêm Maps provider hoặc tự đặt quy tắc. |
| Firebase credential/provider, Customer-only linking, pending token, JWT/cookie/revocation | Khánh + Thịnh | Config an toàn; không link Google vào tài khoản Staff/Admin ngoài phạm vi. |
| Cloudinary response/lỗi/log và UI thực tế | Nhật + Thịnh | Nhận BE-70/72/INT-73; rà cả failure path, không đưa secret vào Git/log/frontend. |

## 6. Mốc bàn giao và rủi ro lịch

- **04/11:** xác nhận remaining và handoff; ưu tiên contract, Shipping fee, Payment init/status, COD. Ghi rõ phần bị chặn do provider/Order/Notification thay vì làm mock rồi đánh xong.
- **05/11:** ưu tiên khép luồng thanh toán đã bắt đầu, expiry/refund/shipment, tích hợp UI và bàn giao checklist/evidence; Google/media chỉ nghiệm thu khi đủ điều kiện thật. Đây là thứ tự ưu tiên, không cam kết toàn bộ 23 task sẽ xong trong hai ngày.
- **Cảnh báo capacity:** 185 giờ ước lượng gốc, backend Payment/Shipping còn template và deadline sát. Chưa có cơ sở xác nhận toàn bộ phạm vi khả thi trước 05/11. Cần PIC cập nhật remaining, rồi nhóm duyệt hỗ trợ hoặc giảm phạm vi; không tự đổi owner/deadline, không giấu việc còn thiếu.
- **06/11:** review evidence và phần chưa đạt, không biến ngày review thành ngày triển khai bù.

## 7. Checklist bàn giao cho người dùng tự kiểm thử

- Theo từng task: file/commit, contract/migration/config thay đổi, dependency đã nhận, AC đạt/chưa đạt/blocked và lỗi còn lại; không đánh DONE chỉ vì có code.
- Payment: sai owner/store, QR retry, webhook hợp lệ/trùng/sai auth/sai tiền, concurrent confirmation, late payment/expiry, COD/manual/refund, event replay và lỗi publish; kiểm tra UI qua Gateway.
- Shipping: pickup, ngưỡng miễn phí, override, input sai, duplicate order.created chỉ một shipment CREATED, cross-store access.
- Google/media: token lỗi/hết hạn, email trùng, pending token một lần, account role restrictions, JWT/cookie/revocation; upload failure không lộ credential ở response/log/frontend.
- Khi triển khai logic sẽ bổ sung check nhỏ hoặc test theo cấu trúc sẵn có để người dùng chạy; không tự chạy test/lint/typecheck/build, Docker/backend hoặc trình duyệt nếu chưa được yêu cầu rõ.

Trạng thái lượt này: chỉ pull main, bảo toàn thay đổi local và lập kế hoạch; chưa triển khai task, chưa kiểm thử, chưa cập nhật Lark.

## 8. Làm rõ với PIC ngày 04/11/2026

Mục này cập nhật các giả định/phạm vi ở mục 3–7. Phân biệt quyết định PIC đã chốt với đề xuất chưa duyệt; chưa sửa API, RBAC, migration hoặc task AC theo các đề xuất.

### 8.1. Đã được PIC chốt

- Hoàn thiện toàn bộ phần việc đã thống nhất, không giao template/mock thay nghiệp vụ; PIC xác nhận các task của mình chưa có người khác triển khai. Không tự giảm phạm vi vì estimate.
- SePay đã sẵn sàng; secret qua GitHub repository secrets và môi trường local. Dò nội dung chuyển khoản bằng contains, reference bắt đầu `Clucky-`; không xử lý hỗ trợ khách tự sửa reference trong sprint này.
- QR hết hạn sau 20 phút; tạo lại phải tạo payment attempt mới.
- Xác nhận chuyển khoản thủ công chỉ STORE_MANAGER, không ADMIN/STAFF. Đây là thay đổi so với API/RBAC hiện tại còn cho ADMIN.
- Refund không một phần; trong MVP thao tác APPROVED được coi là đã hoàn tiền theo nghiệp vụ. Không có lệnh hoàn tiền ngân hàng tự động.
- Phí giao hàng tạm thời cố định 20.000 VND, không tích hợp ShopeeFood/GrabFood hiện tại; giới hạn giao hàng <=10 km, nếu thêm bản đồ chỉ dùng OpenStreetMap; cho phép người dùng yêu cầu lấy vị trí trình duyệt.
- Tại 04/11 Firebase chưa cấu hình; ngày 05/11 người dùng xác nhận đã thêm đủ ba biến public Firebase vào Next.js. Chưa xác minh provider/authorized domains, credential backend hay cấu hình CI/VPS; không đọc hoặc in giá trị env. Người dùng tự kiểm thử cả local và VPS, agent không tự chạy kiểm thử/hạ tầng.
- Thiếu/thừa tiền, tiền đến muộn, chuyển nhiều lần và sửa nội dung: đã ghi phần xử lý nghiệp vụ nâng cao vào backlog sprint sau. Vẫn phải xác thực webhook, chống xử lý trùng, lưu sự kiện tối thiểu an toàn và không xác nhận nhầm đơn.

### 8.2. Đối chiếu main và PR #28

- Fetch ngày 04/11: main vẫn `4a0d7d9`. PR #28 `feat/orders_and_party_orders` OPEN, GitHub báo CONFLICTING tại thời điểm kiểm tra; chưa merge/cherry-pick.
- PR #28 có Cart/Order/Refund controllers, OrderService và OrderEventPublisher. Đây là dependency cần phối hợp, không tự viết lại toàn bộ phần của Đức Anh.
- Main còn OrderServiceTemplate và NotificationServiceTemplate trả NOT_IMPLEMENTED. Auth và catalog/media có implementation thật, nhưng chưa kiểm thử runtime. Việc các nhánh khác đã merge không chứng minh Order/Notification đã bàn giao đủ.
- `bank_accounts_config` trong V2 hiện có id/bank_name/account_no/account_name/is_active, chưa store_id/bank code; Payment chưa snapshot ngân hàng/store. RBAC dòng 36 và API quy định cấu hình ngân hàng là ADMIN; STORE_MANAGER không được sửa.
- Workflow frontend hiện đọc ba giá trị Firebase public từ `vars.NEXT_PUBLIC_FIREBASE_*`, không phải `secrets`. GitHub secret không tự xuất hiện trong container; cần wiring workflow/deploy cho secret server-side.

### 8.3. Đề xuất chờ PIC duyệt

1. **Ngân hàng theo cửa hàng:** ADMIN gán tài khoản nhận tiền, không có nghiệp vụ phát hành thẻ ngân hàng. Thêm migration Payment mới: store_id và bank_code; unique một cấu hình active mỗi store, không FK sang Catalog. Payment lưu snapshot store/tài khoản/reference để đổi config không làm QR đang chờ bị chuyển ngân hàng. Cấu hình cũ chưa biết store phải được ADMIN gán, không tự đoán. Cửa hàng chưa có cấu hình hợp lệ chỉ cho COD, không tạo QR mẫu.
2. **Attempt/reference:** `Clucky-<mã attempt duy nhất, độ dài cố định>`; dùng contains trên reference đầy đủ, không so toàn bộ content và không dùng prefix số ngắn gây khớp nhầm. Chuẩn hóa hoa/thường, không fuzzy-match nội dung đã bị sửa; payload có nhiều reference hợp lệ không tự match. Payment cũ được hết hiệu lực nguyên tử khi tạo attempt mới; cùng Order tối đa một attempt đang chờ. Webhook vẫn phải đúng tài khoản nhận, tiền vào, đúng amount, chữ ký, chưa hết hạn và Order còn hợp lệ.
3. **SePay:** dùng HMAC-SHA256 theo tài liệu chính thức hiện hành: ký timestamp + dấu chấm + raw body, kiểm tra timestamp/chữ ký constant-time; không suy ra webhook identity từ JWT hay IP do client tự gửi. Durable intake + dedup transaction id; webhook hợp lệ đã lưu nhưng không match vẫn ACK theo provider và không PAID. Lỗi auth/ghi bền vững phải trả lỗi phù hợp, không ACK thành công trước khi lưu.
4. **COD:** giữ quyền STAFF/MANAGER tại quán mình và ADMIN theo ma trận hiện tại; xác nhận nhận đơn không đồng nghĩa đã thu COD. Confirm-cod chỉ sau khi thực sự nhận tiền ở bước giao/nhận đơn hợp lệ, chuyển payment COLLECTED; Order COMPLETED chỉ khi đã COLLECTED. Delivery MVP do nhân viên cập nhật kết quả, không phát sinh actor shipper/tracking Phase 2.
5. **Manual transfer:** chỉ MANAGER quán mình, chỉ BANK_TRANSFER còn hợp lệ; bắt buộc lý do và mã/tham chiếu bằng chứng đối soát; audit actor/store/payment/amount/time. Retry không phát event lần hai; không dùng manual để nhận COD hoặc xử lý late/mismatch thuộc backlog.
6. **Refund:** giữ quyền duyệt MANAGER quán mình/ADMIN toàn hệ thống. RefundRequest giữ APPROVED như kết quả duyệt cuối trong MVP, Payment chuyển REFUNDED khi cập nhật liên miền thành công; UI nêu rõ ghi nhận hoàn tiền thủ công, không gọi ngân hàng. Toàn bộ số tiền thực thu của payment gồm phí ship đã thu; điểm/voucher phải phối hợp contract với owner, không tự cộng thành tiền mặt. Nếu đồng bộ thất bại phải retry/reconcile, không hiển thị thành công giả.
7. **Shipping:** DELIVERY 20.000, PICKUP 0; tạm không per-km/free-threshold/store override, các AC tương ứng cần đổi minh bạch. Tính bán kính đường chim bay bằng Haversine trên backend (không giả là quãng đường lái xe); <=10 km cho giao. Bổ sung tọa độ Store do ADMIN đặt và tọa độ giao hàng đã xác nhận/snapshot theo schema service sở hữu. Vị trí hiện tại chỉ là gợi ý; khách xác nhận ghim và địa chỉ. Thiếu tọa độ hoặc từ chối GPS thì chọn ghim OSM; vẫn không xác định được thì chặn DELIVERY, cho chọn PICKUP. Không tự mặc định khoảng cách bằng 0 hoặc xin vị trí ngay khi mở trang.
8. **Google:** đã được làm rõ ngày 05/11 ở mục 9: một Customer/email, một mật khẩu dùng cho email login; Google chỉ yêu cầu đặt mật khẩu khi tạo Customer mới. Đề xuất trước về tự đặt lại mật khẩu cho tài khoản chưa verify không được coi là đã duyệt; xử lý ngoại lệ chưa hoàn tất đăng ký theo mục 9.6. Dùng lại JWT/refresh-cookie/revocation hiện có.

### 8.4. Hướng dẫn chuẩn bị Firebase

1. Tạo Firebase project và đăng ký Web app; Authentication → Sign-in method → bật Google, chọn email hỗ trợ nếu console yêu cầu.
2. Authentication → Settings → Authorized domains: thêm localhost và domain frontend VPS thực tế; không giả định localhost đã được thêm sẵn.
3. Copy Web config vào `frontend/nextjs/.env.local`: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID. CI hiện dùng Repository Variables cùng tên; đây là cấu hình client public, không phải private credential. Đổi giá trị phải rebuild frontend.
4. Project settings → Service accounts → Generate new private key; giữ JSON ngoài Git và frontend. Local đặt GOOGLE_APPLICATION_CREDENTIALS trỏ tới file JSON và truyền biến vào process backend; `.env` không tự được Spring đọc nếu không có wiring.
5. VPS: credential file mount read-only vào Identity, GOOGLE_APPLICATION_CREDENTIALS trỏ đường dẫn trong container. Nếu lưu JSON trong GitHub Secret thì workflow phải truyền an toàn/tạo file trên VPS, hạn chế quyền và không in log; tên secret và wiring backend sẽ thêm khi triển khai. Không đưa private key vào NEXT_PUBLIC_*, image layer hoặc Config Server Git repo.
6. Bật provider/cấu hình Firebase chưa đủ để Google login Clucky hoạt động: BE-76 vẫn cần verifier, migration, endpoint và token lifecycle thật.

Nguồn đã đọc ngày 04/11/2026:
- [SePay webhook](https://docs.sepay.vn/tich-hop-webhooks.html), [xác thực webhook](https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc).
- [Firebase Google Sign-in](https://firebase.google.com/docs/auth/web/google-signin), [Firebase Admin setup](https://firebase.google.com/docs/admin/setup).
- [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/): giữ attribution, tuân thủ cache/identification, không bulk-download; OSM tiles không cung cấp quãng đường lái xe.

Chỉ cập nhật tài liệu và backlog local; chưa cập nhật Lark, sửa implementation/schema hoặc chạy kiểm thử.

## 9. Plan chi tiết Google + email dùng chung tài khoản — 05/11/2026

### 9.1. Quy tắc đã được người dùng chốt

**Một Customer = một bản ghi users = một email chuẩn hóa = một mật khẩu Clucky. Google và email/password là hai cách đăng nhập cùng tài khoản, không phải hai tài khoản cần đồng bộ.**

- Đăng ký Google trước: xác minh Google, đặt mật khẩu Clucky đúng một lần để hoàn tất đăng ký. Sau đó Google login không hỏi mật khẩu; email login dùng chính mật khẩu đã đặt.
- Đăng ký email trước và đã hoàn tất xác minh: khi bấm Google có cùng email, tự liên kết và đăng nhập tài khoản hiện có. Không hỏi mật khẩu, không đặt mật khẩu mới, không tạo user thứ hai.
- Nút Google tại trang đăng nhập và đăng ký gọi cùng một luồng; backend quyết định trả phiên đăng nhập hay yêu cầu hoàn tất đăng ký mới.
- Mật khẩu Clucky không phải mật khẩu Google. Không thu thập mật khẩu Google, không lưu mật khẩu trong Firebase.
- Một lần đặt mật khẩu là một lần lúc đăng ký; không loại bỏ chức năng đổi/quên mật khẩu chủ động sau này.
- Giữ nguyên userId, đơn hàng, điểm, địa chỉ và dữ liệu hồ sơ khi thêm phương thức Google. Không ghi đè tên/avatar/mật khẩu cũ chỉ vì Google trả dữ liệu khác.

### 9.2. Hiện trạng và phạm vi file

| Thành phần | Hiện trạng đã đọc / phần sẽ làm |
|---|---|
| Next.js env | Người dùng xác nhận đã thêm NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID; chưa chạy kiểm chứng. |
| `frontend/nextjs/lib/google-auth.ts` | Đã có Firebase popup lấy ID token và signOut Firebase sau khi lấy token. Tái sử dụng, không coi Firebase session là phiên Clucky. |
| `frontend/nextjs/lib/api.ts` | Đã có authApi.google/completeGoogle và union AuthTokens hoặc REQUIRES_PASSWORD; giữ tương thích. |
| `frontend/nextjs/components/auth/google-auth-flow.tsx` | Đã tách đăng nhập trực tiếp và màn hình pending password; nối API thật, xử lý pending hết hạn/trùng request. |
| `frontend/nextjs/components/auth/google-complete-password.tsx` | Có nhập/xác nhận mật khẩu; cần đồng bộ validation với email register, loading/error/accessibility và locale vi/en. |
| Identity AuthController/AuthService | Đã có email register/login, OTP, refresh/logout/reset, session revocation; chưa có implementation Google. Tận dụng đường cấp phiên/cookie hiện có. |
| Identity User/repository/migrations | Hiện V1–V3, password_hash NOT NULL và email unique; thêm migration mới V4 nếu số này còn trống khi triển khai, không sửa migration đã áp dụng. |
| Config/deployment | Public frontend env không thay backend Firebase credential. Cấu hình Identity qua môi trường/Config Server phù hợp, secret không vào Git, log hoặc bundle. |

Chỉ tác động Google/email trong BE-76, INT-74 và phần UI-49 liên quan; không tự triển khai Google cho frontend staff/admin. Các quyết định Payment/Shipping chưa duyệt không trở thành đã duyệt qua cập nhật này.

### 9.3. Luồng A — Google trước, Customer mới

1. Khách bấm Google, hoàn tất popup; frontend chỉ gửi Firebase ID token qua Gateway đến POST /api/auth/google. Email frontend không phải nguồn tin cậy.
2. Backend xác minh token đúng project, chữ ký, issuer/audience, expiry, email_verified và nguồn đăng nhập Google; lấy uid/email từ token đã xác minh.
3. Tra uid rồi email chuẩn hóa. Nếu chưa có user, trả `{status: REQUIRES_PASSWORD, pendingToken}`; chưa tạo users, chưa JWT/refresh cookie, chưa gửi OTP đăng ký email.
4. Pending token ngẫu nhiên, TTL 10 phút, dữ liệu uid/email/name/avatar giữ phía Redis; token không mang quyền truy cập API khác, không lưu vào localStorage/log/URL.
5. Khách đặt và xác nhận mật khẩu Clucky; POST /api/auth/google/complete chỉ nhận pendingToken + password. Backend lấy email/uid từ pending record, không nhận role/store/email do client khai làm căn cứ.
6. Validate cùng policy email register hiện có: 8–72 ký tự, có chữ hoa/chữ thường/chữ số; dùng cùng password encoder BCrypt. Xác nhận mật khẩu là kiểm tra UI, validation server vẫn bắt buộc.
7. Trong transaction tạo duy nhất CUSTOMER ACTIVE, emailVerified=true, storeId=null, firebase_uid đã xác minh và password_hash. Không cần OTP vì Google đã chứng minh email.
8. Chỉ khi ghi dữ liệu thành công mới cấp phiên qua cơ chế JWT/refresh cookie hiện có. Vô hiệu hóa pending theo cơ chế một lần, không dùng thao tác read-then-delete thiếu bảo vệ cạnh tranh.
9. Khách thoát trước bước đặt mật khẩu: chưa có tài khoản hoàn tất; lần sau Google vẫn yêu cầu hoàn tất. Đây không phải hỏi mật khẩu lại cho tài khoản đã đăng ký.

### 9.4. Luồng B/C — đăng nhập lại và email trước

| Trường hợp | Kết quả bắt buộc |
|---|---|
| Đã đăng ký Google + đặt mật khẩu, đăng nhập Google lại | Xác minh token, lấy cùng user theo uid, kiểm tra role/status rồi cấp phiên; không REQUIRES_PASSWORD. |
| Đã đăng ký Google, đăng nhập email/password | Endpoint login hiện có kiểm tra password_hash đã đặt lúc Google registration; cùng userId, không đăng ký lại. |
| Đã đăng ký email + OTP, lần đầu bấm Google cùng email | Link firebase_uid vào user hiện có rồi cấp phiên; giữ nguyên password_hash và hồ sơ, không yêu cầu nhập/đặt lại mật khẩu. |
| Đã link Google, đăng nhập email tiếp | Dùng mật khẩu email ban đầu, không thay đổi vì linking. |
| Bấm Google trên trang Đăng ký nhưng email đã có tài khoản hợp lệ | Hành vi đăng nhập/link giống trang Đăng nhập; không báo EMAIL_EXISTS chỉ vì dùng nút Google. |
| Gửi form đăng ký email với email đã có từ Google/email | Vẫn 409 EMAIL_EXISTS và dẫn đến Đăng nhập/Quên mật khẩu; không tự đổi mật khẩu hoặc tạo bản ghi mới. |
| Chủ động đổi/reset mật khẩu | Mật khẩu mới áp dụng email login; Google login không hỏi mật khẩu và tiếp tục cùng tài khoản. Giữ quy tắc thu hồi phiên hiện có. |

### 9.5. API, database và chống trùng

- POST /api/auth/google nhận `{idToken}`; tài khoản hoàn tất trả AuthResponse hiện có gồm accessToken/role/storeId/email/fullName và refresh token trong HttpOnly cookie. Chỉ Customer mới trả REQUIRES_PASSWORD + pendingToken, không cấp phiên sớm.
- POST /api/auth/google/complete nhận `{pendingToken,password}`, chỉ hoàn tất đăng ký mới; không được trở thành API reset mật khẩu tài khoản đã có.
- Thêm firebase_uid nullable UNIQUE vào users. Giữ password_hash NOT NULL vì Customer Google chỉ được tạo sau khi có mật khẩu; phone hiện đã nullable nên không sửa vô ích. Không thêm bảng user Google riêng hay abstraction nhiều provider chưa cần.
- Dùng cùng chuẩn hóa email của AuthService; không tự bỏ dấu chấm hoặc phần +tag trong Gmail. Trước thay đổi constraint/index phải đối chiếu dữ liệu hiện hữu, không tự merge tài khoản khác nhau.
- UID là định danh liên kết bền vững; email dùng tìm tài khoản lần link đầu. UID đã gắn người khác hoặc email đã gắn UID khác: từ chối với lỗi an toàn, không ghi đè/tự merge.
- Recheck uid/email/role/status trong transaction và rely on unique constraints khi concurrent. Hai request Google link cùng uid vào cùng user có thể trả cùng tài khoản, không tạo user mới.
- Google complete cạnh tranh email registration: không ghi đè password_hash của bên đã tạo user. Trả lỗi conflict có hướng dẫn bắt đầu Google login lại/hoàn tất OTP phù hợp; tuyệt đối không cấp phiên chỉ vì email trùng trong request complete.
- Pending hoàn tất phải được claim nguyên tử, không chạy hai transaction tạo user từ cùng token. Nếu DB lỗi sau claim: không báo thành công; giải phóng an toàn hoặc yêu cầu bắt đầu Google lại. Nếu commit thành công nhưng response mất: lần Google login mới vào tài khoản đã tạo, không đặt lại mật khẩu.
- Mã lỗi theo error catalog chung và error shape hiện có. Khi cần mã mới phải cập nhật nguồn catalog/generator và locale, không sửa file generated trực tiếp.

### 9.6. Ngoại lệ bảo mật — không thay đổi happy path đã chốt

- LOCKED: từ chối cả Google và email, không tự mở khóa hoặc cấp phiên khi link.
- STAFF/STORE_MANAGER/ADMIN/SHIPPER: không Google login ở luồng Customer, không chuyển role/store.
- Token không hợp lệ, hết hạn, sai Firebase project/provider, thiếu email hoặc email chưa verified: từ chối; không tạo/link user, không tin thông tin frontend.
- **Đề xuất riêng cần xác nhận cho đăng ký email dở dang:** user có emailVerified=false chưa phải đăng ký email đã hoàn tất. Không tự link rồi giữ mật khẩu có thể do người khác đăng ký trước. Trả hướng dẫn hoàn tất quy trình xác minh/khôi phục email hiện có trước khi thử Google lại; không tự sinh màn hình đặt mật khẩu Google lần hai. Nếu muốn tự động hoàn tất trường hợp này cần chốt flow recovery an toàn riêng, không đánh đồng với user email đã xác minh.
- UID/email thay đổi bất thường hoặc liên kết xung đột: fail closed và hướng dẫn hỗ trợ, không tự chuyển dữ liệu giữa user.
- Không log idToken/pendingToken/password/private key/refresh token. Không expose credential Firebase Admin qua frontend/env public.

### 9.7. Kế hoạch triển khai theo lát cắt

1. **Contract + migration:** cập nhật yêu cầu BE-76/INT-74/API/database theo quy tắc một tài khoản; bổ sung firebase_uid, mapping User/repository/DTO. Giữ trạng thái task chưa nghiệm thu.
2. **Verifier + cấu hình:** thêm Firebase Admin verifier và credential wiring, kiểm tra token server-side, xử lý config thiếu bằng lỗi rõ ràng; không có mock/fallback đăng nhập khi Firebase lỗi.
3. **Existing Customer:** triển khai uid lookup/email link, role/status guards và cấp phiên/cookie dùng lại auth hiện có; không đổi password/profile.
4. **New Customer:** pending token TTL/một lần, complete registration với validation/transaction/concurrency; email login dùng ngay password_hash vừa tạo.
5. **Next.js:** dùng chung flow ở Login/Register, chỉ hiển thị form đặt mật khẩu khi backend trả REQUIRES_PASSWORD; giải thích đây là mật khẩu Clucky để đăng nhập email, không phải mật khẩu Google. Loading/error/expiry/retry và locale vi/en đầy đủ.
6. **Local/VPS:** kiểm tra cấu hình cần có bằng tên biến và hướng dẫn, không in giá trị; wiring provider/authorized domain/credential/backend/CI. Không coi ba biến frontend đã điền là backend đã sẵn sàng.
7. **Bàn giao:** thêm test/check trong cấu trúc sẵn có và checklist dưới đây cho người dùng tự chạy. Ghi file/commit, AC đạt/chưa đạt/blocked, không tự chạy test/lint/build/typecheck/browser/Docker/backend.

### 9.8. Checklist nghiệm thu local và VPS

| ID | Tình huống người dùng tự kiểm thử | Kỳ vọng |
|---|---|---|
| G01 | Google mới → đặt mật khẩu | Chưa complete không có user/phiên; complete tạo đúng một CUSTOMER và cấp phiên. |
| G02 | Logout → Google cùng tài khoản | Vào thẳng cùng user, không hỏi mật khẩu. |
| G03 | Google-first → email login | Mật khẩu đã đặt hoạt động; mật khẩu sai bị từ chối; không tạo user thứ hai. |
| G04 | Email-first + OTP → Google | Link và đăng nhập ngay; userId/password_hash/hồ sơ/đơn/điểm giữ nguyên. |
| G05 | Sau G04 → email login | Mật khẩu email ban đầu vẫn hoạt động. |
| G06 | Google trên cả Login và Register | Cùng hành vi, tài khoản có sẵn không bị đưa về complete-password. |
| G07 | Email register trùng tài khoản Google | 409 EMAIL_EXISTS; dữ liệu/mật khẩu cũ không đổi. |
| G08 | Đóng form mới, token pending hết hạn hoặc replay | Không cấp phiên sớm; hết hạn/replay bị từ chối; restart Google an toàn. |
| G09 | Double click, hai tab complete/link, email register đồng thời | Tối đa một user/email/uid; không ghi đè mật khẩu, không cấp phiên cho user sai. |
| G10 | Mất response hoặc DB lỗi khi complete | Không trạng thái thành công giả; Google login lại sau commit không yêu cầu tạo mật khẩu mới. |
| G11 | LOCKED, non-CUSTOMER, token sai/hết hạn/sai project, UID conflict | Bị từ chối, không tạo/link/cấp quyền ngoài phạm vi. |
| G12 | Email chưa verify | Theo policy riêng được duyệt; không tự link rồi giữ mật khẩu chưa xác minh. |
| G13 | Reset password tài khoản Google-first | Email dùng mật khẩu mới, Google vẫn không hỏi mật khẩu; phiên cũ bị thu hồi theo auth contract. |
| G14 | Refresh/logout và cookie qua Gateway trên local/VPS | Dùng đúng cookie/session lifecycle hiện có; không trả refresh token ra body. |
| G15 | Form đặt mật khẩu, popup bị hủy, lỗi mạng/Firebase | Validation cùng register, lỗi dễ hiểu vi/en, không treo loading hoặc giữ token nhạy cảm lâu dài. |

Trạng thái: đã cập nhật plan theo xác nhận ngày 05/11; chưa triển khai code, chưa đọc secret, chưa kiểm thử và chưa đánh BE-76/INT-74 DONE.

### 9.9. Tiến độ implementation local — 05/11/2026

- Đã triển khai phần code BE-76/INT-74: Firebase Admin verifier, link/create cùng account, one-time pending, migration V4, JWT/cookie/CSRF, nối UI/validation/retry và bổ sung regression tests.
- Không có user password null; avatar Google không tự nhập/fetch, user mới dùng avatar mặc định. Ngoại lệ email chưa verify từ chối auto-link, yêu cầu hoàn tất xác minh hiện có.
- Pending được consume nguyên tử một lần; rollback/mất response bắt đầu Google lại như mục 9.5, không thử ghi đè user thắng race.
- Xem [runbook](Google_Auth_Runbook.md) cho backend credential local/VPS và checklist người dùng tự kiểm thử. Ba biến Next.js chưa thay credential backend.
- Chưa chạy test/build/lint/typecheck, trình duyệt hoặc hạ tầng; chưa nghiệm thu Firebase thật, chưa cập nhật Lark/DONE. Các nhóm task Payment/Shipping chưa triển khai trong lượt này.

### 9.10. Deploy toàn stack — 05/11/2026

- Theo yêu cầu mới, pipeline main triển khai PostgreSQL/Redis/Kafka, 12 Java services và 2 frontend; mount Firebase vào Identity, tạo backend env từ BACKEND_ENV_JSON, health/Eureka gates và backup PostgreSQL trước Flyway. Xem [runbook full-stack](../../deploy/backend/README.md).
- Người dùng yêu cầu giữ nguyên tài khoản/mật khẩu mẫu: không khóa, không đổi, không xóa seed. Đã ghi cảnh báo không dùng dữ liệu thật trên demo công khai với credential mẫu.
- Không tự chạy deploy lên VPS hoặc test/build trong phiên này; chưa commit/push. Pipeline và health check không xác nhận mọi nghiệp vụ trong service đã hoàn thiện.
