# ĐẶC TẢ API (RÚT GỌN)
## Hệ thống website bán hàng thức ăn nhanh

### Hiệu chỉnh F1–F4 ngày 08/11/2026 — đã sửa mã, chưa nghiệm thu

Contract chi tiết và trạng thái tích hợp tại [bàn giao F1–F4](../specs/rbac-branch-operations/F1-F4-handoff.md). Phần này thay các mô tả cũ mâu thuẫn: voucher quản trị chỉ Admin với actor JWT; dashboard/revenue/export không dành cho Staff; kiểm kê quantity/threshold chỉ Manager/Admin, Staff báo hết món qua availability; Manager sửa quán qua allowlist operation. Checkout/preview chỉ Customer. Đặt tiệc đã được gỡ khỏi runtime theo yêu cầu ngày 12/11/2026; Users chưa có runtime API.

Cancel/reject nhận `reason`, status nhận `note` (lý do hủy trim 1–1000 ký tự); chỉ PENDING_PAYMENT/CONFIRMED được hủy. `OrderResponse.paymentStatus` đọc dữ liệu đã lưu (PENDING/PAID/COLLECTED/REFUNDED), độc lập với `status`; không backfill. Hoàn tất và xác nhận đơn chờ trả tiền yêu cầu PAID/COLLECTED, sai state trả 409. Thu COD không được thay bằng cập nhật COMPLETED; APPROVED refund không có nghĩa đã chi hoàn. Giữ error catalog và optimistic version hiện hữu; chưa nghiệm thu concurrency.

Quy ước chung:
- Base URL qua Gateway: `https://<domain>/api/...` ; mỗi service có tiền tố riêng.
- Xác thực trình duyệt: HttpOnly cookie, `credentials: include`, header `X-Clucky-Client: customer|admin`. Gateway chuyển access cookie thành Bearer nội bộ; service vẫn xác thực JWT và quyền. Không lưu token phiên trong localStorage/sessionStorage hoặc trả trong JSON.
- Định dạng: JSON; lỗi trả về `{ timestamp, status, error, code, message, path }`. `code` ổn định từ `contracts/errors.json`; backend giữ message tiếng Anh an toàn, frontend ánh xạ vi/en theo locale, không hiển thị exception thô. HTTP status và bản dịch được sinh từ cùng danh mục; xem `contracts/README.md`.
- Riêng `POST /api/auth/register`, response `VALIDATION_ERROR` có thêm `fieldErrors` tùy chọn, ví dụ `{"password":"INVALID","phone":"INVALID"}`. Trùng email trả `409 EMAIL_EXISTS`; trùng số điện thoại trả `409 RESOURCE_CONFLICT` kèm `fieldErrors: {"phone":"ALREADY_EXISTS"}`, kể cả khi DB phát hiện đăng ký đồng thời. Không suy đoán mọi lỗi UNIQUE là trùng email. Chỉ cho phép tên trường `fullName`, `email`, `phone`, `password`; không trả giá trị nhập, mật khẩu hoặc exception. Frontend hiển thị lỗi vi/en tại đúng ô, giữ lỗi trùng đến khi sửa giá trị, focus ô lỗi đầu tiên; checklist mật khẩu đổi xanh theo các điều kiện độ dài/chữ hoa/chữ thường/chữ số. Các lỗi khác giữ nguyên envelope cũ.
- Phân trang: `?page=0&size=20&sort=createdAt,desc`.
- Mỗi service công bố OpenAPI tại `/swagger-ui.html` (môi trường dev/demo).
- Frontend Customer (Next.js) và frontend quản trị (React) dùng chung toàn bộ hệ API này; khác biệt chỉ ở giao diện và quyền của role đăng nhập.
- Ký hiệu quyền: PUB = công khai, CUS = Customer, STF = Staff, MGR = Store Manager, ADM = Admin, SYS = hệ thống/webhook.

---

# 1. IDENTITY SERVICE — /api/auth, /api/users

### Google/email — contract BE-76, cập nhật 05/11/2026

- Một email chuẩn hóa tương ứng một Customer. Google-first đặt mật khẩu Clucky một lần; email login dùng cùng hash. Email-first đã verify được link Google rồi đăng nhập ngay, không đổi mật khẩu/userId/hồ sơ. Không tạo user riêng cho Google.
- `POST /api/auth/google` body `{idToken}` (không rỗng, tối đa 16.384 ký tự): Firebase Admin verify project/chữ ký/expiry/revocation/email_verified/provider Google. User mới trả 200 `{status: "REQUIRES_PASSWORD", pendingToken}` và không cấp JWT/cookie; user đã hoàn tất trả AuthResponse + refresh cookie hiện có.
- `POST /api/auth/google/complete` body `{pendingToken,password}`: token ngẫu nhiên 43 ký tự base64url, TTL mặc định 10 phút, dùng một lần. Password 8–72 ký tự, có chữ hoa/thường/số, không quá 72 byte UTF-8. Tạo CUSTOMER ACTIVE/email_verified=true; trả 200 AuthResponse + cookie, không gửi OTP email registration.
- AuthResponse chỉ có userId/role/storeId/email/fullName. Cookie riêng: `clucky_customer_access`, `clucky_customer_refresh`, `clucky_admin_access`, `clucky_admin_refresh`; HttpOnly, SameSite=Lax, Secure theo AUTH_COOKIE_SECURE. Access Path=/api, refresh Path=/api/auth. Cookie tồn tại theo refresh TTL; JWT access vẫn hết hạn theo access TTL. Xem [vòng đời phiên trình duyệt](Browser_Sessions.md).
- User LOCKED: 403 ACCOUNT_LOCKED; non-CUSTOMER: 403 FORBIDDEN; email đăng ký dở chưa verified: 401 EMAIL_NOT_VERIFIED, không tự giữ mật khẩu chưa chứng minh ownership để link; UID/email xung đột: 409 RESOURCE_CONFLICT. Email register/complete cạnh tranh tài khoản đã có: 409 EMAIL_EXISTS, không overwrite.
- Token Google sai/hết hạn/revoked/provider sai: 401 UNAUTHENTICATED; pending hết hạn/đã dùng: 401 TOKEN_REVOKED; quá 10 lần Google sign-in/UID trong 60 giây: 429 TOO_MANY_REQUESTS; Firebase chưa bật hoặc Redis/Firebase không sẵn sàng: 503 DEPENDENCY_UNAVAILABLE. Lỗi theo shape/catalog chung.
- Pending được lấy và xóa nguyên tử bằng Redis GETDEL, không GET rồi DEL riêng. Nếu DB rollback, khách bắt đầu Google lại; nếu DB đã commit nhưng response thất lạc, lần Google lại vào tài khoản đã tạo không hỏi password. UI bỏ pending cũ sau 409/5xx/lỗi mạng và hướng dẫn retry, không dùng complete để reset mật khẩu.
- Cấu hình và checklist local/VPS: [Google Auth Runbook](Google_Auth_Runbook.md). Chưa chạy nghiệm thu Firebase/DB/Redis thật.

| Method & Path | Quyền | Mô tả |
|---|---|---|
| POST /api/auth/register | PUB | Đăng ký khách hàng, gửi OTP |
| POST /api/auth/verify-otp | PUB | Xác thực OTP đăng ký |
| POST /api/auth/login | PUB | Cấp hai cookie HttpOnly theo client; JSON chỉ chứa thông tin user |
| POST /api/auth/refresh | Cookie refresh | Rotate refresh token, cập nhật hai cookie; không cần Bearer |
| GET /api/auth/session | Đã đăng nhập | Trả userId/role/storeId/email/fullName; không trả token |
| POST /api/auth/logout | Cookie refresh | Thu hồi phiên hiện tại và xóa cookie; không cần Bearer |
| POST /api/auth/forgot-password | PUB | Gửi OTP đặt lại mật khẩu |
| POST /api/auth/reset-password | PUB | Đặt lại mật khẩu bằng OTP |
| POST /api/auth/google | PUB | Đăng nhập Google bằng Firebase ID token — cấp cookie và trả thông tin user, hoặc `{status: "REQUIRES_PASSWORD", pendingToken}` nếu là user mới |
| POST /api/auth/google/complete | PUB | Hoàn tất đăng ký Google: `pendingToken` + `password` → tạo CUSTOMER, cấp cookie và trả thông tin user |
| GET/PUT /api/users/me | Đã đăng nhập | Xem/cập nhật hồ sơ cá nhân |
| GET/POST/PUT/DELETE /api/users/me/addresses | CUS | Quản lý sổ địa chỉ |
| GET /api/users | ADM | Danh sách tài khoản toàn hệ thống (lọc theo role/store) |
| POST /api/users/staff | ADM/MGR | Tạo tài khoản Staff (Manager chỉ tạo cho quán mình) |
| PUT /api/users/{id}/assign-store | ADM | Gán/đổi chi nhánh cho Staff/Manager/Shipper |
| PUT /api/users/{id}/lock, /unlock | ADM/MGR | Khóa/mở tài khoản (Manager chỉ khóa Staff quán mình) |
| GET/POST /api/schedules | MGR/STF | Xem lịch ca / Manager xếp ca cho Staff |

## 1.1. Auth transport và kiểm soát phiên (BE-16/BE-17)

- Cookie `clucky_refresh_token`: HttpOnly, SameSite=Lax, Path=/api/auth; bật `AUTH_COOKIE_SECURE=true` khi triển khai HTTPS. Không trả refresh token trong JSON hoặc lưu localStorage.
- Login, verify-otp, refresh, logout và reset-password yêu cầu Origin hoặc Referer cùng origin/thuộc `AUTH_ALLOWED_ORIGINS`. Client dùng credentials/include; không gắn Bearer cũ cho `/api/auth/**`.
- Gateway cho phép request logout/refresh tới Identity không cần Bearer; Identity xác thực refresh cookie và kiểm tra CSRF. API nghiệp vụ vẫn yêu cầu Bearer và RBAC/ownership/store scope.
- Gateway và mọi business service kiểm tra Redis `auth:revoked:sid:<sid>` và `auth:revoked:user:<userId>` trước khi chấp nhận access token. Token phải có `sid` và `iat`. Redis lỗi thì không cho qua xác thực; ghi thu hồi thất bại trả `DEPENDENCY_UNAVAILABLE`, không báo logout/reset thành công.
- Refresh cũng kiểm tra revocation. Marker được giữ trong refresh TTL + access TTL + 1 phút để bao phủ token đã rotate và clock skew; logout một thiết bị không thu hồi thiết bị khác.
- OTP: tối đa 5 lần cấp và 5 lần xác minh cho mỗi email/purpose trong một cửa sổ bằng `AUTH_OTP_TTL` (mặc định 5 phút). Bộ đếm Redis tăng nguyên tử, không rollback theo transaction SQL; cấp mã mới không reset quota xác minh. Vượt quota trả `TOO_MANY_REQUESTS`; Redis lỗi trả `DEPENDENCY_UNAVAILABLE`.
- Register/forgot chỉ thành công sau khi Kafka xác nhận nhận email event với `acks=all`; lỗi/timeout publish trả `DEPENDENCY_UNAVAILABLE` và rollback transaction tạo user/OTP. Xác nhận Kafka không đồng nghĩa SMTP đã gửi. Đây chưa phải transaction nguyên tử SQL–Kafka: email có thể tới sau timeout hoặc trước một DB commit thất bại; không dùng email làm bằng chứng đăng ký thành công. Outbox cần bổ sung nếu yêu cầu atomic delivery giữa hai hệ thống được chốt.
- Test hồi quy: `cd backend; .\gradlew.bat :identity-service:test :api-gateway:test :catalog-store-service:test`; frontend: `cd frontend/react; npm test`. Các test này được bổ sung nhưng chưa chạy trong lượt sửa PR #32.

# 2. CATALOG & STORE SERVICE — /api/stores, /api/catalog
| Method & Path | Quyền | Mô tả |
|---|---|---|
| GET /api/stores | PUB | Danh sách chi nhánh đang hoạt động |
| GET /api/stores/{id} | PUB | Chi tiết chi nhánh |
| POST/PUT/DELETE /api/stores | ADM | CRUD chi nhánh |
| PUT /api/stores/{id}/operation | MGR/ADM | Giờ mở cửa, tạm đóng/mở quán của mình |
| GET /api/catalog/categories | PUB | Danh mục món |
| POST/PUT/DELETE /api/catalog/categories | ADM | CRUD danh mục |
| GET /api/catalog/products?storeId=&categoryId=&keyword= | PUB | Menu theo chi nhánh (có trạng thái còn/hết), tìm kiếm/lọc |
| GET /api/catalog/products/{id} | PUB | Chi tiết món, tùy chọn, topping |
| POST/PUT/DELETE /api/catalog/products | ADM | CRUD món gốc, tùy chọn, topping |
| GET /api/catalog/combos | PUB | Danh sách combo |
| POST/PUT/DELETE /api/catalog/combos | ADM | CRUD combo |
| PUT /api/stores/{storeId}/products/{productId}/availability | STF/MGR/ADM | Bật/tắt còn/hết món tại chi nhánh (Staff chỉ quán mình, trong ca) |
| GET/PUT /api/stores/{storeId}/inventory | STF/MGR/ADM | Xem/cập nhật kho cơ bản của quán |

### Contract cập nhật tùy chọn và xác thực Catalog nội bộ

- Khi cập nhật sản phẩm, giữ `options[].choices[].id` dạng `opt-<id>` và `toppings[].id` dạng `top-<id>` nhận từ API. Mục mới gửi `id: null`/bỏ `id`, hoặc ID tạm `new-<uuid>`; ID đã lưu phải thuộc sản phẩm và không được lặp lại trong payload. Bỏ trường `options`/`toppings` giữ nguyên collection; gửi `[]` yêu cầu xóa. Xóa option đang được combo tham chiếu trả `409 RESOURCE_CONFLICT`; cần sửa combo trước.
- `POST /api/catalog/internal/validate-items` chỉ gọi nội bộ tới Catalog qua service discovery, không công bố qua Gateway. Endpoint nhận Bearer JWT với role `INTERNAL_SERVICE` hoặc `ADMIN`. `INTERNAL_SERVICE` là quyền kỹ thuật, không phải vai trò tài khoản đăng nhập; JWT vẫn phải có chữ ký hợp lệ, issuer/audience theo cấu hình, thời hạn hợp lệ và `sub` là số nguyên dương theo validator hiện có. Token phải có `iat`, `sid` không rỗng, không mang `typ=refresh` và vượt qua kiểm tra thu hồi session/user qua Redis như các access token khác. Không tin header `X-User-*` và không dùng token ADMIN của người dùng thay cho credential của service.

# 3. CART & ORDER SERVICE — /api/cart, /api/orders
| Method & Path | Quyền | Mô tả |
|---|---|---|
| GET /api/cart | PUB/CUS | Xem giỏ (guest theo session, customer theo userId) — Redis |
| POST /api/cart/items | PUB/CUS | Thêm món/combo vào giỏ |
| PUT /api/cart/items/{key} | PUB/CUS | Sửa số lượng/ghi chú/tùy chọn |
| DELETE /api/cart/items/{key}, DELETE /api/cart | PUB/CUS | Xóa món / xóa giỏ |
| POST /api/orders/preview | CUS | Tính tạm tính: voucher, điểm, phí ship (gọi Promotion + Shipping nội bộ) |
| POST /api/orders | CUS | Tạo đơn từ giỏ; trả orderCode và thông tin thanh toán |
| GET /api/orders/my | CUS | Lịch sử đơn của tôi |
| GET /api/orders/{id} | CUS/STF/MGR/ADM | Chi tiết đơn (kiểm tra chủ đơn hoặc storeId) |
| PUT /api/orders/{id}/cancel | CUS | Khách hủy đơn đủ điều kiện, kèm lý do |
| GET /api/orders?storeId=&status= | STF/MGR/ADM | Danh sách đơn quản trị (Staff/Manager bị ép storeId của mình) |
| PUT /api/orders/{id}/status | STF/MGR/ADM | Chuyển trạng thái đơn (xác nhận, chế biến, sẵn sàng, hoàn thành) |
| PUT /api/orders/{id}/reject | STF/MGR/ADM | Từ chối/hủy đơn tại quán kèm lý do |
| POST /api/refund-requests | CUS-owner | Tạo yêu cầu refund với `{orderId, reason, bankBin, bankName, bankAccountNo, bankAccountName}` |
| PUT /api/refund-requests/{id}/bank-details | CUS-owner/MGR/ADM | Cập nhật `{bankBin, bankName, bankAccountNo, bankAccountName, expectedBankDetailsVersion?}` khi state cho phép |
| PUT /api/refund-requests/{id}/approve, /reject | MGR/ADM | Duyệt/từ chối hoàn tiền |

# 4. PAYMENT SERVICE — /api/payments
| Method & Path | Quyền | Mô tả |
|---|---|---|
| GET /api/payments/banks | User đã xác thực | Danh sách ngân hàng VietQR (BIN, tên, logo); được cache ở Payment Service |
| POST /api/payments/{orderId}/bank-transfer | CUS-owner | Tạo/đọc phiên mới: snapshot ngân hàng, reference riêng, hạn 15 phút không gia hạn; không nhận amount từ client |
| GET /api/payments/{orderId} | CUS/STF/MGR/ADM | Trạng thái thanh toán của đơn |
| POST /api/payments/webhook/sepay | SYS | API Key riêng, lưu receipt/dedup/conflict và tìm candidate contains; ACK sau commit, đối soát/xác nhận chạy bất đồng bộ |
| PUT /api/payments/{id}/confirm-manual | MGR/ADM | Xác nhận thủ công sau đối chiếu sao kê (ghi audit log, bắt buộc ghi lý do) |
| PUT /api/payments/{id}/confirm-cod | STF/MGR/ADM | Staff xác nhận đã thu COD tại quán |
| PUT /api/payments/{id}/refund | ADM/MGR | Đánh dấu đã hoàn tiền sau khi duyệt yêu cầu hoàn |
| GET /api/payments/transactions | ADM/STF/MGR | Read-only, filters/phân trang; Staff/Manager chỉ tiền vào đã phân loại đúng store trong JWT, không xem conflict/unclassified; count/lastReceivedAt cùng scope |
| GET /api/payments/transactions/{receiptId} | ADM/STF/MGR | Chi tiết DTO hạn chế theo ID ổn định từ list; cùng scope, foreign/missing trả 404; không raw payload, subAccount hoặc classification evidence |
| GET /api/payments/bank-config | ADM | accounts[], assignments[], sepayKeyConfigured, reconciliationAvailable=true (khả năng đối soát phiên mới, không chứng minh feed sẵn sàng) |
| GET /api/payments/bank-config/banks | ADM | Danh sách `{name,shortName,code,bin}` từ JSON công khai `https://qr.sepay.vn/banks.json`; không cần/gửi API key SePay |
| POST /api/payments/bank-config | ADM | Tạo account; Details version=0 và header Idempotency-Key UUID |
| PUT /api/payments/bank-config/{id} | ADM | Sửa/ngưng dùng account; Details version đã đọc và Idempotency-Key |
| PUT /api/payments/bank-config/stores/{storeId} | ADM | Gán/ngưng gán: bankAccountId hoặc null, version; Idempotency-Key |

Payment 09/11/2026: đã sửa mã bank-config, intake, QR Customer và đối soát tự động cho phiên mới; **chưa nghiệm thu chức năng**. Các PUT confirm-manual/confirm-cod/refund ở bảng trên vẫn là mục tiêu, chưa mở. Chỉ dùng SePay API Key. [Bàn giao hiện tại](../specs/rbac-branch-operations/P1-live-payment-handoff.md) chốt DTO/guard/events và phần còn khóa; bàn giao ngân hàng/intake là snapshot lịch sử.

VietQR refund recipient: người dùng chọn ngân hàng từ danh sách VietQR public và nhập trực tiếp số tài khoản, tên chủ tài khoản; không dùng API key hay tra cứu server-side. Duyệt refund vẫn không tự chuyển tiền.

Tiền vào 10/11/2026: Entry thêm `classification=UNCLASSIFIED|STORE_ONLY|PAYMENT_CANDIDATE|ALLOCATED`, giữ status tài chính riêng. Staff/Manager chỉ đọc giao dịch vào đã phân loại đúng quán và không conflict; sửa filter storeId khác JWT trả 403, detail ngoài scope/missing trả 404. Admin giữ toàn bộ inbox. `lastReceivedAt` theo scope quyền và store filter, không phải toàn chuỗi cho Staff/Manager. Account chỉ trả maskedAccount; không trả raw webhook/conflict payload, subAccount hay evidence nội bộ. UI `/admin/payments` mở read-only cho Staff/Manager, không tải/mở bank-config. Recovery trước snapshot không thay quyền thu thủ công hoặc mở lại đơn đóng.

- POST/GET payment trả `{id:string,orderId,orderCode,status,expiresAt,reference,bankInfo:{bankName,bankCode,accountNo,accountName},amount,receivedAmount,missingAmount,excessAmount,confirmationPending,canTransfer,closedReason}`. Bốn trường tiền là chuỗi số nguyên VND. GET cho owner, STAFF/MANAGER đúng quán, ADMIN; chưa có phiên live trả 404, legacy không bị tự nâng cấp.
- GET `/api/orders/{id}/payment-session` kiểm tra Customer-owner/BANK_TRANSFER/PENDING_PAYMENT/amount>0, trả `{orderId,orderCode,customerId,storeId,amount,status,paymentMethod,expiresAt}` nhưng không khởi động đồng hồ. POST cùng path khóa Order, đặt deadline duy nhất. Payment chuyển tiếp JWT qua Eureka, kiểm tra bank assignment trước POST, không truy cập DB Order.
- Không key/không ngân hàng active hoặc dependency lỗi trả 503; wrong owner 403, state không hợp lệ/tổng0/legacy/hết hạn khi tạo trả 409. Retry phiên live cũ giữ snapshot/deadline. Error body theo catalog hiện hành.
- Transactions thêm filter `LATE_RECEIPT`; `MATCHED/ALLOCATED` nghĩa đã phân bổ, không đồng nghĩa Order đã xác nhận. Conflict được giữ để Admin kiểm tra, không tự phân bổ khi conflict_count>0. Refund create/approve cho đơn có phiên live trả 501 sau guard quyền/scope, chờ D1–D3.

# 5. PROMOTION & LOYALTY SERVICE — /api/promotions, /api/loyalty

Checkout integration update: when `CATALOG_SERVICE_TOKEN` is empty, Order issues a 60-second internal JWT using its existing signing configuration, with reserved technical subject `Long.MAX_VALUE`, role `INTERNAL_SERVICE`, issuer/audience/iat/exp/sid. An explicitly configured token remains an override requiring rotation. Gateway continues to block Catalog internal routes; customer/admin login tokens are not substituted. Order preview returns `orderValid` separately from `voucherValid`; `orderValid=false` must not enable checkout even if monetary fields are zero.
| Method & Path | Quyền | Mô tả |
|---|---|---|
| GET /api/promotions/vouchers/available | CUS | Voucher khả dụng cho khách |
| POST /api/promotions/vouchers/validate | CUS/SYS | Kiểm tra + tính giảm giá cho 1 đơn (Order Service gọi khi preview/checkout) |
| GET/POST/PUT/DELETE /api/promotions/vouchers | ADM | CRUD voucher toàn chuỗi |
| POST /api/promotions/vouchers/store-proposals | MGR | Manager đề xuất voucher của quán (trạng thái chờ duyệt) |
| PUT /api/promotions/vouchers/{id}/approve | ADM | Duyệt voucher chi nhánh |
| GET /api/promotions/banners | PUB | Banner trang chủ đang hiệu lực |
| POST/PUT/DELETE /api/promotions/banners | ADM | CRUD banner |
| GET /api/loyalty/policy | PUB | Chính sách hiển thị; không chứa thông tin khách hoặc credential |
| GET /api/loyalty/me?page=0&size=10&type=ALL | CUS | Điểm tổng/khả dụng/đang giữ/tích lũy, hạng và lịch sử phân trang của JWT owner |
| POST /internal/loyalty/preview, /reserve | SYS nội bộ | Preview/giữ điểm với version policy và orderId; credential service, không qua Gateway |
| Consumer order.completed / order.cancelled | SYS nội bộ | Redeem+earn / release atomic; thay cho API earn/redeem công khai dự kiến trước đây |
| GET/PUT /api/loyalty/config | ADM | Cấu hình tỉ lệ tích/đổi điểm |

Contract triển khai, vòng đời reservation, error matrix, migration và ranh giới refund: [Loyalty end-to-end](../specs/loyalty-end-to-end.md). Order create hỗ trợ `expectedTotal` để từ chối 409 nếu tổng tiền khác preview đã được khách xác nhận.

# 6. SHIPPING SERVICE — /api/shipping
| Method & Path | Quyền | Mô tả |
|---|---|---|
| POST /api/shipping/calculate-fee | CUS/SYS | Tính phí ship dự kiến theo địa chỉ/khu vực và giá trị đơn |
| Sự kiện order.created (không phải HTTP POST công khai) | Cart & Order → Shipping | DELIVERY tạo một shipment CREATED từ snapshot; PICKUP chỉ lưu receipt no-op |
| GET /api/shipping/shipments/{orderId} | CUS/STF/MGR/ADM | Đọc theo orderId: Customer đúng owner, Staff/Manager đúng store, Admin; chưa có trả 404 RESOURCE_NOT_FOUND |
| PUT /api/shipping/shipments/{id}/assign | MGR/ADM | **Phase 2:** gán shipper |
| PUT /api/shipping/shipments/{id}/status | SHIPPER/MGR | **Phase 2:** shipper cập nhật trạng thái giao |
| GET/PUT /api/shipping/fee-config | ADM | Cấu hình phí ship |

# 7. NOTIFICATION SERVICE — /api/notifications
| Method & Path | Quyền | Mô tả |
|---|---|---|
| GET /api/notifications/my | Đã đăng nhập | Phân trang `page`/`size`, lọc `unread=true` và `type=ORDER/PAYMENT/PROMOTION/SYSTEM`. Chỉ dữ liệu của actor; trả `content,page,size,totalElements,totalPages,unreadCount` (tổng chưa đọc của actor, không phụ thuộc bộ lọc). |
| PUT /api/notifications/{id}/read, /read-all | Đã đăng nhập | Đánh dấu đã đọc |
| (Kafka consumers) | SYS | Nhận order.*, payment.*, promotion.* để tạo in-app notification và gửi email qua Gmail SMTP Mail Sender — không có API public |
| GET /api/notifications/email-logs | ADM/MGR | Tra cứu trạng thái email transactional, không trả secret |
| GET /api/notifications/email-logs/{id} | ADM/MGR | Lịch sử từng lần gửi và failure/DLQ; Manager chỉ quán mình, không OTP/global |
| POST /api/notifications/email-logs/{id}/retry | ADM | `{requestId,expectedGeneration}`; chỉ FAILED an toàn, không OTP/unknown/hết hạn, không sửa recipient/body |

Contract BE-62/BE-63/UI-50 cập nhật 11/11/2026: [Email operations, RBAC, retry và recovery](Email_Operations_2026-11-11.md). Có bộ lọc template; retry kiểm tra nguyên tử, chống request lặp. Đã triển khai không đồng nghĩa đã nghiệm thu.

# 8. REVIEW & REPORT SERVICE — /api/reviews, /api/reports
| Method & Path | Quyền | Mô tả |
|---|---|---|
| GET /api/reviews/products/{productId} | PUB | Đánh giá công khai của món |
| GET /api/reviews/my | CUS | Đánh giá của khách hàng trong JWT đã xác thực |
| POST /api/reviews | CUS | Tạo đánh giá (đơn phải COMPLETED và chứa món đó) |
| PUT/DELETE /api/reviews/{id} | CUS | Sửa/xóa đánh giá của mình |
| POST /api/reviews/{id}/replies | STF/MGR/ADM | Phản hồi đánh giá |
| PUT /api/reviews/{id}/hide | MGR/ADM | Ẩn đánh giá vi phạm (Manager chỉ quán mình) |
| GET /api/reports/dashboard | STF/MGR/ADM | Dashboard theo phạm vi role (ca / quán / toàn chuỗi) |
| GET /api/reports/revenue?storeId=&from=&to= | MGR/ADM | Báo cáo doanh thu (Manager bị ép storeId) |
| GET /api/reports/export?format=xlsx/pdf | MGR/ADM | Xuất báo cáo Excel/PDF |

### Bộ lọc và giới hạn báo cáo BE-42

- Cả dashboard (Manager/Admin), revenue và export nhận `storeId`, `from`, `to` (ISO date, hai đầu mút được tính). Nếu thiếu `to`, dùng ngày hiện tại; nếu thiếu `from`, dùng ngày đầu tháng của `to`. `from > to` hoặc `storeId <= 0` trả 400.
- Dashboard trả thêm `from`/`to` đã áp dụng; `periodRevenue`/`periodOrderCount` dùng cùng phép tính với revenue và file xuất cho cùng bộ lọc. Các trường `today*` luôn phản ánh hôm nay, độc lập với kỳ đã chọn.
- Danh tính/role/store lấy từ JWT đã xác thực, không dùng header `X-User-*`. Manager bị ép quán trong JWT, yêu cầu quán khác hoặc không có quán trả 403; Admin có thể chọn quán hoặc toàn chuỗi. Tên file xuất phản ánh quán và kỳ thực tế.
- STAFF chỉ được đọc `todayOrderCount` của quán mình, `scope=STORE_DAY`, `from=to=hôm nay`; các trường tiền và tổng kỳ trả `null`, không phải 0. Filter ngày khác hôm nay, truy cập revenue/export hoặc quán khác trả 403. CUSTOMER/SHIPPER không được truy cập cả ba API.
- Giới hạn hiện tại: projection `daily_store_stats` chỉ có số liệu ngày/quán, chưa có nguồn tổng kết ca hoặc đơn đang chờ. Không coi `STORE_DAY` là báo cáo ca đã hoàn thành; FR-STF-02 vẫn cần projection/contract ca thật trước khi nghiệm thu đầy đủ. Không suy diễn doanh thu ca từ doanh thu ngày/tháng.

### Contract xác minh đơn cho BE-40

- Review Report gọi `GET /api/internal/orders/{orderId}/verification?customerId={customerId}` của Cart Order qua Eureka (`cart-order-service`), chuyển tiếp Bearer JWT của khách và `X-Correlation-ID`. Gateway không công bố route nội bộ này; không dùng header `X-User-*` để xác định danh tính.
- Cart Order xác thực JWT/role CUSTOMER, buộc `customerId` khớp subject, và chỉ đọc đơn thuộc khách đó. Sai customerId trả 403; không tìm thấy đơn thuộc khách trả 404 theo error contract chung.
- Response: `{id, orderCode, customerId, status, productIds}`. `productIds` là danh sách ID khác nhau từ order item loại PRODUCT, không null; không suy diễn món thành phần của COMBO.
- Review chỉ tạo khi ID đơn/chủ sở hữu khớp, trạng thái COMPLETED và danh sách chứa productId yêu cầu. Response thiếu/sai contract trả 502; timeout/mất kết nối hoặc không có instance trả 503. Không có fallback cho phép tạo review khi chưa xác minh được đơn.
- Mỗi `(customer_id, order_id, product_id)` có tối đa một review đang lưu, kể cả review HIDDEN. Review trùng trả 409. Migration V4 thêm UNIQUE; nếu dữ liệu cũ đã trùng, migration dừng để xử lý thủ công, không tự xóa review/phản hồi.
- Audit vẫn thuộc Audit Service; không tạo entity/bảng audit trong Review Report. Producer audit thuộc phạm vi tích hợp riêng.

### Reply/hide và bàn giao audit BE-41

- Reply chỉ cho STAFF/STORE_MANAGER/ADMIN; hide chỉ STORE_MANAGER/ADMIN. Actor/role/store lấy từ JWT. `GET /api/internal/orders/{orderId}/store` tại Cart Order nhận cùng Bearer JWT, giới hạn STAFF/STORE_MANAGER bằng `storeId` trong JWT và cho ADMIN đọc toàn hệ thống; trả `{orderId, storeId}`. Không có route Gateway cho endpoint nội bộ này.
- Review Report xác minh ID đơn và store từ response; không dùng store mặc định khi lỗi. Không tìm thấy đơn trong scope trả 404, thiếu quyền trả 403, dependency không sẵn sàng trả 503, response sai contract trả 502. ADMIN cũng lấy store thực tế của đối tượng để ghi nhận mutation.
- Lý do hide là tùy chọn, tối đa 500 ký tự; không lưu/phát nội dung tự do này vào audit. Reply content cũng không đi vào audit để tránh lưu secret do người dùng nhập.
- Migration V5 thêm optimistic version cho review: update/hide đồng thời trên phiên bản cũ bị rollback và trả 409, không ghi đè HIDDEN bằng trạng thái cũ. Hide lại một review đã HIDDEN không tạo mutation mới.
- V5 tạo `review_report_service.audit_outbox` để giữ **ý định phát sự kiện**, không phải bảng lịch sử audit. Ghi outbox trong cùng transaction JPA/JDBC với reply/hide; rollback (kể cả optimistic conflict) phải rollback cả outbox.
- Cột `event` chứa envelope `DomainEvent`: eventId/correlationId/eventType=`audit.recorded`/sourceService/occurredAt/payload. Payload có actorId/actorRole/storeId/action/targetType=`REVIEW`/targetId/before/after; hide chỉ ghi status VISIBLE→HIDDEN, reply chỉ ghi replyId. ID và store lấy từ backend, không từ body/header tự khai.
- **Giới hạn bàn giao:** chưa có dispatcher Kafka, consumer Audit hoặc API đọc outbox. INT-48 phải phát/retry giữ nguyên eventId, chỉ đánh dấu/xóa bản ghi sau broker ack bền vững, consumer dedup theo eventId và mở rộng allowlist status/replyId ở Audit. Không coi mutation pending trong outbox là đã xuất hiện tại `/api/audit-logs`; không tự xóa pending event khi chưa bàn giao.

# AUDIT SERVICE — /api/audit-logs
| Method & Path | Quyền | Mô tả |
|---|---|---|
| GET /api/audit-logs | MGR/ADM | Phân trang, lọc actorId/actorRole/sourceService/action/targetType/targetId/storeId/from/to; Admin xem mọi role, Manager chỉ xem thao tác Staff trong quán mình theo RBAC |
| GET /api/audit-logs/export | ADM | Tải `clucky-nhat-ky-quan-tri.xlsx` (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`), cùng bộ lọc danh sách nhưng không giới hạn ở trang hiện tại; tối đa 10.000 bản ghi, vượt trả 413 `REQUEST_TOO_LARGE`. Tiêu đề tiếng Việt, ngày giờ UTC+7, cố định tiêu đề và lọc cột; ID lưu dạng chữ, cột eventId/correlationId ẩn sẵn. Không xuất detail/nội dung tự do/email/thông tin thanh toán; `Cache-Control: no-store` |

Endpoint thuộc Audit Service riêng, frontend gọi qua Gateway, không thuộc `/api/reports`. Backend bắt buộc giới hạn quyền/store trước khi áp dụng bộ lọc. Dữ liệu gồm người/role thực hiện, khâu nghiệp vụ, đối tượng, thay đổi trước–sau đã loại secret và thời gian; không có API cho frontend tạo/sửa/xóa audit. Các backend domain phát sự kiện `audit.recorded` sau thay đổi thành công để Audit Service lưu. Base API đọc đã có mã nguồn trong `backend/audit-service`, chưa kiểm chứng runtime; producer/consumer ghi audit và mở rộng allowlist before/after theo domain vẫn thuộc INT-48. Xem [phạm vi base và kiểm chứng](../../docs/observability.md).


## 9.1. Mail Sender nội bộ

Notification Service gửi email qua Gmail SMTP (`smtp.gmail.com:587`, STARTTLS). Các biến `MAIL_SENDER_*` lấy từ Config Server/environment; `MAIL_SENDER_APP_PASSWORD` không xuất hiện trong request/response API. Email failure chỉ tạo log `FAILED` và retry/DLQ theo cấu hình, không rollback nghiệp vụ chính.


## 9. MEDIA UPLOAD — CLOUDINARY

Các endpoint upload yêu cầu role theo tài nguyên và không trả API secret:

| Endpoint | Quyền | Mô tả |
|---|---|---|
| POST `/api/catalog/products/{id}/image` | ADM | Upload/thay ảnh món, trả `secureUrl`, `publicId` |
| POST `/api/catalog/combos/{id}/image` | ADM | Upload/thay ảnh combo |
| POST `/api/promotions/banners/{id}/image` | ADM | Upload/thay ảnh banner |
| POST `/api/users/me/avatar` | Đã đăng nhập | Upload/thay avatar của chính user |
| DELETE `/api/media/{publicId}` | Nội bộ service | Xóa asset sau khi metadata đã được cập nhật |

Backend validate MIME/size, upload qua Cloudinary, lưu URL/public ID; frontend không được nhận `CLOUDINARY_API_SECRET`.
# Bổ sung S1: phí ship và bán kính (09/11/2026)

- `GET /api/shipping/config`, `PUT /api/shipping/config`: Admin; body PUT `{fee,version}`, fee VND nguyên dương, version hiện tại. Trả `{fee,version}`, fee null khi chưa cấu hình; xung đột 409, không tự áp giá mẫu.
- `PUT /api/stores/{id}/delivery-settings`: Admin hoặc Manager đúng storeId; body `{radiusKm,version}`. radiusKm null để chưa nhận DELIVERY, nếu có phải dương và tối đa hai số lẻ. Store DTO bổ sung deliveryRadiusKm/version. Mọi thay đổi Catalog Store dùng optimistic version.
- `POST /api/shipping/calculate-fee`: `{storeId,latitude,longitude}`; trả `{available,fee,reason,distanceKm,radiusKm,policyVersion}`. Shipping lấy tọa độ/bán kính từ Catalog qua REST/Eureka. available chỉ true khi đủ cấu hình và Haversine distance <= radius. reason: OK, LOCATION_REQUIRED, STORE_LOCATION_MISSING, RADIUS_NOT_CONFIGURED, FEE_NOT_CONFIGURED, OUT_OF_RANGE.
- Order preview bổ sung `shipping` cùng cấu trúc; khi không giao được thì `orderValid=false`, shippingFee/totalAmount=null (không dùng 0 làm giá giả). UNAVAILABLE chỉ lỗi phụ thuộc khi Order gọi Shipping.
- Order create tính lại phí/phạm vi server-side, giữ kiểm tra expectedTotal hiện hữu. PICKUP không gọi Shipping và phí 0. Đơn đã tạo không đổi snapshot phí/QR. Không còn per-km/free-from-amount hoặc fallback cấu hình quán khác trong tính phí mới.
- UI qua Gateway, i18n và các lý do rõ ràng. Không mở shipper/tracking/đối tác vận chuyển.
