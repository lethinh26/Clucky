# ĐẶC TẢ API (RÚT GỌN)
## Hệ thống website bán hàng thức ăn nhanh

Quy ước chung:
- Base URL qua Gateway: `https://<domain>/api/...` ; mỗi service có tiền tố riêng.
- Xác thực: header `Authorization: Bearer <JWT>` (trừ API công khai và webhook).
- Định dạng: JSON; lỗi trả về `{ timestamp, status, error, message, path }`.
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
| POST /api/auth/login | PUB | Đăng nhập, trả access + refresh token (JWT chứa role, storeId) |
| POST /api/auth/refresh | PUB | Làm mới access token |
| POST /api/auth/logout | CUS/STF/MGR/ADM | Đăng xuất, thu hồi refresh token |
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
| POST /api/reviews | CUS | Tạo đánh giá (đơn phải COMPLETED và chứa món đó) |
| PUT/DELETE /api/reviews/{id} | CUS | Sửa/xóa đánh giá của mình |
| POST /api/reviews/{id}/replies | STF/MGR/ADM | Phản hồi đánh giá |
| PUT /api/reviews/{id}/hide | MGR/ADM | Ẩn đánh giá vi phạm (Manager chỉ quán mình) |
| GET /api/reports/dashboard | STF/MGR/ADM | Dashboard theo phạm vi role (ca / quán / toàn chuỗi) |
| GET /api/reports/revenue?storeId=&from=&to= | MGR/ADM | Báo cáo doanh thu (Manager bị ép storeId) |
| GET /api/reports/export?format=xlsx/pdf | MGR/ADM | Xuất báo cáo Excel/PDF |
| GET /api/reports/audit-logs | MGR/ADM | Tra cứu audit log theo phạm vi |


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
