# Clucky — task detail hiện hành

**184 task độc lập**, mỗi task một PIC; **37 DONE** được giữ. 48 ID đã gộp/bỏ record trùng được giữ dưới dạng trang chuyển hướng để truy vết.

- Sprint 1: 26/10–01/11/2026 — 65 task (37 DONE).
- Sprint 2: giữ khung 02–08/11/2026 — 94 task; hoàn tất 05/11, Sprint Review 06/11, không xếp triển khai/nghiệm thu sang 06–08/11.
- Backlog chưa gán sprint: 25 task.
- Deadline: 23:59 ngày đến hạn, Asia/Ho_Chi_Minh (UTC+7).
- Lark là nơi cập nhật trạng thái làm việc; metadata trạng thái trong file là snapshot lúc đồng bộ.
- Người phụ trách tự kiểm chứng; việc sửa tài liệu không đồng nghĩa đã test ứng dụng.

[Kế hoạch chi tiết](../TASK-PLAN.md) · [Ước lượng/lịch mới 01/11](https://github.com/lethinh26/Clucky/blob/2cc31a09689e718fb49d2d0a80f5813057547c17/architechture/plans/BACKLOG-ESTIMATES-2026-11-01.json) · [Snapshot lịch sử 30/10](https://github.com/lethinh26/Clucky/blob/2cc31a09689e718fb49d2d0a80f5813057547c17/architechture/plans/BACKLOG-REPLAN-2026-10-30.json)

Bản 01/11 đã đồng bộ ước lượng/lịch trên 184 record và giữ 184 file detail mới nhất (đã gỡ file cũ khỏi task theo yêu cầu bổ sung); đã đọc lại trường và tải lại nội dung để đối chiếu. Bảng bên dưới giữ nhóm kế hoạch 30/10; 28 thay đổi nhóm trên Lark không bị ghi đè, xem [báo cáo đồng bộ](https://github.com/lethinh26/Clucky/blob/2cc31a09689e718fb49d2d0a80f5813057547c17/architechture/plans/LARK-SYNC-2026-11-01.json). Trên Lark đã xóa cột Remaining Estimate và Estimate Notes theo yêu cầu, không tự tạo lại; các giá trị trong bảng cục bộ chỉ để tham chiếu. SP không quy đổi ra giờ; estimate DONE là hồi cứu, không phải actual. Remaining (*) của TO DO tạm bằng estimate vì chưa có tiến độ mới; PIC cần xác nhận. Không thu thập giờ khả dụng. [Quy ước và tổng tải](../../docs/backlog.md#quy-ước-ước-lượng).

## SPRINT 1

| ID | Task | PIC | Trạng thái | Deadline | SP | Time Estimated (h) | Remaining (h)* |
|---|---|---|---|---|---:|---:|---:|
| [UI-01](UI-01.md) | Next.js layout: header, footer, hero, brand tokens | Trần Nguyễn Hữu Khánh | DONE | 26/10/2026 23:59 | 3 | 6 | 0 |
| [UI-02](UI-02.md) | React Admin layout: sidebar, header, protected route shell | Nguyễn Duy Quang Nhật | DONE | 26/10/2026 23:59 | 3 | 6 | 0 |
| [UI-03](UI-03.md) | Config Server app + `config-repo` khung | Trần Nguyễn Hữu Khánh | DONE | 26/10/2026 23:59 | 2 | 3 | 0 |
| [UI-04](UI-04.md) | Discovery Server app + Eureka client config mẫu | Nguyễn Duy Quang Nhật | DONE | 26/10/2026 23:59 | 1 | 2 | 0 |
| [UI-05](UI-05.md) | API Gateway app + route khung lb:// | Trần Đức Anh | DONE | 26/10/2026 23:59 | 2 | 3 | 0 |
| [UI-06](UI-06.md) | Docker Compose: postgres, redis, kafka, healthcheck | Mai Sơn Việt | DONE | 26/10/2026 23:59 | 5 | 6 | 0 |
| [UI-07](UI-07.md) | Component lib Customer: Button, Card, Input, Badge, Modal | Trần Nguyễn Hữu Khánh | DONE | 26/10/2026 23:59 | 3 | 6 | 0 |
| [UI-08](UI-08.md) | Component lib Admin: Table, Badge, Modal, Form, Drawer | Nguyễn Duy Quang Nhật | DONE | 26/10/2026 23:59 | 5 | 8 | 0 |
| [UI-09](UI-09.md) | Auth pages cả 2 app: Login, Register, OTP, Forgot/Reset | Trần Nguyễn Hữu Khánh | DONE | 26/10/2026 23:59 | 5 | 10 | 0 |
| [UI-10](UI-10.md) | Home page: banner, category row, món nổi bật | Nguyễn Duy Quang Nhật | DONE | 26/10/2026 23:59 | 3 | 4 | 0 |
| [UI-11](UI-11.md) | Menu page: category sidebar, product grid, search/filter | Nguyễn Duy Quang Nhật | DONE | 26/10/2026 23:59 | 3 | 6 | 0 |
| [UI-12](UI-12.md) | Product Detail: ảnh, options, toppings, quantity, giá động | Nguyễn Duy Quang Nhật | DONE | 26/10/2026 23:59 | 5 | 8 | 0 |
| [UI-13](UI-13.md) | Store page customer: danh sách quán, giờ mở, trạng thái | Nguyễn Duy Quang Nhật | DONE | 26/10/2026 23:59 | 2 | 3 | 0 |
| [UI-14](UI-14.md) | Admin Dashboard: stat cards, chart placeholder | Mai Sơn Việt | DONE | 26/10/2026 23:59 | 2 | 3 | 0 |
| [UI-15](UI-15.md) | Admin Users: table, role badge, lock/unlock, assign-store | Trần Nguyễn Hữu Khánh | DONE | 26/10/2026 23:59 | 3 | 5 | 0 |
| [UI-16](UI-16.md) | Admin Reviews: list, reply form, hide button | Mai Sơn Việt | DONE | 26/10/2026 23:59 | 3 | 4 | 0 |
| [UI-17](UI-17.md) | Cart page: item list, stepper, ghi chú, tổng | Trần Đức Anh | DONE | 27/10/2026 23:59 | 3 | 5 | 0 |
| [UI-18](UI-18.md) | Checkout page: address, delivery/pickup, voucher, điểm, payment method, summary | Trần Đức Anh | DONE | 27/10/2026 23:59 | 5 | 8 | 0 |
| [UI-19](UI-19.md) | Order tracking: status timeline + QR VietQR block | Trần Đức Anh | DONE | 27/10/2026 23:59 | 3 | 5 | 0 |
| [UI-20](UI-20.md) | Order history + reorder + chi tiết hóa đơn | Trần Đức Anh | DONE | 27/10/2026 23:59 | 3 | 6 | 0 |
| [UI-21](UI-21.md) | Profile + Address book + đổi mật khẩu | Trần Nguyễn Hữu Khánh | DONE | 27/10/2026 23:59 | 5 | 8 | 0 |
| [UI-22](UI-22.md) | Voucher & Loyalty: voucher khả dụng, điểm, hạng | Cao Tất Thành | TO DO | 30/10/2026 23:59 | 3 | 5 | 5 |
| [UI-23](UI-23.md) | Party order form | Trần Đức Anh | DONE | 27/10/2026 23:59 | 2 | 3 | 0 |
| [UI-24](UI-24.md) | Admin Orders: filter tabs, status action, refund modal, drawer | Trần Đức Anh | DONE | 27/10/2026 23:59 | 5 | 8 | 0 |
| [UI-25](UI-25.md) | Admin Catalog: product form (ảnh, options, toppings) | Nguyễn Duy Quang Nhật | DONE | 27/10/2026 23:59 | 5 | 10 | 0 |
| [UI-26](UI-26.md) | Admin Stores: list + CRUD + giờ mở/khu vực giao | Nguyễn Duy Quang Nhật | DONE | 27/10/2026 23:59 | 3 | 6 | 0 |
| [UI-27](UI-27.md) | Admin Payments: transactions, webhook log, bank config, manual confirm | Lê Phú Thịnh | DONE | 27/10/2026 23:59 | 5 | 8 | 0 |
| [UI-28](UI-28.md) | Admin Promotions: voucher form, duyệt proposal, banners | Cao Tất Thành | TO DO | 31/10/2026 23:59 | 5 | 8 | 8 |
| [UI-29](UI-29.md) | Admin Reports: date picker, store filter, export, chart | Mai Sơn Việt | DONE | 27/10/2026 23:59 | 3 | 6 | 0 |
| [UI-30](UI-30.md) | Staff Orders: đơn hôm nay, status buttons, COD confirm | Trần Đức Anh | DONE | 27/10/2026 23:59 | 3 | 5 | 0 |
| [UI-31](UI-31.md) | Staff Inventory: tồn kho, cảnh báo sắp hết, update | Nguyễn Duy Quang Nhật | DONE | 27/10/2026 23:59 | 3 | 4 | 0 |
| [UI-32](UI-32.md) | Notification list cả 2 app: badge, mark-read, type icon | Cao Tất Thành | TO DO | 31/10/2026 23:59 | 3 | 5 | 5 |
| [UI-34](UI-34.md) | Kiểm tra UI chung: brand, responsive, accessibility, lint/typecheck, trạng thái và design review | Trần Nguyễn Hữu Khánh | TO DO | 01/11/2026 23:59 | 8 | 14 | 14 |
| [UI-39](UI-39.md) | Dockerfile cho 2 frontend | Mai Sơn Việt | DONE | 28/10/2026 23:59 | 3 | 4 | 0 |
| [UI-40](UI-40.md) | Verify Dockerfile + build 11 module backend | Mai Sơn Việt | DONE | 28/10/2026 23:59 | 5 | 8 | 0 |
| [UI-41](UI-41.md) | CI script: build + lint | Mai Sơn Việt | DONE | 28/10/2026 23:59 | 3 | 4 | 0 |
| [UI-43](UI-43.md) | Cart + Order visual contract: cart badge, order status chips, order card components | Trần Đức Anh | DONE | 26/10/2026 23:59 | 2 | 3 | 0 |
| [UI-44](UI-44.md) | Payment + Shipping visual components: QR card, payment state badge, fee/shipment card | Lê Phú Thịnh | DONE | 26/10/2026 23:59 | 2 | 3 | 0 |
| [UI-45](UI-45.md) | Promotion + Notification visual components: voucher badge, points tier, notification item | Cao Tất Thành | TO DO | 30/10/2026 23:59 | 2 | 3 | 3 |
| [UI-46](UI-46.md) | Order domain responsive/a11y pass: Cart, Checkout, Orders, Staff Orders | Trần Đức Anh | DONE | 28/10/2026 23:59 | 3 | 4 | 0 |
| [UI-47](UI-47.md) | Payment/Shipping responsive/a11y pass: QR, payment admin, shipment widget | Lê Phú Thịnh | DONE | 28/10/2026 23:59 | 3 | 4 | 0 |
| [UI-48](UI-48.md) | Promotion/Notification responsive/a11y pass: voucher, loyalty, notifications | Cao Tất Thành | TO DO | 01/11/2026 23:59 | 3 | 4 | 4 |
| [UI-49](UI-49.md) | Nút "Đăng nhập bằng Google" + màn nhập mật khẩu sau khi Google xác thực (customer app only) | Lê Phú Thịnh | DONE | 27/10/2026 23:59 | 5 | 6 | 0 |
| [BE-01](BE-01.md) | Ánh xạ entity/repository vào schema hiện có — Identity | Trần Nguyễn Hữu Khánh | TO DO | 30/10/2026 23:59 | 3 | 6 | 6 |
| [BE-02](BE-02.md) | Ánh xạ entity/repository vào schema hiện có — Catalog & Store | Nguyễn Duy Quang Nhật | TO DO | 30/10/2026 23:59 | 5 | 8 | 8 |
| [BE-03](BE-03.md) | Ánh xạ entity/repository vào schema hiện có — Cart & Order | Trần Đức Anh | TO DO | 30/10/2026 23:59 | 3 | 6 | 6 |
| [BE-04](BE-04.md) | Ánh xạ entity/repository vào schema hiện có — Payment | Lê Phú Thịnh | TO DO | 30/10/2026 23:59 | 3 | 5 | 5 |
| [BE-05](BE-05.md) | Ánh xạ entity/repository vào schema hiện có — Promotion & Loyalty | Cao Tất Thành | TO DO | 01/11/2026 23:59 | 3 | 6 | 6 |
| [BE-06](BE-06.md) | Ánh xạ entity/repository vào schema hiện có — Shipping | Lê Phú Thịnh | TO DO | 30/10/2026 23:59 | 2 | 3 | 3 |
| [BE-07](BE-07.md) | Ánh xạ entity/repository vào schema hiện có — Notification | Cao Tất Thành | TO DO | 01/11/2026 23:59 | 3 | 5 | 5 |
| [BE-08](BE-08.md) | Ánh xạ entity/repository vào schema hiện có — Review & Report | Mai Sơn Việt | TO DO | 31/10/2026 23:59 | 3 | 5 | 5 |
| [BE-09](BE-09.md) | Security/JWT template: filter, RBAC, storeId | Trần Nguyễn Hữu Khánh | TO DO | 31/10/2026 23:59 | 8 | 12 | 12 |
| [BE-10](BE-10.md) | Chuẩn response/error và global exception handler | Lê Phú Thịnh | TO DO | 30/10/2026 23:59 | 3 | 5 | 5 |
| [BE-11](BE-11.md) | Kafka config: topics, producer/consumer factory | Mai Sơn Việt | TO DO | 30/10/2026 23:59 | 5 | 6 | 6 |
| [BE-12](BE-12.md) | Redis config: template, TTL policy | Mai Sơn Việt | TO DO | 30/10/2026 23:59 | 2 | 3 | 3 |
| [BE-13](BE-13.md) | OpenAPI/Swagger config template | Lê Phú Thịnh | TO DO | 31/10/2026 23:59 | 1 | 2 | 2 |
| [BE-15](BE-15.md) | Health + info + correlation-id filter | Lê Phú Thịnh | TO DO | 01/11/2026 23:59 | 3 | 4 | 4 |
| [BE-20](BE-20.md) | Catalog public: stores, categories, products, combos, search | Nguyễn Duy Quang Nhật | TO DO | 01/11/2026 23:59 | 5 | 10 | 10 |
| [BE-23](BE-23.md) | Cart Redis CRUD (guest session + customer) | Trần Đức Anh | TO DO | 01/11/2026 23:59 | 5 | 8 | 8 |
| [BE-50](BE-50.md) | Payment API contract: payment DTO, QR response, payment status enum | Lê Phú Thịnh | TO DO | 31/10/2026 23:59 | 2 | 3 | 3 |
| [BE-51](BE-51.md) | Promotion API contract: voucher validation/loyalty DTOs and error cases | Cao Tất Thành | TO DO | 01/11/2026 23:59 | 3 | 4 | 4 |
| [BE-52](BE-52.md) | Notification API skeleton: notification DTO, pagination, read-state contract | Mai Sơn Việt | TO DO | 31/10/2026 23:59 | 2 | 3 | 3 |
| [BE-57](BE-57.md) | Mail Sender configuration properties + Config Server env mapping | Cao Tất Thành | TO DO | 01/11/2026 23:59 | 3 | 4 | 4 |
| [BE-59](BE-59.md) | Email message DTO: recipient, template, variables, eventId, correlationId | Cao Tất Thành | TO DO | 01/11/2026 23:59 | 2 | 3 | 3 |
| [BE-68](BE-68.md) | Cloudinary config properties + Config Server env mapping | Nguyễn Duy Quang Nhật | TO DO | 30/10/2026 23:59 | 2 | 3 | 3 |

## SPRINT 2

| ID | Task | PIC | Trạng thái | Deadline | SP | Time Estimated (h) | Remaining (h)* |
|---|---|---|---|---|---:|---:|---:|
| [BE-16](BE-16.md) | Auth: register + OTP + verify | Trần Nguyễn Hữu Khánh | TO DO | 03/11/2026 23:59 | 8 | 12 | 12 |
| [BE-17](BE-17.md) | Auth: login + JWT + refresh + logout + forgot/reset | Trần Nguyễn Hữu Khánh | TO DO | 03/11/2026 23:59 | 8 | 16 | 16 |
| [BE-18](BE-18.md) | User: profile + address book CRUD | Trần Nguyễn Hữu Khánh | TO DO | 02/11/2026 23:59 | 5 | 8 | 8 |
| [BE-19](BE-19.md) | User admin: create staff, lock/unlock, assign-store, schedules | Trần Nguyễn Hữu Khánh | TO DO | 03/11/2026 23:59 | 8 | 12 | 12 |
| [BE-21](BE-21.md) | Catalog admin: CRUD stores/categories/products/combos/toppings | Nguyễn Duy Quang Nhật | TO DO | 03/11/2026 23:59 | 13 | 24 | 24 |
| [BE-22](BE-22.md) | Availability toggle + inventory | Nguyễn Duy Quang Nhật | TO DO | 03/11/2026 23:59 | 5 | 8 | 8 |
| [BE-24](BE-24.md) | Order preview: giá, voucher/điểm và phí ship qua contract nội bộ | Trần Đức Anh | TO DO | 03/11/2026 23:59 | 8 | 12 | 12 |
| [BE-25](BE-25.md) | Tạo đơn: kiểm tra giá/availability, khởi tạo payment, trạng thái và optimistic locking | Trần Đức Anh | TO DO | 03/11/2026 23:59 | 13 | 20 | 20 |
| [BE-26](BE-26.md) | Order cancel + reject + refund-request | Trần Đức Anh | TO DO | 04/11/2026 23:59 | 5 | 8 | 8 |
| [BE-27](BE-27.md) | Order list my/admin (storeId filter) + detail + reorder | Trần Đức Anh | TO DO | 04/11/2026 23:59 | 8 | 12 | 12 |
| [BE-29](BE-29.md) | Payment: tạo bank-transfer + QR VietQR (PENDING, expires) | Lê Phú Thịnh | TO DO | 02/11/2026 23:59 | 5 | 8 | 8 |
| [BE-30](BE-30.md) | Payment: webhook SePay (raw-body signature, match code+amount, idempotent) | Lê Phú Thịnh | TO DO | 03/11/2026 23:59 | 8 | 14 | 14 |
| [BE-32](BE-32.md) | Payment: confirm-manual, confirm-cod, refund, transactions, bank-config | Lê Phú Thịnh | TO DO | 03/11/2026 23:59 | 8 | 14 | 14 |
| [BE-33](BE-33.md) | Shipping MVP: tính phí, cấu hình phí và chi tiết shipment CREATED | Lê Phú Thịnh | TO DO | 02/11/2026 23:59 | 5 | 8 | 8 |
| [BE-34](BE-34.md) | Promotion: voucher validate + CRUD + scope ALL/STORE | Cao Tất Thành | TO DO | 02/11/2026 23:59 | 8 | 12 | 12 |
| [BE-37](BE-37.md) | Loyalty: points, tier, earn/redeem, config | Cao Tất Thành | TO DO | 03/11/2026 23:59 | 8 | 14 | 14 |
| [BE-38](BE-38.md) | Notification: my notifications, read, read-all | Cao Tất Thành | TO DO | 03/11/2026 23:59 | 3 | 6 | 6 |
| [BE-39](BE-39.md) | Notification consumer: in-app/email orchestration, idempotency và Kafka replay protection | Cao Tất Thành | TO DO | 04/11/2026 23:59 | 8 | 12 | 12 |
| [BE-40](BE-40.md) | Review: create/edit/delete own + product reviews | Mai Sơn Việt | TO DO | 03/11/2026 23:59 | 5 | 8 | 8 |
| [BE-41](BE-41.md) | Review: replies + hide | Mai Sơn Việt | TO DO | 03/11/2026 23:59 | 3 | 4 | 4 |
| [BE-42](BE-42.md) | Report: dashboard per role + revenue + export Excel/PDF | Mai Sơn Việt | TO DO | 04/11/2026 23:59 | 13 | 20 | 20 |
| [BE-43](BE-43.md) | Audit log: record + query | Mai Sơn Việt | TO DO | 04/11/2026 23:59 | 5 | 8 | 8 |
| [BE-44](BE-44.md) | Payment status query + ownership: customer chỉ xem payment của order mình | Lê Phú Thịnh | TO DO | 03/11/2026 23:59 | 5 | 6 | 6 |
| [BE-45](BE-45.md) | Bank transaction reconciliation detail + mismatch workflow | Lê Phú Thịnh | TO DO | 04/11/2026 23:59 | 5 | 8 | 8 |
| [BE-46](BE-46.md) | Refund state machine: PENDING → APPROVED/REJECTED → REFUNDED | Lê Phú Thịnh | TO DO | 04/11/2026 23:59 | 8 | 10 | 10 |
| [BE-48](BE-48.md) | Shipping fee rules: base fee, per-km, free threshold, store override | Lê Phú Thịnh | TO DO | 03/11/2026 23:59 | 3 | 4 | 4 |
| [BE-49](BE-49.md) | Payment/Shipping OpenAPI examples + webhook payload schemas | Lê Phú Thịnh | TO DO | 04/11/2026 23:59 | 3 | 4 | 4 |
| [BE-54](BE-54.md) | Catalog integration hardening: menu cache invalidation and store availability contract | Nguyễn Duy Quang Nhật | TO DO | 03/11/2026 23:59 | 5 | 8 | 8 |
| [BE-58](BE-58.md) | Mail Sender interface + Gmail SMTP adapter boundary | Cao Tất Thành | TO DO | 02/11/2026 23:59 | 2 | 3 | 3 |
| [BE-60](BE-60.md) | Gmail SMTP connection with STARTTLS and timeout | Cao Tất Thành | TO DO | 02/11/2026 23:59 | 5 | 5 | 5 |
| [BE-61](BE-61.md) | Email template renderer for transactional templates | Cao Tất Thành | TO DO | 02/11/2026 23:59 | 3 | 6 | 6 |
| [BE-62](BE-62.md) | Email log/status persistence and idempotency by eventId/messageId | Cao Tất Thành | TO DO | 03/11/2026 23:59 | 5 | 8 | 8 |
| [BE-63](BE-63.md) | Admin email-log API with recipient/status/template/date filters | Mai Sơn Việt | TO DO | 04/11/2026 23:59 | 5 | 6 | 6 |
| [BE-64](BE-64.md) | OTP email templates: register, verify, forgot/reset password | Cao Tất Thành | TO DO | 02/11/2026 23:59 | 2 | 3 | 3 |
| [BE-65](BE-65.md) | Order/payment/refund email templates | Cao Tất Thành | TO DO | 03/11/2026 23:59 | 3 | 6 | 6 |
| [BE-66](BE-66.md) | Mail retry/backoff policy and FAILED state handling | Cao Tất Thành | TO DO | 03/11/2026 23:59 | 8 | 10 | 10 |
| [BE-67](BE-67.md) | Email failure event/DLQ and masked error logging | Mai Sơn Việt | TO DO | 03/11/2026 23:59 | 5 | 6 | 6 |
| [BE-70](BE-70.md) | Cloudinary adapter và tích hợp upload ảnh product/combo | Nguyễn Duy Quang Nhật | TO DO | 03/11/2026 23:59 | 8 | 10 | 10 |
| [BE-71](BE-71.md) | Signed upload/secure backend upload contract and MIME/size validation | Nguyễn Duy Quang Nhật | TO DO | 02/11/2026 23:59 | 5 | 6 | 6 |
| [BE-72](BE-72.md) | Product/combo media API | Nguyễn Duy Quang Nhật | TO DO | 03/11/2026 23:59 | 3 | 6 | 6 |
| [BE-74](BE-74.md) | Cloudinary: xử lý lỗi, idempotency và cleanup asset sau metadata commit | Nguyễn Duy Quang Nhật | TO DO | 04/11/2026 23:59 | 8 | 12 | 12 |
| [BE-75](BE-75.md) | Media response DTO và kiểm tra không lộ secret frontend/API/log | Lê Phú Thịnh | TO DO | 04/11/2026 23:59 | 3 | 4 | 4 |
| [BE-76](BE-76.md) | Google OAuth qua Firebase: verify ID token, complete-password, JWT và migration bổ sung | Lê Phú Thịnh | TO DO | 03/11/2026 23:59 | 13 | 20 | 20 |
| [INT-05](INT-05.md) | Auth E2E: register → OTP → login → refresh, 2 app | Trần Nguyễn Hữu Khánh | TO DO | 04/11/2026 23:59 | 8 | 10 | 10 |
| [INT-06](INT-06.md) | Menu/catalog E2E: browse, search, availability theo quán | Nguyễn Duy Quang Nhật | TO DO | 04/11/2026 23:59 | 5 | 6 | 6 |
| [INT-07](INT-07.md) | Cart → checkout → tạo đơn E2E | Trần Đức Anh | TO DO | 04/11/2026 23:59 | 8 | 10 | 10 |
| [INT-08](INT-08.md) | Order tracking, history, cancel, reorder E2E | Trần Đức Anh | TO DO | 04/11/2026 23:59 | 5 | 8 | 8 |
| [INT-09](INT-09.md) | Payment: QR hiển thị, webhook → CONFIRMED, COD confirm | Lê Phú Thịnh | TO DO | 04/11/2026 23:59 | 8 | 12 | 12 |
| [INT-10](INT-10.md) | Voucher apply + loyalty points E2E | Cao Tất Thành | TO DO | 04/11/2026 23:59 | 5 | 8 | 8 |
| [INT-11](INT-11.md) | Notification list + mark-read E2E | Cao Tất Thành | TO DO | 04/11/2026 23:59 | 3 | 4 | 4 |
| [INT-12](INT-12.md) | Review: viết/sửa/xóa + reply + hide E2E | Mai Sơn Việt | TO DO | 04/11/2026 23:59 | 5 | 6 | 6 |
| [INT-13](INT-13.md) | Report/dashboard/export E2E | Mai Sơn Việt | TO DO | 04/11/2026 23:59 | 5 | 8 | 8 |
| [INT-14](INT-14.md) | Admin orders: status, refund approve E2E | Trần Đức Anh | TO DO | 04/11/2026 23:59 | 5 | 6 | 6 |
| [INT-15](INT-15.md) | Admin catalog/store/inventory E2E | Nguyễn Duy Quang Nhật | TO DO | 04/11/2026 23:59 | 5 | 8 | 8 |
| [INT-39](INT-39.md) | Kafka producer: order.created/status-changed/completed/cancelled | Trần Đức Anh | TO DO | 03/11/2026 23:59 | 5 | 6 | 6 |
| [INT-40](INT-40.md) | Kafka producer: payment.confirmed/failed | Lê Phú Thịnh | TO DO | 03/11/2026 23:59 | 5 | 6 | 6 |
| [INT-43](INT-43.md) | Consumer: shipping tạo bản ghi khi order.created | Lê Phú Thịnh | TO DO | 04/11/2026 23:59 | 3 | 4 | 4 |
| [INT-44](INT-44.md) | Consumer: promotion cộng điểm khi order.completed | Cao Tất Thành | TO DO | 04/11/2026 23:59 | 5 | 6 | 6 |
| [INT-45](INT-45.md) | Consumer: report cập nhật daily_store_stats | Mai Sơn Việt | TO DO | 04/11/2026 23:59 | 8 | 8 | 8 |
| [INT-46](INT-46.md) | DLQ + retry + idempotent consumer | Mai Sơn Việt | TO DO | 04/11/2026 23:59 | 8 | 10 | 10 |
| [INT-47](INT-47.md) | Saga: payment.failed → cancel order → release voucher/điểm | Trần Đức Anh | TO DO | 04/11/2026 23:59 | 8 | 12 | 12 |
| [INT-48](INT-48.md) | Audit log consumer cho thao tác quản trị | Mai Sơn Việt | TO DO | 04/11/2026 23:59 | 5 | 6 | 6 |
| [INT-49](INT-49.md) | SePay webhook test: mock → verify → match → confirm | Lê Phú Thịnh | TO DO | 04/11/2026 23:59 | 5 | 8 | 8 |
| [INT-50](INT-50.md) | Payment timeout: QR expires → order/payment expired → notify customer | Lê Phú Thịnh | TO DO | 04/11/2026 23:59 | 8 | 8 | 8 |
| [INT-51](INT-51.md) | COD lifecycle: confirm at branch → collected → completed | Lê Phú Thịnh | TO DO | 04/11/2026 23:59 | 5 | 6 | 6 |
| [INT-52](INT-52.md) | Tích hợp refund: duyệt/từ chối, cập nhật thanh toán, thông báo và nghiệm thu | Lê Phú Thịnh | TO DO | 04/11/2026 23:59 | 8 | 12 | 12 |
| [INT-53](INT-53.md) | Identity → Gateway security integration: JWT claims, role, storeId propagation | Trần Nguyễn Hữu Khánh | TO DO | 03/11/2026 23:59 | 8 | 8 | 8 |
| [INT-54](INT-54.md) | Catalog → Gateway discovery integration: menu route, cache headers, availability | Nguyễn Duy Quang Nhật | TO DO | 03/11/2026 23:59 | 3 | 4 | 4 |
| [INT-60](INT-60.md) | Email delivery metrics/logging correlation across services | Mai Sơn Việt | TO DO | 04/11/2026 23:59 | 3 | 4 | 4 |
| [INT-61](INT-61.md) | Admin users: create staff, lock, assign E2E | Trần Nguyễn Hữu Khánh | TO DO | 04/11/2026 23:59 | 5 | 6 | 6 |
| [INT-62](INT-62.md) | Tích hợp UI quản trị voucher thường (banner và duyệt chi nhánh để backlog) | Cao Tất Thành | TO DO | 04/11/2026 23:59 | 3 | 4 | 4 |
| [INT-63](INT-63.md) | Admin payments/bank config E2E | Lê Phú Thịnh | TO DO | 04/11/2026 23:59 | 5 | 6 | 6 |
| [INT-64](INT-64.md) | Payment status UI: pending/paid/expired/mismatch/refund states | Lê Phú Thịnh | TO DO | 04/11/2026 23:59 | 5 | 6 | 6 |
| [INT-65](INT-65.md) | Shipping fee + shipment info UI integration | Lê Phú Thịnh | TO DO | 04/11/2026 23:59 | 3 | 4 | 4 |
| [INT-67](INT-67.md) | RBAC E2E: storeId enforcement từng API | Trần Nguyễn Hữu Khánh | TO DO | 04/11/2026 23:59 | 8 | 12 | 12 |
| [INT-68](INT-68.md) | Order status realtime (polling) cho customer | Trần Đức Anh | TO DO | 04/11/2026 23:59 | 3 | 4 | 4 |
| [INT-69](INT-69.md) | Customer auth UI: email sent/sending/failure states | Trần Nguyễn Hữu Khánh | TO DO | 04/11/2026 23:59 | 3 | 4 | 4 |
| [INT-72](INT-72.md) | Component upload/preview/progress/lỗi dùng chung; áp dụng product/combo | Nguyễn Duy Quang Nhật | TO DO | 03/11/2026 23:59 | 5 | 6 | 6 |
| [INT-73](INT-73.md) | Tích hợp UI quản trị ảnh product/combo | Nguyễn Duy Quang Nhật | TO DO | 04/11/2026 23:59 | 3 | 4 | 4 |
| [INT-74](INT-74.md) | Google login E2E: tài khoản cũ/mới, complete-password, token lỗi và email trùng | Lê Phú Thịnh | TO DO | 04/11/2026 23:59 | 8 | 10 | 10 |
| [TEST-01](TEST-01.md) | E2E Guest→register→OTP→browse→cart→COD order | Trần Đức Anh | TO DO | 05/11/2026 23:59 | 5 | 6 | 6 |
| [TEST-05](TEST-05.md) | E2E Manager: create staff→assign→reports | Mai Sơn Việt | TO DO | 05/11/2026 23:59 | 3 | 4 | 4 |
| [TEST-06](TEST-06.md) | E2E Admin: store → product → voucher thường | Nguyễn Duy Quang Nhật | TO DO | 05/11/2026 23:59 | 3 | 4 | 4 |
| [TEST-07](TEST-07.md) | RBAC: Staff A không gọi được dữ liệu quán B | Trần Nguyễn Hữu Khánh | TO DO | 05/11/2026 23:59 | 5 | 4 | 4 |
| [TEST-12](TEST-12.md) | Shipping fee rules: pickup/free threshold/store override | Lê Phú Thịnh | TO DO | 05/11/2026 23:59 | 3 | 3 | 3 |
| [TEST-16](TEST-16.md) | Integration test Kafka + cross-service | Mai Sơn Việt | TO DO | 05/11/2026 23:59 | 8 | 8 | 8 |
| [TEST-17](TEST-17.md) | Responsive test toàn bộ | Nguyễn Duy Quang Nhật | TO DO | 05/11/2026 23:59 | 5 | 6 | 6 |
| [TEST-22](TEST-22.md) | OTP/order/payment/refund email E2E flows | Cao Tất Thành | TO DO | 05/11/2026 23:59 | 5 | 6 | 6 |
| [TEST-23](TEST-23.md) | Email failure does not rollback order/payment | Cao Tất Thành | TO DO | 05/11/2026 23:59 | 5 | 4 | 4 |
| [TEST-24](TEST-24.md) | Secret masking: App Password absent from logs/API | Mai Sơn Việt | TO DO | 05/11/2026 23:59 | 3 | 3 | 3 |
| [TEST-25](TEST-25.md) | Cloudinary valid image upload and URL/public_id persistence | Nguyễn Duy Quang Nhật | TO DO | 05/11/2026 23:59 | 2 | 3 | 3 |
| [TEST-26](TEST-26.md) | Invalid MIME/oversize upload rejected | Nguyễn Duy Quang Nhật | TO DO | 05/11/2026 23:59 | 2 | 2 | 2 |
| [DEP-09](DEP-09.md) | Postman collection: mỗi người export service mình, M6 merge | Mai Sơn Việt | TO DO | 05/11/2026 23:59 | 3 | 6 | 6 |
| [DEP-10](DEP-10.md) | Demo materials: script + screenshots + slides | Trần Nguyễn Hữu Khánh | TO DO | 05/11/2026 23:59 | 3 | 8 | 8 |

## BACKLOG — chưa xếp sprint

| ID | Task | PIC | Trạng thái | Deadline | SP | Time Estimated (h) | Remaining (h)* |
|---|---|---|---|---|---:|---:|---:|
| [BE-28](BE-28.md) | Party order create + quản lý tiếp nhận | Trần Đức Anh | TO DO | Chưa xếp | 5 | 8 | 8 |
| [BE-31](BE-31.md) | Payment: webhook Casso | Lê Phú Thịnh | TO DO | Chưa xếp | 8 | 12 | 12 |
| [BE-35](BE-35.md) | Promotion: store-proposals + approve | Cao Tất Thành | TO DO | Chưa xếp | 5 | 8 | 8 |
| [BE-36](BE-36.md) | Quản trị banner: CRUD, upload ảnh và metadata Cloudinary | Cao Tất Thành | TO DO | Chưa xếp | 8 | 12 | 12 |
| [BE-47](BE-47.md) | Phase 2: lịch sử/trạng thái giao hàng sau CREATED | Lê Phú Thịnh | TO DO | Chưa xếp | 8 | 16 | 16 |
| [INT-02](INT-02.md) | Promotion → Cloudinary banner upload integration | Cao Tất Thành | TO DO | Chưa xếp | 3 | 4 | 4 |
| [INT-03](INT-03.md) | Identity: upload/thay avatar và lưu metadata Cloudinary | Trần Nguyễn Hữu Khánh | TO DO | Chưa xếp | 5 | 8 | 8 |
| [INT-41](INT-41.md) | Kafka producer: promotion.approved | Cao Tất Thành | TO DO | Chưa xếp | 3 | 4 | 4 |
| [INT-58](INT-58.md) | Promotion → Notification: promotion email event contract | Cao Tất Thành | TO DO | Chưa xếp | 3 | 4 | 4 |
| [INT-70](INT-70.md) | Customer order/payment UI: email notification status where applicable | Trần Đức Anh | TO DO | Chưa xếp | 3 | 4 | 4 |
| [INT-71](INT-71.md) | Admin email-log screen: filter, detail, retry failed email | Mai Sơn Việt | TO DO | Chưa xếp | 5 | 8 | 8 |
| [TEST-13](TEST-13.md) | Performance: menu <500ms (Redis cache) | Nguyễn Duy Quang Nhật | TO DO | Chưa xếp | 8 | 12 | 12 |
| [TEST-14](TEST-14.md) | Load test 50 concurrent orders | Mai Sơn Việt | TO DO | Chưa xếp | 8 | 12 | 12 |
| [DEP-01](DEP-01.md) | VPS setup: Docker + Compose + mở port | Mai Sơn Việt | TO DO | Chưa xếp | 3 | 4 | 4 |
| [DEP-02](DEP-02.md) | `docker compose up -d` toàn bộ stack | Mai Sơn Việt | TO DO | Chưa xếp | 5 | 6 | 6 |
| [DEP-03](DEP-03.md) | Nginx reverse proxy + HTTPS Let's Encrypt | Mai Sơn Việt | TO DO | Chưa xếp | 3 | 4 | 4 |
| [DEP-04](DEP-04.md) | Domain + CORS + trusted origins | Mai Sơn Việt | TO DO | Chưa xếp | 3 | 3 | 3 |
| [DEP-05](DEP-05.md) | Health check mọi container | Mai Sơn Việt | TO DO | Chưa xếp | 2 | 3 | 3 |
| [DEP-06](DEP-06.md) | Smoke test VPS: login, menu, COD, transfer | Mai Sơn Việt | TO DO | Chưa xếp | 5 | 6 | 6 |
| [DEP-07](DEP-07.md) | Backup script daily, giữ 7 bản | Mai Sơn Việt | TO DO | Chưa xếp | 5 | 6 | 6 |
| [DEP-08](DEP-08.md) | README final: run, arch, API | Mai Sơn Việt | TO DO | Chưa xếp | 3 | 6 | 6 |
| [DEP-11](DEP-11.md) | Final review + tag release | Mai Sơn Việt | TO DO | Chưa xếp | 3 | 4 | 4 |
| [DEP-12](DEP-12.md) | Handover: credentials, .env, rollback | Mai Sơn Việt | TO DO | Chưa xếp | 5 | 6 | 6 |
| [DEP-20](DEP-20.md) | Production email smoke test and email_logs backup verification | Mai Sơn Việt | TO DO | Chưa xếp | 5 | 4 | 4 |
| [DEP-22](DEP-22.md) | Media backup/cleanup verification and production smoke test | Mai Sơn Việt | TO DO | Chưa xếp | 5 | 6 | 6 |

## ID đã gộp/bỏ record trùng

| ID cũ | Chuyển đến |
|---|---|
| [UI-33](UI-33.md) | [UI-34](UI-34.md) |
| [UI-35](UI-35.md) | [UI-34](UI-34.md) |
| [UI-36](UI-36.md) | [UI-34](UI-34.md) |
| [UI-37](UI-37.md) | [UI-34](UI-34.md) |
| [UI-38](UI-38.md) | [UI-34](UI-34.md) |
| [UI-42](UI-42.md) | [UI-34](UI-34.md) |
| [BE-14](BE-14.md) | [BE-10](BE-10.md) |
| [BE-53](BE-53.md) | [BE-16](BE-16.md), [BE-17](BE-17.md) |
| [BE-55](BE-55.md) | [BE-25](BE-25.md) |
| [BE-56](BE-56.md) | [BE-07](BE-07.md) |
| [BE-69](BE-69.md) | [BE-01](BE-01.md), [BE-02](BE-02.md), [BE-05](BE-05.md) |
| [BE-73](BE-73.md) | [INT-03](INT-03.md), [BE-36](BE-36.md) |
| [INT-01](INT-01.md) | [BE-70](BE-70.md) |
| [INT-04](INT-04.md) | [BE-74](BE-74.md) |
| [INT-35](INT-35.md) | [BE-24](BE-24.md) |
| [INT-36](INT-36.md) | [BE-25](BE-25.md) |
| [INT-37](INT-37.md) | [BE-25](BE-25.md) |
| [INT-38](INT-38.md) | [BE-24](BE-24.md) |
| [INT-42](INT-42.md) | [BE-39](BE-39.md) |
| [INT-55](INT-55.md) | [BE-16](BE-16.md) |
| [INT-56](INT-56.md) | [INT-39](INT-39.md) |
| [INT-57](INT-57.md) | [INT-40](INT-40.md) |
| [INT-59](INT-59.md) | [BE-39](BE-39.md) |
| [INT-66](INT-66.md) | [INT-52](INT-52.md) |
| [TEST-02](TEST-02.md) | [INT-09](INT-09.md) |
| [TEST-03](TEST-03.md) | [INT-52](INT-52.md) |
| [TEST-04](TEST-04.md) | [INT-14](INT-14.md) |
| [TEST-08](TEST-08.md) | [INT-49](INT-49.md) |
| [TEST-09](TEST-09.md) | [INT-49](INT-49.md) |
| [TEST-10](TEST-10.md) | [INT-50](INT-50.md) |
| [TEST-11](TEST-11.md) | [INT-52](INT-52.md) |
| [TEST-15](TEST-15.md) | Tiêu chí task/bug cụ thể theo domain |
| [TEST-18](TEST-18.md) | Tiêu chí task/bug cụ thể theo domain |
| [TEST-19](TEST-19.md) | [BE-60](BE-60.md) |
| [TEST-20](TEST-20.md) | [BE-66](BE-66.md) |
| [TEST-21](TEST-21.md) | [BE-39](BE-39.md) |
| [TEST-27](TEST-27.md) | [BE-74](BE-74.md) |
| [TEST-28](TEST-28.md) | [BE-75](BE-75.md) |
| [TEST-29](TEST-29.md) | [INT-74](INT-74.md) |
| [DEP-13](DEP-13.md) | [INT-05](INT-05.md) |
| [DEP-14](DEP-14.md) | [INT-06](INT-06.md) |
| [DEP-15](DEP-15.md) | [INT-53](INT-53.md) |
| [DEP-16](DEP-16.md) | [INT-09](INT-09.md) |
| [DEP-17](DEP-17.md) | [INT-11](INT-11.md) |
| [DEP-18](DEP-18.md) | [BE-57](BE-57.md) |
| [DEP-19](DEP-19.md) | [BE-57](BE-57.md) |
| [DEP-21](DEP-21.md) | [BE-68](BE-68.md) |
| [DEP-23](DEP-23.md) | [BE-76](BE-76.md) |

Các đường dẫn `architechture/plans/` trong phần nguồn lịch sử của task thuộc commit `2cc31a0`, trước khi hai thư mục plans/verification được bỏ khỏi Git. Dùng các liên kết lịch sử ở trên để tra cứu; task detail và backlog hiện hành vẫn được giữ.
