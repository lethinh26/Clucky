# KẾ HOẠCH PHÂN CHIA TASK — CLUCKY (6 THÀNH VIÊN)

Phạm vi: đồ án Clucky — website bán hàng thức ăn nhanh chuỗi gà rán. Microservices (8 service + API Gateway) · 2 frontend (Next.js Customer + React Admin).

Timeline: **3 ngày đầu = 100% giao diện · 7 ngày còn lại = 100% chức năng + tích hợp + test**.

Tổng: 10 ngày × 6 thành viên = 60 man-days. **Mỗi thành viên đều có task ở cả 10 ngày; không có ngày trống owner.**

---

## A. PHÂN CHIA 6 THÀNH VIÊN — THEO DOMAIN DỌC (FE + BE CÙNG PHẦN)

Nguyên tắc: **ai làm màn hình của domain nào thì làm luôn backend của domain đó** — trong cả 2 frontend (Next.js + React). Mỗi người sở hữu một lát dọc end-to-end: màn hình ↔ API ↔ database ↔ event.

| # | Domain | Màn hình FE (cả 2 app) | Module BE + hạ tầng | Workload | SP |
|---|--------|----------------------|---------------------|----------|-----|
| **M1 — Trần Nguyễn Hữu Khánh** | **Identity & Auth** | Customer: Login, Register, OTP, Forgot/Reset, Profile, Address book · Admin: Login, Users mgmt | `identity-service` + `config-server` app + `security/` (JWT filter, RBAC, storeId) | ~12 ngày | ~45 |
| **M2 — Nguyễn Duy Quang Nhật** | **Catalog & Store** | Customer: Home, Menu, ProductDetail, Store list · Admin: Catalog (product/category/combo form), Stores, Inventory | `catalog-store-service` + `discovery-server` app | ~12 ngày | ~50 |
| **M3 — Trần Đức Anh** | **Cart & Order** | Customer: Cart, Checkout, Orders, Order tracking, Party order · Admin: Orders mgmt, Staff orders, Refund modal | `cart-order-service` + `api-gateway` app | ~12 ngày | ~50 |
| **M4 — Lê Phú Thịnh** | **BE + FE** | **Payment & Shipping** | Customer: QR thanh toán, trạng thái thanh toán, phí ship, shipment info · Admin: Payments, Webhook log, Bank config, Manual confirm, Refund | `payment-service` + `shipping-service` + `common/` shared lib | ~12 ngày | **60 SP** |
| **M5 — Cao Tất Thành** | **Promotion & Notification** | Customer: Vouchers, Loyalty, Notification list · Admin: Promotions (voucher CRUD/approve), Banners, Notification list | `promotion-loyalty-service` + `notification-service` | ~10 ngày | ~40 |
| **M6 — Mai Sơn Việt ** | **Review & Report + DevOps** | Customer: Review form/list trong product & order · Admin: Dashboard, Reports, Reviews, Audit log | `review-report-service` + `infrastructure/` (Docker Compose, backup, deploy, CI) | ~10 ngày | ~40 |

**Tổng: 207 task hiện tại; Mail Sender được gộp trong Notification Service.** ~275 SP trên 60 man-days.

**Thang Story Point** — chỉ dùng số nguyên tố:

| SP | Ý nghĩa | Ví dụ |
|----|---------|-------|
| **1** | Việc nhỏ, <1h | Sửa text, đổi màu, thêm 1 field DTO |
| **2** | Nửa ngày | 1 component UI đơn, 1 GET endpoint đơn giản |
| **3** | ~1 ngày | 1 màn hình UI, 1 entity + migration + CRUD |
| **5** | 1–2 ngày | Màn hình nhiều state, Kafka consumer + nghiệp vụ |
| **7** | 2–3 ngày | Webhook SePay (signature + idempotent), saga compensation |
| **11** | >3 ngày | Tích hợp FE↔BE cả một module |
| **13** | **Cấm** — phải tách nhỏ | Chỉ dùng để đánh dấu task cần split |

**Quy ước ranh giới giữa các domain trên cùng một màn hình:**
- Trang checkout do M3 — Trần Đức Anh sở hữu khung trang; widget phí ship gọi API của M4 — Lê Phú Thịnh, ô voucher gọi API của M5 — Cao Tất Thành, block QR gọi API của M4 — Lê Phú Thịnh — ranh giới ở API contract, không phải ở pixel.
- Mỗi người viết `config-repo/<service>.yml`, route trong `api-gateway.yml`, Dockerfile, Flyway, Kafka topic **cho service mình sở hữu**. Owner app nền tảng (M1 — Trần Nguyễn Hữu Khánh=config-server, M2 — Nguyễn Duy Quang Nhật=discovery, M3 — Trần Đức Anh=gateway) chỉ review & merge.
- `security/` template (M1 — Trần Nguyễn Hữu Khánh) + `common/` lib (M4 — Lê Phú Thịnh) → mỗi service tự áp dụng vào code của mình.

---

## B. TIMELINE TỔNG QUAN

```
Ngày 1-3: 100% GIAO DIỆN — pixel-perfect theo Brand Guidelines
Ngày 4-6: Backend — entity, migration, service, API của từng domain
Ngày 7-8: Tích hợp — Kafka, SePay webhook, cross-service, FE↔BE
Ngày 9-10: Deploy, test E2E, fix bug, bàn giao
```

---

## C. CHI TIẾT TASK THEO NGÀY

### 🗓 NGÀY 1 — Giao diện (layout + design system + màn hình đơn giản)

Mỗi thành viên làm UI của domain mình; backend owner không đứng ngoài 3 ngày UI đầu.

| ID | Task | PIC | Deliverable |
|----|------|-----|-------------|
| UI-01 | Next.js layout: header, footer, hero, brand tokens | M1 — Trần Nguyễn Hữu Khánh | `app/layout.tsx` + theme CSS |
| UI-02 | React Admin layout: sidebar, header, protected route shell | M2 — Nguyễn Duy Quang Nhật | `src/layouts/AdminLayout.tsx` |
| UI-03 | Config Server app + `config-repo` khung | M1 — Trần Nguyễn Hữu Khánh (mỗi người thêm config service mình) | `config-repo/*.yml` |
| UI-04 | Discovery Server app + Eureka client config mẫu | M2 — Nguyễn Duy Quang Nhật | `discovery-server` app |
| UI-05 | API Gateway app + route khung lb:// | M3 — Trần Đức Anh (mỗi người thêm route service mình) | `api-gateway.yml` |
| UI-06 | Docker Compose: postgres, redis, kafka, healthcheck | M6 — Mai Sơn Việt | `docker-compose.yml` |
| UI-07 | Component lib Customer: Button, Card, Input, Badge, Modal | M1 — Trần Nguyễn Hữu Khánh | `nextjs/components/ui/*` |
| UI-08 | Component lib Admin: Table, Badge, Modal, Form, Drawer | M2 — Nguyễn Duy Quang Nhật | `react/components/ui/*` |
| UI-09 | Auth pages cả 2 app: Login, Register, OTP, Forgot/Reset | M1 — Trần Nguyễn Hữu Khánh | `app/login..`, `react/pages/Login` |
| UI-10 | Home page: banner, category row, món nổi bật | M2 — Nguyễn Duy Quang Nhật | `app/page.tsx` |
| UI-11 | Menu page: category sidebar, product grid, search/filter | M2 — Nguyễn Duy Quang Nhật | `app/menu/page.tsx` |
| UI-12 | Product Detail: ảnh, options, toppings, quantity, giá động | M2 — Nguyễn Duy Quang Nhật | `app/menu/[id]` |
| UI-13 | Store page customer: danh sách quán, giờ mở, trạng thái | M2 — Nguyễn Duy Quang Nhật | `app/stores/page.tsx` |
| UI-14 | Admin Dashboard: stat cards, chart placeholder | M6 — Mai Sơn Việt | `react/pages/Dashboard` |
| UI-15 | Admin Users: table, role badge, lock/unlock, assign-store | M1 — Trần Nguyễn Hữu Khánh | `react/pages/Users` |
| UI-16 | Admin Reviews: list, reply form, hide button | M6 — Mai Sơn Việt | `react/pages/Reviews` |
| UI-43 | Cart + Order visual contract: cart badge, order status chips, order card components | M3 — Trần Đức Anh | Shared FE components |
| UI-44 | Payment + Shipping visual components: QR card, payment state badge, fee/shipment card | M4 — Lê Phú Thịnh | `components/payment/*`, `components/shipping/*` |
| UI-45 | Promotion + Notification visual components: voucher badge, points tier, notification item | M5 — Cao Tất Thành | Shared FE components |

### 🗓 NGÀY 2 — Giao diện (màn hình phức tạp)

| ID | Task | PIC | Deliverable |
|----|------|-----|-------------|
| UI-17 | Cart page: item list, stepper, ghi chú, tổng | M3 — Trần Đức Anh | `app/cart/page.tsx` |
| UI-18 | Checkout page: address, delivery/pickup, voucher, điểm, payment method, summary | M3 — Trần Đức Anh | `app/checkout/page.tsx` |
| UI-19 | Order tracking: status timeline + QR VietQR block | M3 — Trần Đức Anh (M4 — Lê Phú Thịnh cung cấp PaymentWidget) | `app/orders/[id]/page.tsx` + `components/payment/PaymentWidget` |
| UI-20 | Order history + reorder + chi tiết hóa đơn | M3 — Trần Đức Anh | `app/orders/page.tsx` |
| UI-21 | Profile + Address book + đổi mật khẩu | M1 — Trần Nguyễn Hữu Khánh | `app/profile/*` |
| UI-22 | Voucher & Loyalty: voucher khả dụng, điểm, hạng | M5 — Cao Tất Thành | `app/vouchers`, `app/loyalty` |
| UI-23 | Party order form | M3 — Trần Đức Anh | `app/party/page.tsx` |
| UI-24 | Admin Orders: filter tabs, status action, refund modal, drawer | M3 — Trần Đức Anh | `react/pages/Orders` |
| UI-25 | Admin Catalog: product form (ảnh, options, toppings) | M2 — Nguyễn Duy Quang Nhật | `react/pages/Catalog/ProductForm` |
| UI-26 | Admin Stores: list + CRUD + giờ mở/khu vực giao | M2 — Nguyễn Duy Quang Nhật | `react/pages/Stores` |
| UI-27 | Admin Payments: transactions, webhook log, bank config, manual confirm | M4 — Lê Phú Thịnh | `react/pages/Payments` |
| UI-28 | Admin Promotions: voucher form, duyệt proposal, banners | M5 — Cao Tất Thành | `react/pages/Promotions` |
| UI-29 | Admin Reports: date picker, store filter, export, chart | M6 — Mai Sơn Việt | `react/pages/Reports` |
| UI-30 | Staff Orders: đơn hôm nay, status buttons, COD confirm | M3 — Trần Đức Anh | `react/pages/Staff/Orders` |
| UI-31 | Staff Inventory: tồn kho, cảnh báo sắp hết, update | M2 — Nguyễn Duy Quang Nhật | `react/pages/Staff/Inventory` |
| UI-32 | Notification list cả 2 app: badge, mark-read, type icon | M5 — Cao Tất Thành | notification component |

### 🗓 NGÀY 3 — Giao diện (polish + freeze)

| ID | Task | PIC | Deliverable |
|----|------|-----|-------------|
| UI-33 | Responsive check 360→1440px, mỗi người màn hình mình | Cả nhóm | Fix layout |
| UI-34 | Brand audit: màu, font, bo góc, tỉ lệ 65-25-10 | Cả nhóm | Brand checklist |
| UI-35 | Polish: hover, transition, skeleton, empty states | Cả nhóm | Micro-interactions |
| UI-36 | Accessibility: contrast, aria-label, keyboard nav | Cả nhóm | A11y fixes |
| UI-37 | Typecheck + lint sạch: nextjs (M1 — Trần Nguyễn Hữu Khánh), react (M2 — Nguyễn Duy Quang Nhật) | M1 — Trần Nguyễn Hữu Khánh+M2 — Nguyễn Duy Quang Nhật | `tsc --noEmit`, `eslint` |
| UI-38 | Cross-check toàn bộ trang không console error | Cả nhóm | Page audit |
| UI-39 | Dockerfile cho 2 frontend | M6 — Mai Sơn Việt | `frontend/*/Dockerfile` |
| UI-40 | Verify Dockerfile + build 11 module backend | Cả nhóm (mỗi người module mình) | Build OK |
| UI-41 | CI script: build + lint | M6 — Mai Sơn Việt | `scripts/check.sh` |
| UI-42 | Design freeze — review với team | Cả nhóm | Sign-off |
| UI-46 | Order domain responsive/a11y pass: Cart, Checkout, Orders, Staff Orders | M3 — Trần Đức Anh | Domain UI checklist |
| UI-47 | Payment/Shipping responsive/a11y pass: QR, payment admin, shipment widget | M4 — Lê Phú Thịnh | Domain UI checklist |
| UI-48 | Promotion/Notification responsive/a11y pass: voucher, loyalty, notifications | M5 — Cao Tất Thành | Domain UI checklist |

### 🗓 NGÀY 4 — Backend: entity + migration + shared platform

| ID | Task | PIC | Deliverable |
|----|------|-----|-------------|
| BE-01 | Identity entity + Flyway V1 (users, addresses, refresh_tokens, otp_codes, shifts, staff_schedules) | M1 — Trần Nguyễn Hữu Khánh | `identity-db` migration |
| BE-02 | Catalog entity + Flyway V1 (stores..store_inventory) | M2 — Nguyễn Duy Quang Nhật | `catalog-db` migration |
| BE-03 | Order entity + Flyway V1 (orders, items, history, refunds, party) | M3 — Trần Đức Anh | `order-db` migration |
| BE-04 | Payment entity + Flyway V1 (payments, bank_tx, webhook_logs, config) | M4 — Lê Phú Thịnh | `payment-db` migration |
| BE-05 | Promotion entity + Flyway V1 (vouchers, usages, banners, points, config) | M5 — Cao Tất Thành | `promotion-db` migration |
| BE-06 | Shipping entity + Flyway V1 (shipments, history, fee_config) | M4 — Lê Phú Thịnh | `shipping-db` migration |
| BE-07 | Notification entity + Flyway V1 (notifications, email_logs) | M5 — Cao Tất Thành | `notification-db` migration |
| BE-08 | Review entity + Flyway V1 (reviews, replies, daily_stats, audit_logs) | M6 — Mai Sơn Việt | `review-db` migration |
| BE-09 | Security/JWT template: filter, RBAC, storeId | M1 — Trần Nguyễn Hữu Khánh (mỗi service tự áp dụng) | `security/` shared |
| BE-10 | Shared lib: ApiResponse, ErrorResponse, PageResponse | M4 — Lê Phú Thịnh | `common/` module |
| BE-11 | Kafka config: topics, producer/consumer factory | M6 — Mai Sơn Việt | `KafkaConfig` template |
| BE-12 | Redis config: template, TTL policy | M6 — Mai Sơn Việt | `RedisConfig` template |
| BE-13 | OpenAPI/Swagger config template | M4 — Lê Phú Thịnh (mỗi service áp dụng) | `springdoc` config |
| BE-14 | Global exception handler template | M4 — Lê Phú Thịnh (mỗi service áp dụng) | `GlobalExceptionHandler` |
| BE-15 | Health + info + correlation-id filter | M4 — Lê Phú Thịnh | `CorrelationIdFilter` |

| BE-56 | Notification email schema: email_logs, mail_templates, mail_deliveries | M5 — Cao Tất Thành | `notification-db` migration |
| BE-57 | Mail Sender configuration properties + Config Server env mapping | M5 — Cao Tất Thành | `MAIL_SENDER_*` config |
| BE-58 | Mail Sender interface + Gmail SMTP adapter boundary | M5 — Cao Tất Thành | `MailSender` adapter |

| BE-68 | Cloudinary config properties + Config Server env mapping | M2 — Nguyễn Duy Quang Nhật+M5 — Cao Tất Thành | `CLOUDINARY_*` config |
| BE-69 | Media metadata migration: image_public_id/avatar_public_id | M1 — Trần Nguyễn Hữu Khánh+M2 — Nguyễn Duy Quang Nhật+M5 — Cao Tất Thành | Flyway updates |

### 🗓 NGÀY 5 — Backend: Identity + Catalog + Order API

| ID | Task | PIC | Deliverable |
|----|------|-----|-------------|
| BE-16 | Auth: register + OTP + verify | M1 — Trần Nguyễn Hữu Khánh | `POST /api/auth/register`, `verify-otp` |
| BE-17 | Auth: login + JWT + refresh + logout + forgot/reset | M1 — Trần Nguyễn Hữu Khánh | `/login`, `/refresh`, `/logout`, `/forgot`, `/reset` |
| BE-18 | User: profile + address book CRUD | M1 — Trần Nguyễn Hữu Khánh | `GET/PUT /api/users/me`, `/addresses` |
| BE-19 | User admin: create staff, lock/unlock, assign-store, schedules | M1 — Trần Nguyễn Hữu Khánh | `POST /api/users/staff`, `/lock`, `/assign-store`, `/schedules` |
| BE-20 | Catalog public: stores, categories, products, combos, search | M2 — Nguyễn Duy Quang Nhật | `GET /api/stores`, `/api/catalog/*` |
| BE-21 | Catalog admin: CRUD stores/categories/products/combos/toppings | M2 — Nguyễn Duy Quang Nhật | `POST/PUT/DELETE /api/catalog/*` |
| BE-22 | Availability toggle + inventory | M2 — Nguyễn Duy Quang Nhật | `PUT availability`, `GET/PUT inventory` |
| BE-23 | Cart Redis CRUD (guest session + customer) | M3 — Trần Đức Anh | `GET/POST/PUT/DELETE /api/cart` |
| BE-24 | Order preview (gọi Promotion + Shipping nội bộ) | M3 — Trần Đức Anh | `POST /api/orders/preview` |
| BE-25 | Order create + status transitions + confirm | M3 — Trần Đức Anh | `POST /api/orders`, `PUT /status` |
| BE-26 | Order cancel + reject + refund-request | M3 — Trần Đức Anh | `PUT /cancel`, `/reject`, `POST /refund-requests` |
| BE-27 | Order list my/admin (storeId filter) + detail + reorder | M3 — Trần Đức Anh | `GET /api/orders*` |
| BE-28 | Party order create + quản lý tiếp nhận | M3 — Trần Đức Anh | `POST/GET/PUT /api/party-orders` |
| BE-50 | Payment API contract: payment DTO, QR response, payment status enum | M4 — Lê Phú Thịnh | Payment contract + DTO |
| BE-51 | Promotion API contract: voucher validation/loyalty DTOs and error cases | M5 — Cao Tất Thành | Promotion contract + DTO |
| BE-52 | Notification API skeleton: notification DTO, pagination, read-state contract | M6 — Mai Sơn Việt | Notification contract + DTO |

| BE-59 | Email message DTO: recipient, template, variables, eventId, correlationId | M5 — Cao Tất Thành | Email command contract |
| BE-60 | Gmail SMTP connection with STARTTLS and timeout | M5 — Cao Tất Thành | SMTP sender |
| BE-61 | Email template renderer for transactional templates | M5 — Cao Tất Thành | Template renderer |
| BE-62 | Email log/status persistence and idempotency by eventId/messageId | M5 — Cao Tất Thành | Email persistence |
| BE-63 | Admin email-log API with recipient/status/template/date filters | M6 — Mai Sơn Việt | `GET /api/notifications/email-logs` |

| BE-70 | Cloudinary adapter: upload, replace, delete asset operations | M2 — Nguyễn Duy Quang Nhật | `CloudinaryMediaAdapter` |
| BE-71 | Signed upload/secure backend upload contract and MIME/size validation | M2 — Nguyễn Duy Quang Nhật | Media upload contract |
| BE-72 | Product/combo media API | M2 — Nguyễn Duy Quang Nhật | Catalog media endpoints |
| BE-73 | Avatar/banner media API | M1 — Trần Nguyễn Hữu Khánh+M5 — Cao Tất Thành | Identity/Promotion media endpoints |

### 🗓 NGÀY 6 — Backend: Payment + Shipping + Promotion + Notification + Review

| ID | Task | PIC | Deliverable |
|----|------|-----|-------------|
| BE-29 | Payment: tạo bank-transfer + QR VietQR (PENDING, expires) | M4 — Lê Phú Thịnh | `POST /api/payments/{orderId}/bank-transfer` |
| BE-30 | Payment: webhook SePay (raw-body signature, match code+amount, idempotent) | M4 — Lê Phú Thịnh | `POST /api/payments/webhook/sepay` |
| BE-31 | Payment: webhook Casso | M4 — Lê Phú Thịnh | `POST /api/payments/webhook/casso` |
| BE-32 | Payment: confirm-manual, confirm-cod, refund, transactions, bank-config | M4 — Lê Phú Thịnh | `PUT confirm-*`, `/refund`, `/transactions`, `bank-config` |
| BE-33 | Shipping: calculate-fee + get shipment + fee-config | M4 — Lê Phú Thịnh | `POST /calculate-fee`, `GET /shipments/{orderId}`, `fee-config` |
| BE-34 | Promotion: voucher validate + CRUD + scope ALL/STORE | M5 — Cao Tất Thành | `POST validate`, CRUD vouchers |
| BE-35 | Promotion: store-proposals + approve | M5 — Cao Tất Thành | `POST proposals`, `PUT /{id}/approve` |
| BE-36 | Promotion: banner CRUD | M5 — Cao Tất Thành | `/api/promotions/banners` |
| BE-37 | Loyalty: points, tier, earn/redeem, config | M5 — Cao Tất Thành | `/api/loyalty/*` |
| BE-38 | Notification: my notifications, read, read-all | M5 — Cao Tất Thành | `GET/PUT /api/notifications` |
| BE-39 | Notification: Kafka consumers + email adapter | M5 — Cao Tất Thành | `@KafkaListener`, `EmailService` |
| BE-40 | Review: create/edit/delete own + product reviews | M6 — Mai Sơn Việt | `POST/PUT/DELETE /api/reviews`, `GET products/{id}` |
| BE-41 | Review: replies + hide | M6 — Mai Sơn Việt | `POST /replies`, `PUT /{id}/hide` |
| BE-42 | Report: dashboard per role + revenue + export Excel/PDF | M6 — Mai Sơn Việt | `GET /api/reports/*` |
| BE-43 | Audit log: record + query | M6 — Mai Sơn Việt | `AuditLog` + `GET /api/reports/audit-logs` |
| BE-55 | Order lifecycle hardening: status transition validation and optimistic locking | M3 — Trần Đức Anh | Order state tests + concurrency guard |
| BE-53 | Identity integration hardening: refresh-token rotation, OTP TTL, auth error contract | M1 — Trần Nguyễn Hữu Khánh | Identity integration tests |
| BE-54 | Catalog integration hardening: menu cache invalidation and store availability contract | M2 — Nguyễn Duy Quang Nhật | Catalog integration tests |
| BE-44 | Payment status query + ownership: customer chỉ xem payment của order mình | M4 — Lê Phú Thịnh | `GET /api/payments/{orderId}` |
| BE-45 | Bank transaction reconciliation detail + mismatch workflow | M4 — Lê Phú Thịnh | `GET /api/payments/transactions/{id}`, mismatch handling |
| BE-46 | Refund state machine: PENDING → APPROVED/REJECTED → REFUNDED | M4 — Lê Phú Thịnh | Refund service + status transitions |
| BE-47 | Shipping shipment detail + status history | M4 — Lê Phú Thịnh | `GET /api/shipping/shipments/{orderId}` + history |
| BE-48 | Shipping fee rules: base fee, per-km, free threshold, store override | M4 — Lê Phú Thịnh | `shipping_fee_config` + calculation tests |
| BE-49 | Payment/Shipping OpenAPI examples + webhook payload schemas | M4 — Lê Phú Thịnh | Swagger examples + contract docs |

| BE-64 | OTP email templates: register, verify, forgot/reset password | M5 — Cao Tất Thành | Auth email templates |
| BE-65 | Order/payment/refund email templates | M5 — Cao Tất Thành | Business email templates |
| BE-66 | Mail retry/backoff policy and FAILED state handling | M5 — Cao Tất Thành | Retry service |
| BE-67 | Email failure event/DLQ and masked error logging | M6 — Mai Sơn Việt | DLQ + observability |

| BE-74 | Cloudinary failure handling, cleanup and idempotency | M2 — Nguyễn Duy Quang Nhật+M6 — Mai Sơn Việt | Media failure policy |
| BE-75 | Media URL/public_id response DTO and secret masking | M4 — Lê Phú Thịnh | Shared media DTO |

### 🗓 NGÀY 7 — Tích hợp: Kafka + cross-service

| ID | Task | PIC | Deliverable |
|----|------|-----|-------------|
| INT-35 | Order → Promotion: validate voucher/điểm khi preview+checkout | M3 — Trần Đức Anh+M5 — Cao Tất Thành | Internal call |
| INT-36 | Order → Catalog: kiểm tra giá + availability | M3 — Trần Đức Anh+M2 — Nguyễn Duy Quang Nhật | Internal call |
| INT-37 | Order → Payment: tạo payment request | M3 — Trần Đức Anh+M4 — Lê Phú Thịnh | Internal call |
| INT-38 | Order → Shipping: tính phí ship | M3 — Trần Đức Anh+M4 — Lê Phú Thịnh | Internal call |
| INT-39 | Kafka producer: order.created/status-changed/completed/cancelled | M3 — Trần Đức Anh | `KafkaTemplate` |
| INT-40 | Kafka producer: payment.confirmed/failed | M4 — Lê Phú Thịnh | `KafkaTemplate` |
| INT-41 | Kafka producer: promotion.approved | M5 — Cao Tất Thành | `KafkaTemplate` |
| INT-42 | Consumer: notification nhận mọi event (order.*, payment.*, promotion.*) | M5 — Cao Tất Thành | `@KafkaListener` |
| INT-43 | Consumer: shipping tạo bản ghi khi order.created | M4 — Lê Phú Thịnh | `@KafkaListener` |
| INT-44 | Consumer: promotion cộng điểm khi order.completed | M5 — Cao Tất Thành | `@KafkaListener` |
| INT-45 | Consumer: report cập nhật daily_store_stats | M6 — Mai Sơn Việt | `@KafkaListener` |
| INT-46 | DLQ + retry + idempotent consumer | M6 — Mai Sơn Việt | `DefaultErrorHandler` |
| INT-47 | Saga: payment.failed → cancel order → release voucher/điểm | M3 — Trần Đức Anh+M4 — Lê Phú Thịnh +M5 — Cao Tất Thành | Event chain |
| INT-48 | Audit log consumer cho thao tác quản trị | M6 — Mai Sơn Việt | `audit_logs` |
| INT-49 | SePay webhook test: mock → verify → match → confirm | M4 — Lê Phú Thịnh | Integration test |
| INT-50 | Payment timeout: QR expires → order/payment expired → notify customer | M4 — Lê Phú Thịnh+M3 — Trần Đức Anh+M5 — Cao Tất Thành | Expiry worker + event flow |
| INT-51 | COD lifecycle: confirm at branch → collected → completed | M4 — Lê Phú Thịnh+M3 — Trần Đức Anh | COD integration |
| INT-52 | Refund integration: Manager approve → Payment mark refund → Customer notification | M4 — Lê Phú Thịnh+M3 — Trần Đức Anh+M5 — Cao Tất Thành | Refund event flow |
| INT-53 | Identity → Gateway security integration: JWT claims, role, storeId propagation | M1 — Trần Nguyễn Hữu Khánh+M3 — Trần Đức Anh | Security integration |
| INT-54 | Catalog → Gateway discovery integration: menu route, cache headers, availability | M2 — Nguyễn Duy Quang Nhật+M3 — Trần Đức Anh | Discovery integration |

| INT-55 | Identity → Notification: OTP email event contract | M1 — Trần Nguyễn Hữu Khánh+M5 — Cao Tất Thành | OTP email event |
| INT-56 | Order → Notification: order created/status/completed/cancelled email events | M3 — Trần Đức Anh+M5 — Cao Tất Thành | Order email events |
| INT-57 | Payment → Notification: paid/failed/mismatch/expired/refund email events | M4 — Lê Phú Thịnh+M5 — Cao Tất Thành | Payment email events |
| INT-58 | Promotion → Notification: promotion email event contract | M5 — Cao Tất Thành | Promotion email event |
| INT-59 | Notification email consumer idempotency + Kafka replay protection | M5 — Cao Tất Thành | Consumer tests |
| INT-60 | Email delivery metrics/logging correlation across services | M6 — Mai Sơn Việt | Correlation observability |

| INT-01 | Catalog → Cloudinary product/combo upload integration | M2 — Nguyễn Duy Quang Nhật | Catalog media flow |
| INT-02 | Promotion → Cloudinary banner upload integration | M5 — Cao Tất Thành | Banner media flow |
| INT-03 | Identity → Cloudinary avatar upload integration | M1 — Trần Nguyễn Hữu Khánh | Avatar media flow |
| INT-04 | Replace/delete old asset only after metadata commit | M2 — Nguyễn Duy Quang Nhật+M6 — Mai Sơn Việt | Cleanup flow |

### 🗓 NGÀY 8 — Tích hợp: Frontend ↔ Backend (mỗi người domain mình)

| ID | Task | PIC | Deliverable |
|----|------|-----|-------------|
| INT-05 | Auth E2E: register → OTP → login → refresh, 2 app | M1 — Trần Nguyễn Hữu Khánh | Auth flow works |
| INT-06 | Menu/catalog E2E: browse, search, availability theo quán | M2 — Nguyễn Duy Quang Nhật | Browse works |
| INT-07 | Cart → checkout → tạo đơn E2E | M3 — Trần Đức Anh | Order flow works |
| INT-08 | Order tracking, history, cancel, reorder E2E | M3 — Trần Đức Anh | Order mgmt works |
| INT-09 | Payment: QR hiển thị, webhook → CONFIRMED, COD confirm | M4 — Lê Phú Thịnh | Payment flow works |
| INT-10 | Voucher apply + loyalty points E2E | M5 — Cao Tất Thành | Promotion works |
| INT-11 | Notification list + mark-read E2E | M5 — Cao Tất Thành | Notification works |
| INT-12 | Review: viết/sửa/xóa + reply + hide E2E | M6 — Mai Sơn Việt | Review works |
| INT-13 | Report/dashboard/export E2E | M6 — Mai Sơn Việt | Report works |
| INT-14 | Admin orders: status, refund approve E2E | M3 — Trần Đức Anh | Admin order works |
| INT-15 | Admin catalog/store/inventory E2E | M2 — Nguyễn Duy Quang Nhật | Catalog admin works |
| INT-61 | Admin users: create staff, lock, assign E2E | M1 — Trần Nguyễn Hữu Khánh | User admin works |
| INT-62 | Admin promotions/banners E2E | M5 — Cao Tất Thành | Promotion admin works |
| INT-63 | Admin payments/bank config E2E | M4 — Lê Phú Thịnh | Payment admin works |
| INT-64 | Payment status UI: pending/paid/expired/mismatch/refund states | M4 — Lê Phú Thịnh | Payment state UI |
| INT-65 | Shipping fee + shipment info UI integration | M4 — Lê Phú Thịnh | Shipping widget works |
| INT-66 | Admin refund approval + payment reconciliation E2E | M4 — Lê Phú Thịnh+M3 — Trần Đức Anh | Refund/reconcile works |
| INT-67 | RBAC E2E: storeId enforcement từng API | M1 — Trần Nguyễn Hữu Khánh lead, cả nhóm verify service mình | 403 test |
| INT-68 | Order status realtime (polling) cho customer | M3 — Trần Đức Anh | Live tracking |

| INT-69 | Customer auth UI: email sent/sending/failure states | M1 — Trần Nguyễn Hữu Khánh | Auth email UX |
| INT-70 | Customer order/payment UI: email notification status where applicable | M3 — Trần Đức Anh+M4 — Lê Phú Thịnh | Customer email UX |
| INT-71 | Admin email-log screen: filter, detail, retry failed email | M6 — Mai Sơn Việt | Admin email logs |

| INT-72 | Customer/Admin image upload preview, progress and failure UI | M1 — Trần Nguyễn Hữu Khánh+M2 — Nguyễn Duy Quang Nhật+M5 — Cao Tất Thành | Media upload UX |
| INT-73 | Admin product/combo/banner media management UI | M2 — Nguyễn Duy Quang Nhật+M5 — Cao Tất Thành | Media admin UI |

### 🗓 NGÀY 9 — Test + fix

| ID | Task | PIC | Deliverable |
|----|------|-----|-------------|
| TEST-01 | E2E Guest→register→OTP→browse→cart→COD order | M1 — Trần Nguyễn Hữu Khánh+M2 — Nguyễn Duy Quang Nhật+M3 — Trần Đức Anh | COD verified |
| TEST-02 | E2E transfer→webhook→CONFIRMED | M3 — Trần Đức Anh+M4 — Lê Phú Thịnh | Bank flow verified |
| TEST-03 | E2E cancel→refund request→approve→refunded | M3 — Trần Đức Anh+M4 — Lê Phú Thịnh | Refund verified |
| TEST-04 | E2E Staff: login→dashboard→process→COD confirm | M1 — Trần Nguyễn Hữu Khánh+M3 — Trần Đức Anh | Staff verified |
| TEST-05 | E2E Manager: create staff→assign→reports | M1 — Trần Nguyễn Hữu Khánh+M2 — Nguyễn Duy Quang Nhật+M6 — Mai Sơn Việt | Manager verified |
| TEST-06 | E2E Admin: store→product→voucher→approve | M2 — Nguyễn Duy Quang Nhật+M5 — Cao Tất Thành | Admin verified |
| TEST-07 | RBAC: Staff A không gọi được dữ liệu quán B | M1 — Trần Nguyễn Hữu Khánh lead | Security test |
| TEST-08 | Idempotency: webhook replay không duplicate | M4 — Lê Phú Thịnh | Idempotent verified |
| TEST-09 | Payment mismatch: wrong code/amount → MISMATCH + manual flow | M4 — Lê Phú Thịnh | Mismatch verified |
| TEST-10 | QR expiry: expired payment cannot confirm order | M4 — Lê Phú Thịnh+M3 — Trần Đức Anh | Expiry verified |
| TEST-11 | Refund: approve/reject/refunded state transitions | M4 — Lê Phú Thịnh+M3 — Trần Đức Anh | Refund verified |
| TEST-12 | Shipping fee rules: pickup/free threshold/store override | M4 — Lê Phú Thịnh | Fee verified |
| TEST-13 | Performance: menu <500ms (Redis cache) | M2 — Nguyễn Duy Quang Nhật | Cache verified |
| TEST-14 | Load test 50 concurrent orders | M6 — Mai Sơn Việt | Load report |
| TEST-15 | Unit test critical paths mỗi service | Cả nhóm | Coverage |
| TEST-16 | Integration test Kafka + cross-service | M6 — Mai Sơn Việt | Test suite |
| TEST-17 | Responsive test toàn bộ | Cả nhóm | UI report |
| TEST-18 | Bug fix critical+high | Cả nhóm | Fix list |

| TEST-19 | Gmail SMTP success with valid App Password | M5 — Cao Tất Thành+M6 — Mai Sơn Việt | SMTP test |
| TEST-20 | Invalid App Password/timeout → retry then FAILED | M5 — Cao Tất Thành+M6 — Mai Sơn Việt | Failure test |
| TEST-21 | Kafka replay does not send duplicate email | M5 — Cao Tất Thành | Idempotency test |
| TEST-22 | OTP/order/payment/refund email E2E flows | M1 — Trần Nguyễn Hữu Khánh+M3 — Trần Đức Anh+M4 — Lê Phú Thịnh+M5 — Cao Tất Thành | Email E2E |
| TEST-23 | Email failure does not rollback order/payment | M3 — Trần Đức Anh+M4 — Lê Phú Thịnh+M5 — Cao Tất Thành | Failure isolation test |
| TEST-24 | Secret masking: App Password absent from logs/API | M6 — Mai Sơn Việt | Security test |

| TEST-25 | Cloudinary valid image upload and URL/public_id persistence | M2 — Nguyễn Duy Quang Nhật | Media integration test |
| TEST-26 | Invalid MIME/oversize upload rejected | M2 — Nguyễn Duy Quang Nhật | Media validation test |
| TEST-27 | Cloudinary outage does not corrupt product/banner/avatar transaction | M2 — Nguyễn Duy Quang Nhật+M6 — Mai Sơn Việt | Failure isolation test |
| TEST-28 | API secret absent from frontend, response and logs | M1 — Trần Nguyễn Hữu Khánh+M6 — Mai Sơn Việt | Media security test |

### 🗓 NGÀY 10 — Deploy + bàn giao

| ID | Task | PIC | Deliverable |
|----|------|-----|-------------|
| DEP-01 | VPS setup: Docker + Compose + mở port | M6 — Mai Sơn Việt | VPS ready |
| DEP-02 | `docker compose up -d` toàn bộ stack | M6 — Mai Sơn Việt | Running |
| DEP-03 | Nginx reverse proxy + HTTPS Let's Encrypt | M6 — Mai Sơn Việt | HTTPS |
| DEP-04 | Domain + CORS + trusted origins | M6 — Mai Sơn Việt | Domain works |
| DEP-05 | Health check mọi container | M6 — Mai Sơn Việt | `compose ps` |
| DEP-06 | Smoke test VPS: login, menu, COD, transfer | Cả nhóm | Smoke pass |
| DEP-07 | Backup script daily, giữ 7 bản | M6 — Mai Sơn Việt | `scripts/backup.sh` |
| DEP-08 | README final: run, arch, API | M6 — Mai Sơn Việt | `README.md` |
| DEP-09 | Postman collection: mỗi người export service mình, M6 — Mai Sơn Việt merge | Cả nhóm (M6 — Mai Sơn Việt merge) | `postman/` |
| DEP-10 | Demo materials: script + screenshots + slides | M1 — Trần Nguyễn Hữu Khánh+M2 — Nguyễn Duy Quang Nhật | Presentation |
| DEP-11 | Final review + tag release | Cả nhóm | Release |
| DEP-12 | Handover: credentials, .env, rollback | M6 — Mai Sơn Việt | Handover doc |
| DEP-13 | Auth smoke test + identity runbook | M1 — Trần Nguyễn Hữu Khánh | Auth runbook |
| DEP-14 | Catalog smoke test + menu seed/runbook | M2 — Nguyễn Duy Quang Nhật | Catalog runbook |
| DEP-15 | Gateway route/discovery smoke test + API collection merge | M3 — Trần Đức Anh | Gateway runbook |
| DEP-16 | Payment/Shipping smoke test + webhook/rollback runbook | M4 — Lê Phú Thịnh | Payment runbook |
| DEP-17 | Promotion/Notification smoke test + event runbook | M5 — Cao Tất Thành | Event runbook |

| DEP-18 | Add Mail Sender variables to `.env.example` and Config Server runbook | M6 — Mai Sơn Việt | Env/runbook |
| DEP-19 | Gmail App Password setup and rotation documentation | M6 — Mai Sơn Việt | Mail Sender runbook |
| DEP-20 | Production email smoke test and email_logs backup verification | M6 — Mai Sơn Việt | Deployment evidence |

| DEP-21 | Cloudinary `.env` and Config Server setup runbook | M6 — Mai Sơn Việt | Media runbook |
| DEP-22 | Media backup/cleanup verification and production smoke test | M6 — Mai Sơn Việt | Media deployment evidence |

---

## D. TÓM TẮT THEO NGƯỜI

### M1 — Trần Nguyễn Hữu Khánh — Nguyễn Duy Quang Nhật — Identity & Auth
- **FE:** layout Next.js + component lib + Login/Register/OTP/Forgot/Profile/Address (customer) + Login/Users (admin)
- **BE:** identity-service (auth JWT, OTP, users, addresses, schedules) + config-server app + security/JWT template

### M2 — Nguyễn Duy Quang Nhật — Trần Đức Anh — Catalog & Store
- **FE:** layout React + component lib + Home/Menu/ProductDetail/Stores (customer) + Catalog/Stores/Inventory (admin)
- **BE:** catalog-store-service (products, combos, stores, availability, inventory) + discovery-server app

### M3 — Trần Đức Anh — Cart & Order
- **FE:** Cart/Checkout/Orders/Tracking/Party (customer) + Orders/Staff/Refund (admin)
- **BE:** cart-order-service (cart Redis, orders, saga, refund, party) + api-gateway app

### M4 — Lê Phú Thịnh — Payment & Shipping
- **FE:** QR VietQR + phí ship/shipment info (customer) + Payments/Webhook/Bank config (admin)
- **BE:** payment-service (VietQR, SePay/Casso, COD, refund, reconcile) + shipping-service (fee, shipment) + common shared lib

### M5 — Cao Tất Thành — Promotion & Notification
- **FE:** Vouchers/Loyalty/Notifications (customer) + Promotions/Banners (admin)
- **BE:** promotion-loyalty-service (voucher, banner, points, tier) + notification-service (consumers, email, in-app)

### M6 — Mai Sơn Việt — Review & Report + DevOps
- **FE:** Review UI (customer) + Dashboard/Reports/Reviews/Audit (admin)
- **BE:** review-report-service (reviews, replies, stats, export, audit) + Docker Compose, backup, deploy, CI, Kafka/Redis infra config

---

## E. RỦI RO & GIẢM THIỂU

| Rủi ro | Ảnh hưởng | Giảm thiểu |
|--------|-----------|------------|
| 3 ngày UI quá ngắn | Chậm backend | Ngày 3 design freeze tuyệt đối |
| Ranh giới domain trên trang chung (checkout, tracking) | Chồng code giữa các người | Ranh giới ở API contract: chủ trang own khung, widget gọi API domain khác |
| Kafka phức tạp | Event flow lỗi | Saga test sớm, DLQ + correlation-id từ đầu |
| SePay webhook | Chưa test được thật | Mock webhook + verify signature local trước |
| 10 ngày ngắn | Phải cắt | MVP: auth, menu, cart, checkout, payment, orders, admin |
| VPS 8GB | Thiếu RAM cho 11 service + Kafka | JVM heap tuning, Kafka single-node |

---

## F. DEFINITION OF DONE

1. Code compile/build không lỗi
2. API trả đúng response (Postman/curl)
3. Migration chạy đúng PostgreSQL
4. FE render đúng + gọi được API qua Gateway
5. Kafka event produce/consume đúng
6. RBAC enforced (cross-store 403)
7. Không console error trên FE
8. Đã review bởi ≥1 thành viên khác
9. Đã merge nhánh chính

---

## G. GHI CHÚ

- **PIC để trống** khi import Lark — gán sau.
- Sprint mapping: Ngày 1-3 = Sprint 1 (UI), Ngày 4-7 = Sprint 2 (BE+tích hợp), Ngày 8-10 = Sprint 3 (E2E+deploy).
- Sau khi duyệt file này → soạn `TASK-DETAILS.md` theo mẫu `TASK-DETAIL-SAMPLE.md` cho toàn bộ task, rồi import Lark.


> Chi tiết từng task nằm trong `tasks/`, mỗi task một file; PIC/Story Point lấy nguyên từ bảng task này.


## MAIL SENDER — quyết định bổ sung

Mail Sender nằm trong Notification Service, không tạo service/database riêng. MVP dùng Gmail SMTP (`smtp.gmail.com:587`, STARTTLS) với App Password của sender account qua environment/Config Server:

- `MAIL_SENDER_ENABLED=false` mặc định
- `MAIL_SENDER_HOST=smtp.gmail.com`
- `MAIL_SENDER_PORT=587`
- `MAIL_SENDER_USERNAME`
- `MAIL_SENDER_APP_PASSWORD`
- `MAIL_SENDER_FROM_NAME=Clucky`
- `MAIL_SENDER_TIMEOUT_MS=8000`
- `MAIL_SENDER_MAX_RETRIES=3`

Email failure ghi `email_logs` và retry hữu hạn; không rollback order/payment. Không dùng Gmail OAuth2/IMAP và không lưu App Password trong database/log/Git. Các task Notification hiện tại bao gồm phần Mail Sender này.


## MAIL SENDER — Notification Service

Mail Sender không tạo service riêng. Notification Service gửi email transactional bằng Gmail SMTP STARTTLS (`smtp.gmail.com:587`) với Gmail App Password từ Config Server/environment. Biến: `MAIL_SENDER_ENABLED`, `MAIL_SENDER_HOST`, `MAIL_SENDER_PORT`, `MAIL_SENDER_USERNAME`, `MAIL_SENDER_APP_PASSWORD`, `MAIL_SENDER_FROM_NAME`, `MAIL_SENDER_TIMEOUT_MS`, `MAIL_SENDER_MAX_RETRIES`. App Password không lưu DB/log/Git; email lỗi ghi `email_logs`, retry hữu hạn và không rollback order/payment.
