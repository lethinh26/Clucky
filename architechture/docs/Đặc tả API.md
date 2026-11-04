# ĐẶC TẢ API (RÚT GỌN)
## Hệ thống website bán hàng thức ăn nhanh

Quy ước chung:
- Base URL qua Gateway: `https://<domain>/api/...` ; mỗi service có tiền tố riêng.
- Xác thực: header `Authorization: Bearer <JWT>` (trừ API công khai và webhook).
- Định dạng: JSON; lỗi trả về `{ timestamp, status, error, code, message, path }`. `code` ổn định từ `contracts/errors.json`; backend giữ message tiếng Anh an toàn, frontend ánh xạ vi/en theo locale, không hiển thị exception thô. HTTP status và bản dịch được sinh từ cùng danh mục; xem `contracts/README.md`.
- Phân trang: `?page=0&size=20&sort=createdAt,desc`.
- Mỗi service công bố OpenAPI tại `/swagger-ui.html` (môi trường dev/demo).
- Frontend Customer (Next.js) và frontend quản trị (React) dùng chung toàn bộ hệ API này; khác biệt chỉ ở giao diện và quyền của role đăng nhập.
- Ký hiệu quyền: PUB = công khai, CUS = Customer, STF = Staff, MGR = Store Manager, ADM = Admin, SYS = hệ thống/webhook.

---

# 1. IDENTITY SERVICE — /api/auth, /api/users
| Method & Path | Quyền | Mô tả |
|---|---|---|
| POST /api/auth/register | PUB | Đăng ký khách hàng, gửi OTP |
| POST /api/auth/verify-otp | PUB | Xác thực OTP đăng ký |
| POST /api/auth/login | PUB | Trả access token trong JSON; refresh token trong cookie HttpOnly |
| POST /api/auth/refresh | Cookie refresh | Rotate refresh token, trả access token mới; không cần Bearer |
| POST /api/auth/logout | Cookie refresh | Thu hồi phiên hiện tại và xóa cookie; không cần Bearer |
| POST /api/auth/forgot-password | PUB | Gửi OTP đặt lại mật khẩu |
| POST /api/auth/reset-password | PUB | Đặt lại mật khẩu bằng OTP |
| POST /api/auth/google | PUB | Đăng nhập Google bằng Firebase ID token — trả JWT nếu user đã tồn tại/link được, hoặc `{status: "REQUIRES_PASSWORD", pendingToken}` nếu là user mới |
| POST /api/auth/google/complete | PUB | Hoàn tất đăng ký Google: `pendingToken` + `password` → tạo user CUSTOMER (bỏ OTP vì Google đã verify email), trả JWT |
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
| POST /api/orders/{id}/refund-requests | CUS | Tạo yêu cầu hoàn tiền |
| PUT /api/refund-requests/{id}/approve, /reject | MGR/ADM | Duyệt/từ chối hoàn tiền |
| POST /api/party-orders | CUS | Gửi form đặt tiệc/đơn lớn |
| GET/PUT /api/party-orders | STF/MGR/ADM | Tiếp nhận, báo giá, cập nhật trạng thái đơn tiệc |

# 4. PAYMENT SERVICE — /api/payments
| Method & Path | Quyền | Mô tả |
|---|---|---|
| POST /api/payments/{orderId}/bank-transfer | CUS/SYS nội bộ | Tạo giao dịch + QR VietQR (số tiền, nội dung = orderCode), trạng thái PENDING |
| GET /api/payments/{orderId} | CUS/STF/MGR/ADM | Trạng thái thanh toán của đơn |
| POST /api/payments/webhook/sepay | SYS | Webhook SePay: kiểm tra chữ ký, đối chiếu, idempotent theo bankTxId |
| POST /api/payments/webhook/casso | SYS | Webhook Casso (phương án thay thế SePay) |
| PUT /api/payments/{id}/confirm-manual | MGR/ADM | Xác nhận thủ công sau đối chiếu sao kê (ghi audit log, bắt buộc ghi lý do) |
| PUT /api/payments/{id}/confirm-cod | STF/MGR/ADM | Staff xác nhận đã thu COD tại quán |
| PUT /api/payments/{id}/refund | ADM/MGR | Đánh dấu đã hoàn tiền sau khi duyệt yêu cầu hoàn |
| GET /api/payments/transactions | ADM/MGR | Danh sách giao dịch ngân hàng đã đối chiếu (Manager chỉ quán mình) |
| GET/PUT /api/payments/bank-config | ADM | Cấu hình tài khoản ngân hàng nhận tiền |

# 5. PROMOTION & LOYALTY SERVICE — /api/promotions, /api/loyalty
| Method & Path | Quyền | Mô tả |
|---|---|---|
| GET /api/promotions/vouchers/available | CUS | Voucher khả dụng cho khách |
| POST /api/promotions/vouchers/validate | CUS/SYS | Kiểm tra + tính giảm giá cho 1 đơn (Order Service gọi khi preview/checkout) |
| GET/POST/PUT/DELETE /api/promotions/vouchers | ADM | CRUD voucher toàn chuỗi |
| POST /api/promotions/vouchers/store-proposals | MGR | Manager đề xuất voucher của quán (trạng thái chờ duyệt) |
| PUT /api/promotions/vouchers/{id}/approve | ADM | Duyệt voucher chi nhánh |
| GET /api/promotions/banners | PUB | Banner trang chủ đang hiệu lực |
| POST/PUT/DELETE /api/promotions/banners | ADM | CRUD banner |
| GET /api/loyalty/me | CUS | Điểm, hạng, lịch sử điểm của tôi |
| POST /api/loyalty/earn, /redeem | SYS nội bộ | Cộng/trừ điểm theo sự kiện đơn (Order/Kafka gọi) |
| GET/PUT /api/loyalty/config | ADM | Cấu hình tỉ lệ tích/đổi điểm |

# 6. SHIPPING SERVICE — /api/shipping
| Method & Path | Quyền | Mô tả |
|---|---|---|
| POST /api/shipping/calculate-fee | CUS/SYS | Tính phí ship dự kiến theo địa chỉ/khu vực và giá trị đơn |
| POST /api/shipping/shipments | SYS nội bộ | Tạo bản ghi giao hàng khi order.created (MVP: status CREATED) |
| GET /api/shipping/shipments/{orderId} | CUS/STF/MGR/ADM | Thông tin giao hàng của đơn |
| PUT /api/shipping/shipments/{id}/assign | MGR/ADM | **Phase 2:** gán shipper |
| PUT /api/shipping/shipments/{id}/status | SHIPPER/MGR | **Phase 2:** shipper cập nhật trạng thái giao |
| GET/PUT /api/shipping/fee-config | ADM | Cấu hình phí ship |

# 7. NOTIFICATION SERVICE — /api/notifications
| Method & Path | Quyền | Mô tả |
|---|---|---|
| GET /api/notifications/my | Đã đăng nhập | Danh sách thông báo của tôi |
| PUT /api/notifications/{id}/read, /read-all | Đã đăng nhập | Đánh dấu đã đọc |
| (Kafka consumers) | SYS | Nhận order.*, payment.*, promotion.* để tạo in-app notification và gửi email qua Gmail SMTP Mail Sender — không có API public |
| GET /api/notifications/email-logs | ADM/MGR | Tra cứu trạng thái email transactional, không trả secret |

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
