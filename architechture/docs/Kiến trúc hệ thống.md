# THIẾT KẾ KIẾN TRÚC HỆ THỐNG
## Hệ thống website bán hàng thức ăn nhanh — Microservices

| Hạng mục | Nội dung |
|---|---|
| Phiên bản | 2.0 — 23/10/2026 |
| Frontend | Customer: Next.js (App Router, TypeScript) • Quản trị (Staff/Manager/Admin): React SPA (TypeScript, Vite) |
| Backend | Spring Boot 3, Spring Cloud Gateway, Java 17+ |
| Dữ liệu | PostgreSQL (mỗi service 1 schema/database), Redis, Apache Kafka |
| Triển khai | Docker + Docker Compose trên VPS, Nginx reverse proxy, HTTPS Let's Encrypt. **Không dùng Kubernetes** |

---

# 1. TỔNG QUAN KIẾN TRÚC
Hệ thống theo kiến trúc microservices: cả hai frontend (Next.js cho khách hàng, React cho quản trị) đều gọi duy nhất qua API Gateway; Gateway định tuyến tới các backend service; các service giao tiếp đồng bộ bằng REST (khi cần dữ liệu ngay) và bất đồng bộ bằng sự kiện Kafka (khi là hệ quả của một nghiệp vụ: in-app/email notification, cộng điểm, tạo bản ghi giao hàng, báo cáo).

Nguyên tắc:
- Mỗi service sở hữu dữ liệu riêng, không service nào truy cập trực tiếp database của service khác.
- Phân quyền RBAC tại Gateway (kiểm tra JWT) và tại từng service (@PreAuthorize + kiểm tra storeId).
- Mọi sự kiện nghiệp vụ quan trọng đều có correlation-id để truy vết xuyên service.

# 2. DANH SÁCH 8 MICROSERVICE CHÍNH (+ API GATEWAY)
Hệ thống có đúng **8 microservice nghiệp vụ chính** theo danh sách dưới đây. API Gateway là thành phần hạ tầng ở tầng truy cập (định tuyến, xác thực) và không tính vào 8 service. Chia nhỏ hơn nữa sẽ thành monolith phân mảnh; chia to hơn (13-15 service) vượt quá sức đồ án và nặng VPS.

| # | Service | Trách nhiệm chính | Database | Port nội bộ (gợi ý) |
|---|---|---|---|---|
| — | **API Gateway** (hạ tầng) | Định tuyến, kiểm tra JWT, rate limit, CORS, log request | — | 8080 |
| 1 | **Identity Service** | Tài khoản Customer/Staff/Manager/Admin/Shipper, RBAC, gán chi nhánh, hồ sơ, sổ địa chỉ, OTP, audit đăng nhập | identity_db | 8081 |
| 2 | **Catalog & Store Service** | Chi nhánh, danh mục, món, combo, topping, giá gốc, menu theo chi nhánh, tình trạng còn/hết, kho cơ bản | catalog_db | 8082 |
| 3 | **Cart & Order Service** | Giỏ hàng (Redis), tạo đơn, trạng thái đơn, hủy đơn, lịch sử, đặt lại đơn | order_db (+ Redis) | 8083 |
| 4 | **Payment Service** | VietQR, webhook SePay/Casso (idempotent, kiểm tra chữ ký), COD, đối chiếu, hoàn tiền | payment_db | 8084 |
| 5 | **Promotion & Loyalty Service** | Voucher, khuyến mãi, banner, tích/đổi điểm, hạng thành viên | promotion_db | 8085 |
| 6 | **Shipping Service** | MVP: tạo và lưu bản ghi giao hàng, tính phí ship dự kiến, trạng thái CREATED. Phase 2: gán shipper, tracking | shipping_db | 8086 |
| 7 | **Notification Service** | Consumer Kafka: Mail Sender Gmail SMTP + thông báo in-app, lưu lịch sử thông báo | notification_db | 8087 |
| 8 | **Review & Report Service** | Đánh giá/bình luận, ẩn/phản hồi đánh giá, dashboard, báo cáo doanh thu, xuất Excel/PDF, audit log nghiệp vụ | review_db | 8088 |

Service gộp có chủ đích:
- Store gộp vào Catalog vì menu theo chi nhánh và tình trạng món theo chi nhánh luôn truy vấn cùng nhau.
- Cart gộp vào Order vì giỏ là tiền thân trực tiếp của đơn và dùng chung logic tính giá.
- Review gộp Report vì đều là dữ liệu đọc/tổng hợp, ngoài luồng giao dịch chính.

# 3. GIAO TIẾP GIỮA CÁC SERVICE
## 3.1. Đồng bộ (REST, qua Gateway hoặc nội bộ)
| Luồng | Mô tả |
|---|---|
| Next.js → Gateway → Identity | Đăng nhập, lấy thông tin user, kiểm tra quyền |
| Checkout: Order → Promotion | Tính voucher/điểm áp dụng cho đơn |
| Checkout: Order → Catalog | Kiểm tra giá và tình trạng bán tại chi nhánh |
| Checkout: Order → Payment | Tạo yêu cầu thanh toán / QR VietQR |
| Admin/Manager → Report | Truy vấn dashboard/báo cáo (đọc tổng hợp) |

## 3.3. Mail Sender trong Notification Service

Mail Sender là adapter nội bộ của Notification Service, không phải service thứ chín. MVP dùng Gmail SMTP (`smtp.gmail.com:587`, STARTTLS) với App Password của sender account. Cấu hình lấy từ Config Server/environment: `MAIL_SENDER_ENABLED`, `MAIL_SENDER_HOST`, `MAIL_SENDER_PORT`, `MAIL_SENDER_USERNAME`, `MAIL_SENDER_APP_PASSWORD`, `MAIL_SENDER_FROM_NAME`, `MAIL_SENDER_TIMEOUT_MS`, `MAIL_SENDER_MAX_RETRIES`. App Password không lưu trong PostgreSQL, không log plaintext và không commit Git. Email failure ghi `email_logs`, retry hữu hạn và không rollback nghiệp vụ chính.

## 3.2. Bất đồng bộ (Kafka)
| Topic | Producer | Consumer | Mục đích |
|---|---|---|---|
| order.created | Cart & Order | Notification, Shipping, Review & Report | Báo đơn mới, tạo bản ghi giao hàng, cập nhật thống kê |
| order.status-changed | Cart & Order | Notification, Review & Report | Báo khách khi đơn đổi trạng thái, mở đánh giá khi COMPLETED |
| payment.confirmed | Payment | Cart & Order, Notification, Promotion | Chuyển đơn sang CONFIRMED, báo khách, chuẩn bị cộng điểm |
| payment.failed | Payment | Cart & Order, Notification | Xử lý hết hạn / sai lệch thanh toán |
| order.completed | Cart & Order | Promotion, Review & Report | Cộng điểm tích lũy, tổng hợp doanh thu |
| order.cancelled | Cart & Order | Promotion, Payment, Notification | Hoàn lượt voucher/điểm, tạo yêu cầu hoàn tiền nếu đã PAID |
| promotion.approved | Promotion | Notification, Catalog & Store | Kích hoạt khuyến mãi của chi nhánh sau khi Admin duyệt |

Xử lý lỗi Kafka: consumer idempotent theo event-id; dùng Dead Letter Topic cho sự kiện xử lý thất bại sau số lần retry cấu hình; trạng thái đơn là nguồn sự thật (source of truth), sự kiện chỉ là hệ quả.

# 4. REDIS — CÁC TRƯỜNG HỢP SỬ DỤNG
| Key pattern | Mục đích | TTL gợi ý |
|---|---|---|
| cart:{userId} / cart:guest:{sessionId} | Giỏ hàng | 7 ngày / 24 giờ |
| menu:store:{storeId} | Cache menu theo chi nhánh | 5-15 phút, xóa khi Admin/Staff đổi tình trạng món |
| otp:{emailOrPhone} | Mã OTP đăng ký/quên mật khẩu | 5 phút |
| auth:google:pending:{token} | `pendingToken` đăng ký Google (uid + email + name chờ nhập password) | 10 phút |
| payment:pending:{orderCode} | Trạng thái chờ thanh toán | Bằng thời hạn QR (ví dụ 15 phút) |
| rate-limit:{ip/user} | Giới hạn request | Theo cửa sổ cấu hình |

# 5. BẢO MẬT
- Mật khẩu băm BCrypt (strength 10-12). Access token JWT 15-30 phút, refresh token 7 ngày (lưu httpOnly cookie hoặc store an toàn phía client).
- JWT chứa: sub (userId), role, storeId (với Staff/Manager). Mọi service tự kiểm tra storeId khi truy cập dữ liệu chi nhánh — không tin frontend.
- Webhook SePay/Casso: kiểm tra chữ ký/token bí mật + whitelist IP, idempotency theo mã giao dịch ngân hàng (bank transaction id duy nhất).
- Secrets (DB password, JWT secret, API key SePay/Casso) đặt trong file .env trên VPS, không commit lên Git.
- HTTPS bắt buộc ở Nginx; HSTS, CORS chỉ cho phép domain frontend.

## 5.1. Ghi chú triển khai đối soát SePay (Payment Service)
- Đối chiếu đơn bằng trường **code** của SePay: nội dung chuyển khoản chứa mã đơn (order_code) do hệ thống sinh; Payment Service trích mã đơn từ giao dịch để khớp đơn.
- Chữ ký HMAC phải tính trên **bytes gốc của request body** (raw body), không tính trên dữ liệu JSON đã parse/format lại — sai lệch một byte là chữ ký không khớp.
- Webhook phải trả về `{"success": true}` với HTTP 200 hoặc 201 trong vòng **8 giây**; xử lý nặng (gửi thông báo, cộng điểm) đẩy qua Kafka để webhook đáp ứng nhanh.
- Thông tin ngân hàng/SePay trong tài liệu hướng dẫn triển khai (BIN, số tài khoản ví dụ) chỉ là placeholder — khi chạy thật phải thay bằng tài khoản demo/thật của nhóm và không commit secrets lên Git.

# 6. TRIỂN KHAI DOCKER COMPOSE TRÊN VPS
## 6.1. Danh sách container (khoảng 15)
nextjs-customer-frontend, react-admin-frontend, api-gateway, identity-service, catalog-service, order-service, payment-service, promotion-service, shipping-service, notification-service, report-service, postgres, redis, kafka, nginx.

## 6.2. Mạng và dữ liệu
- Một Docker network nội bộ (app-net); chỉ Nginx (80/443) và frontend/gateway theo thiết kế mới public ra Internet, database/Redis/Kafka không mở port ra ngoài.
- Volume: postgres-data, redis-data, kafka-data, media-files (ảnh món/banner), nginx logs, backup.
- Mỗi backend service: restart: unless-stopped, healthcheck bằng /actuator/health, depends_on theo điều kiện healthy của postgres/kafka/redis.

## 6.3. Quy trình deploy
1. Chuẩn bị VPS (Ubuntu 22.04+, Docker + Docker Compose plugin, mở port 80/443/22).
2. Clone source, tạo file .env từ .env.example, điền secrets và thông tin ngân hàng/SePay-Casso.
3. docker compose build → docker compose up -d.
4. Trỏ domain về VPS, cấu hình Nginx reverse proxy → frontend/gateway, cấp chứng chỉ Let's Encrypt (certbot).
5. Kiểm tra healthcheck toàn bộ service, chạy checklist smoke-test (đăng nhập, xem menu, đặt đơn COD, đặt đơn chuyển khoản).
6. Bật cron backup PostgreSQL hằng ngày vào thư mục backup (giữ 7 bản).

## 6.4. Tài nguyên khuyến nghị
VPS tối thiểu cho đồ án/demo: 4 vCPU, 8 GB RAM, 60 GB SSD. Nếu RAM hạn chế: giảm heap JVM mỗi service (-Xmx256m…512m), dùng chung 1 instance PostgreSQL với nhiều schema như Mục 2.

# 7. QUYẾT ĐỊNH KIẾN TRÚC (ADR RÚT GỌN)
| Quyết định | Lý do | Đánh đổi |
|---|---|---|
| Gộp Store vào Catalog, Cart vào Order, Review vào Report | Giữ số service ở mức tối thiểu hợp lý (9), giảm chi phí vận hành VPS | Service lớn hơn một chút; tách lại được khi Phase 2 cần |
| Shipping là service riêng dù MVP chưa vận hành | Phase 2 kích hoạt không phải refactor Order Service | Thêm 1 container nhẹ trong MVP |
| Đối soát thanh toán qua SePay/Casso thay vì tự đọc sao kê | Có webhook thời gian thực, đúng yêu cầu không giả lập, chi phí thấp cho đồ án | Phụ thuộc bên thứ ba; có phương án xác nhận thủ công dự phòng |
| Sự kiện Kafka thay cho gọi REST nối chuỗi | Tách luồng giao dịch khỏi thông báo/báo cáo/điểm; chịu lỗi tốt hơn | Cần idempotency và DLQ, độ phức tạp cao hơn REST thuần |
| Không Kubernetes, chỉ Docker Compose | Đủ cho 1 VPS, dễ demo và bảo trì trong phạm vi đồ án | Không tự scale ngang đa node |


## 8. CLOUDINARY — MEDIA STORAGE

Cloudinary là external media provider, không phải microservice/container. Catalog & Store upload ảnh món/combo; Promotion & Loyalty upload banner; Identity upload avatar. Service sở hữu metadata (`secure_url`, `public_id`, width/height nếu cần). Frontend không nhận `CLOUDINARY_API_SECRET`; upload dùng backend/signed parameters có thời hạn.

```env
CLOUDINARY_ENABLED=false
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=clucky
```

Asset upload/thay thế/xóa phải idempotent và không làm rollback order/payment. Asset cũ cần cleanup sau khi metadata mới đã commit.
