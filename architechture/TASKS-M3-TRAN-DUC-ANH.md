# Task của Trần Đức Anh (M3) — Cart & Order + API Gateway

> **Nguồn:** `architechture/TASK-PLAN.md`, `architechture/tasks/*.md`, `architechture/docs/*`, `architechture/database/schema.sql`  
> **Ngày lập:** 27/10/2026  
> **Phạm vi:** `cart-order-service` + `api-gateway` + Customer FE (Cart, Checkout, Orders, Tracking, Party) + Admin FE (Orders, Staff Orders, Refund)

**Tổng: 45 task có tên M3 trong PIC** (10 UI · 8 Backend · 18 Integration · 8 Test · 1 Deploy) và 14 task chung/phối hợp.

> SP lấy từ từng file task detail. Các task INT/TEST thường được chia sẻ với thành viên khác, nên tổng SP không phản ánh khối lượng riêng của M3.

## 0. Tóm tắt & ưu tiên

### Hiện trạng repo (đối chiếu nhanh)

- `backend/api-gateway`: đã có app + route khung; `config-repo/api-gateway.yml` đã có route cho hầu hết service.
- `backend/cart-order-service`: mới có `CartOrderServiceApplication` và `V1__init.sql` tạo bảng `service_bootstrap`; **chưa có entity/API nghiệp vụ**.
- `frontend/nextjs`: có page tĩnh `/cart`, `/checkout`, `/orders`, `/orders/[id]`; **chưa nối API/state**.
- `frontend/react`: mới là demo một file `src/main.tsx` có bảng orders; **chưa có page/route riêng**.
- Chưa thấy evidence hoàn thành task nào; 6 task có scaffold/mock: UI-05, UI-17, UI-18, UI-19, UI-24, BE-03.

### Việc nên làm ngay

1. **Chốt contract với M4 và M5** cho Checkout/Tracking: PaymentWidget, payment API, voucher/points API. Đây là dependency chặn UI-18, UI-19, INT-35, INT-37.
2. **Hoàn thiện UI-05**: bổ sung route còn thiếu `/api/party-orders/**`, `/api/refund-requests/**`; kiểm tra route `lb://` qua Eureka.
3. **Làm UI-43 + UI-17/18/19/20/23/24/30** theo thứ tự: component dùng chung → Cart → Checkout → Tracking/History → Party → Admin/Staff Orders.
4. **Làm BE-03 migration** trước BE-23..28 để có schema chạy Flyway.
5. **Làm BE-23 → BE-24 → BE-25** (cart → preview → create order) vì đây là critical path của toàn domain.

### Chú giải trạng thái

| Ký hiệu | Ý nghĩa |
|---|---|
| ⬜ | Chưa bắt đầu |
| 🟡 | Đã có scaffold/mock, chưa đạt DoD |
| ✅ | Đạt DoD (hiện chưa có) |

---

## 1. UI — Ngày 1–3

| ID | Task | SP | Deliverable | Trạng thái & việc cần làm |
|---|---|---:|---|---|
| [UI-05](tasks/UI-05.md) | API Gateway app + route khung `lb://` | 2 | `backend/api-gateway`, `config-repo/api-gateway.yml` | 🟡 Có app + route khung. Thiếu route `/api/party-orders/**`, `/api/refund-requests/**`; cần rà soát route service khác và test discovery qua Eureka. |
| [UI-43](tasks/UI-43.md) | Cart + Order visual contract: cart badge, order status chips, order card | 2 | Shared FE components | ⬜ Chưa có. Tạo component dùng chung cho Cart/Orders để UI-17..20, UI-24, UI-30 không lặp code. |
| [UI-17](tasks/UI-17.md) | Cart page: item list, stepper, ghi chú, tổng | 2 | `app/cart/page.tsx` | 🟡 Page tĩnh có item list + tổng; thiếu stepper, ghi chú, state giỏ và API qua Gateway. |
| [UI-18](tasks/UI-18.md) | Checkout page: address, delivery/pickup, voucher, điểm, payment method, summary | 2 | `app/checkout/page.tsx` | 🟡 Form tĩnh; thiếu voucher/điểm (M5), preview API, ràng buộc address/delivery. Giữ khung trang; widget ship/payment gọi API M4. |
| [UI-19](tasks/UI-19.md) | Order tracking: status timeline + QR VietQR block | 2 | `app/orders/[id]/page.tsx` + `components/payment/PaymentWidget` | 🟡 Timeline tĩnh; thiếu map status từ API, polling và QR/PaymentWidget do M4 cung cấp. |
| [UI-20](tasks/UI-20.md) | Order history + reorder + chi tiết hóa đơn | 2 | `app/orders/page.tsx` | ⬜ `/orders` hiện là form tracking; cần trang lịch sử, chi tiết hóa đơn và reorder. |
| [UI-23](tasks/UI-23.md) | Party order form | 2 | `app/party/page.tsx` | ⬜ Chưa có page; cần form, validate và gọi API. |
| [UI-24](tasks/UI-24.md) | Admin Orders: filter tabs, status action, refund modal, drawer | 2 | `react/pages/Orders` | 🟡 Có demo table trong `src/main.tsx`; cần tách page riêng, filter tabs, status action, refund modal, drawer. |
| [UI-30](tasks/UI-30.md) | Staff Orders: đơn hôm nay, status buttons, COD confirm | 2 | `react/pages/Staff/Orders` | ⬜ Chưa có page; cần lọc đơn hôm nay theo storeId, nút chuyển trạng thái, xác nhận COD. |
| [UI-46](tasks/UI-46.md) | Order domain responsive/a11y pass: Cart, Checkout, Orders, Staff Orders | 2 | Domain UI checklist | ⬜ Làm sau khi UI xong; kiểm tra 360→1440px, contrast, aria-label, keyboard nav. |

---

## 2. Backend — Ngày 4–6

| ID | Task | SP | Nội dung chính | Trạng thái |
|---|---|---:|---|---|
| [BE-03](tasks/BE-03.md) | Order entity + Flyway V1 (orders, items, history, refunds, party) | 3 | Tạo bảng `orders`, `order_items`, `order_status_history`, `refund_requests`, `party_orders` + index theo `architechture/database/schema.sql`. | 🟡 V1 hiện chỉ có `service_bootstrap`; cần bổ sung migration mới (không sửa V1 đã áp dụng). |
| [BE-23](tasks/BE-23.md) | Cart Redis CRUD (guest session + customer) | 5 | `GET/POST/PUT/DELETE /api/cart`; key `cart:{userId}` / `cart:guest:{sessionId}`; TTL 7 ngày/24 giờ; đồng bộ giỏ guest → customer khi đăng nhập; xóa giỏ sau checkout thành công. | ⬜ Chưa có code. |
| [BE-24](tasks/BE-24.md) | Order preview (gọi Promotion + Shipping nội bộ) | 5 | `POST /api/orders/preview`; validate voucher/điểm, tính subtotal, discount, points, shipping fee, total; **không tạo đơn**. | ⬜ Chưa có code; phụ thuộc INT-35/INT-38. |
| [BE-25](tasks/BE-25.md) | Order create + status transitions + confirm | 5 | `POST /api/orders`, `PUT /api/orders/{id}/status`; validate catalog price/availability; snapshot item; sinh orderCode; `PENDING_PAYMENT` cho bank, `CONFIRMED` cho COD; ghi history; xóa giỏ. | ⬜ Chưa có code; phụ thuộc BE-23, BE-24, INT-36. |
| [BE-26](tasks/BE-26.md) | Order cancel + reject + refund-request | 5 | `PUT /cancel`, `PUT /reject`, `POST /refund-requests`; kiểm tra điều kiện trạng thái, lý do bắt buộc; đơn đã PAID tạo refund request; enforce owner/storeId. | ⬜ Chưa có code. |
| [BE-27](tasks/BE-27.md) | Order list my/admin (storeId filter) + detail + reorder | 5 | `GET /api/orders/my`, `GET /api/orders?storeId=&status=`, `GET /api/orders/{id}`, reorder; Staff/Manager bị ép storeId từ JWT; customer chỉ xem đơn mình. | ⬜ Chưa có code. |
| [BE-28](tasks/BE-28.md) | Party order create + quản lý tiếp nhận | 5 | `POST/GET/PUT /api/party-orders`; trạng thái `NEW → CONTACTED → QUOTED → CONFIRMED → CLOSED`; Staff/Manager chỉ thấy đơn quán mình. | ⬜ Chưa có code; cần thêm route Gateway. |
| [BE-55](tasks/BE-55.md) | Order lifecycle hardening: status transition validation and optimistic locking | 5 | Chặn chuyển trạng thái sai theo state machine; optimistic locking/conditional update; test invalid transition + concurrency. | ⬜ Chưa có code. |

**State machine cần bám theo SRS:**

```text
PENDING_PAYMENT → CONFIRMED → PREPARING → READY → SHIPPING → COMPLETED
PENDING_PAYMENT / CONFIRMED → CANCELLED
Refund: PENDING → APPROVED / REJECTED → REFUNDED
```

---

## 3. Integration — Ngày 7–8

### 3.1. Đồng bộ cross-service (Ngày 7)

| ID | Task | SP | Phối hợp | Phần M3 phụ trách |
|---|---|---:|---|---|
| [INT-35](tasks/INT-35.md) | Order → Promotion: validate voucher/điểm khi preview + checkout | 5 | M5 — Cao Tất Thành | Gọi Promotion khi preview và trước khi tạo đơn; xử lý lỗi voucher/điểm; không trừ lượt khi đơn chưa tạo thành công. |
| [INT-36](tasks/INT-36.md) | Order → Catalog: kiểm tra giá + availability | 5 | M2 — Nguyễn Duy Quang Nhật | Kiểm tra món/combo còn bán tại store, giá hiện tại; từ chối đơn nếu hết món/giá lệch. |
| [INT-37](tasks/INT-37.md) | Order → Payment: tạo payment request | 5 | M4 — Lê Phú Thịnh | Sau khi tạo đơn bank transfer, gọi Payment tạo giao dịch/QR; lưu payment status để trả về FE. |
| [INT-38](tasks/INT-38.md) | Order → Shipping: tính phí ship | 5 | M4 — Lê Phú Thịnh | Gọi Shipping trong preview và create order; pickup = 0 phí; lưu shipping fee vào đơn. |

### 3.2. Kafka, Saga và Gateway (Ngày 7)

| ID | Task | SP | Phối hợp | Phần M3 phụ trách |
|---|---|---:|---|---|
| [INT-39](tasks/INT-39.md) | Kafka producer: order.created/status-changed/completed/cancelled | 5 | — | Publish đủ 4 event theo event contract; tối thiểu có `eventId`, `correlationId`, `orderId`, `orderCode`, `storeId`, `status`; không publish khi transaction rollback. |
| [INT-47](tasks/INT-47.md) | Saga: payment.failed → cancel order → release voucher/điểm | 7 | M4 + M5 | Consumer `payment.failed`; hủy order; phát event để release voucher/điểm; idempotent. |
| [INT-50](tasks/INT-50.md) | Payment timeout: QR expires → order/payment expired → notify customer | 5 | M4 + M5 | Nhận event hết hạn; chuyển order sang `PAYMENT_EXPIRED`; không cho confirm; phát notification event. |
| [INT-51](tasks/INT-51.md) | COD lifecycle: confirm at branch → collected → completed | 5 | M4 | Order phối hợp Payment khi Staff xác nhận COD; đảm bảo chỉ completed sau khi collected. |
| [INT-52](tasks/INT-52.md) | Refund integration: Manager approve → Payment mark refund → Customer notification | 5 | M4 + M5 | Order cung cấp refund request/order data; cập nhật trạng thái refund; phát event notify. |
| [INT-53](tasks/INT-53.md) | Identity → Gateway security integration: JWT claims, role, storeId propagation | 5 | M1 — Trần Nguyễn Hữu Khánh | Gateway kiểm tra JWT; forward `sub`, `role`, `storeId`; route public/protected đúng; 401/403 đúng contract. |
| [INT-54](tasks/INT-54.md) | Catalog → Gateway discovery integration: menu route, cache headers, availability | 5 | M2 — Nguyễn Duy Quang Nhật | Route catalog qua Gateway; kiểm tra `lb://` + Eureka; cache headers/availability không bị Gateway làm mất. |
| [INT-56](tasks/INT-56.md) | Order → Notification: order created/status/completed/cancelled email events | 5 | M5 — Cao Tất Thành | Đảm bảo event order có đủ payload cho Notification; email failure không rollback order. |

### 3.3. FE ↔ BE E2E (Ngày 8)

| ID | Task | SP | Nội dung |
|---|---|---:|---|
| [INT-07](tasks/INT-07.md) | Cart → checkout → tạo đơn E2E | 5 | FE gọi Gateway: cart → preview → create order → nhận orderCode/payment; clear cart; COD và bank transfer. |
| [INT-08](tasks/INT-08.md) | Order tracking, history, cancel, reorder E2E | 5 | Tracking polling, lịch sử, chi tiết hóa đơn, hủy đơn đủ điều kiện, reorder. |
| [INT-14](tasks/INT-14.md) | Admin orders: status, refund approve E2E | 5 | Admin/Manager lọc đơn, chuyển trạng thái, duyệt refund; storeId enforcement. |
| [INT-66](tasks/INT-66.md) | Admin refund approval + payment reconciliation E2E | 5 | Phối hợp M4: refund approve → payment mark refund → order/refund status nhất quán. |
| [INT-68](tasks/INT-68.md) | Order status realtime (polling) cho customer | 5 | Polling status timeline; dừng polling khi COMPLETED/CANCELLED; không spam API. |
| [INT-70](tasks/INT-70.md) | Customer order/payment UI: email notification status where applicable | 5 | Hiển thị trạng thái email/thông báo ở nơi phù hợp; phối hợp M4. |

---

## 4. Test — Ngày 9

| ID | Task | SP | Phối hợp | Nội dung kiểm tra |
|---|---|---:|---|---|
| [TEST-01](tasks/TEST-01.md) | E2E Guest→register→OTP→browse→cart→COD order | 3 | M1 + M2 | Luồng COD hoàn chỉnh từ guest đến đơn CONFIRMED. |
| [TEST-02](tasks/TEST-02.md) | E2E transfer→webhook→CONFIRMED | 7 | M4 | QR → webhook → payment PAID → order CONFIRMED. |
| [TEST-03](tasks/TEST-03.md) | E2E cancel→refund request→approve→refunded | 3 | M4 | Hủy đơn đã thanh toán → refund request → approve → REFUNDED. |
| [TEST-04](tasks/TEST-04.md) | E2E Staff: login→dashboard→process→COD confirm | 3 | M1 | Staff quán mình xử lý đơn, không thấy quán khác. |
| [TEST-10](tasks/TEST-10.md) | QR expiry: expired payment cannot confirm order | 3 | M4 | Order `PAYMENT_EXPIRED` không thể confirm/completed. |
| [TEST-11](tasks/TEST-11.md) | Refund: approve/reject/refunded state transitions | 3 | M4 | Chặn chuyển trạng thái refund sai; idempotent. |
| [TEST-22](tasks/TEST-22.md) | OTP/order/payment/refund email E2E flows | 7 | M1 + M4 + M5 | Email đúng template/recipient; không lộ secret. |
| [TEST-23](tasks/TEST-23.md) | Email failure does not rollback order/payment | 3 | M4 + M5 | Gmail lỗi chỉ ghi `FAILED`, order/payment vẫn giữ trạng thái. |

---

## 5. Deploy — Ngày 10

| ID | Task | SP | Deliverable | Checklist |
|---|---|---:|---|---|
| [DEP-15](tasks/DEP-15.md) | Gateway route/discovery smoke test + API collection merge | 3 | Gateway runbook | Route `cart`, `orders`, `party-orders`, `refund-requests` qua Gateway; Eureka `lb://`; 401/403; CORS; export Postman collection và merge với M6. |

---

## 6. Task chung / phối hợp (không tính vào 45 task riêng)

| ID | Task | Việc Đức Anh cần tham gia |
|---|---|---|
| UI-33 | Responsive check 360→1440px | Cart, Checkout, Orders, Staff Orders |
| UI-34 | Brand audit | Domain Order: màu, font, bo góc, tỉ lệ 65-25-10 |
| UI-35 | Polish hover/transition/skeleton/empty states | Domain Order |
| UI-36 | Accessibility | Contrast, aria-label, keyboard nav |
| UI-38 | Cross-check console error | Các trang domain Order |
| UI-40 | Verify Dockerfile + build module | `cart-order-service`, `api-gateway` |
| UI-42 | Design freeze | Tham gia review/sign-off |
| INT-67 | RBAC E2E: storeId enforcement | Verify cart/order/gateway trả 403 khi cross-store |
| TEST-15 | Unit test critical paths | Order state machine, cart, pricing |
| TEST-17 | Responsive test toàn bộ | Domain Order |
| TEST-18 | Bug fix critical + high | Domain Order |
| DEP-06 | Smoke test VPS | Login, menu, COD, transfer |
| DEP-09 | Postman collection | Export cart/order/gateway |
| DEP-11 | Final review + tag release | Tham gia |

---

## 7. Phụ thuộc & bàn giao

| Từ | Nội dung cần | Dùng cho |
|---|---|---|
| M1 — Trần Nguyễn Hữu Khánh | JWT claims `sub`, `role`, `storeId`; auth E2E | INT-53, TEST-01, TEST-04 |
| M2 — Nguyễn Duy Quang Nhật | API giá/availability theo store; catalog route/discovery | INT-36, INT-54 |
| M4 — Lê Phú Thịnh | PaymentWidget, payment API, shipping fee API, QR expiry, COD, refund | UI-19, INT-37, INT-38, INT-50, INT-51, INT-52, INT-66, TEST-02, TEST-03, TEST-10, TEST-11 |
| M5 — Cao Tất Thành | Voucher/points API, notification event/email template | INT-35, INT-47, INT-52, INT-56, TEST-22, TEST-23 |
| M6 — Mai Sơn Việt | Kafka/DLQ config, Docker/CI/deploy | INT-39, DEP-15 |

---

## 8. Thứ tự thực hiện đề xuất

1. **Chốt contract** với M4/M5/M1/M2 (PaymentWidget, payment API, voucher/points, JWT claims).
2. **UI-05** — bổ sung route Gateway còn thiếu; test `lb://`.
3. **UI-43 → UI-17 → UI-18 → UI-19 → UI-20 → UI-23 → UI-24 → UI-30 → UI-46**.
4. **BE-03** — migration schema order.
5. **BE-23 → BE-24 → BE-25 → BE-26 → BE-27 → BE-28 → BE-55**.
6. **INT-35..39** — cross-service + Kafka producer.
7. **INT-47, INT-50..54, INT-56** — saga/timeout/COD/refund/gateway/notification.
8. **INT-07, INT-08, INT-14, INT-66, INT-68, INT-70** — FE↔BE E2E.
9. **TEST-01..04, TEST-10, TEST-11, TEST-22, TEST-23** — test.
10. **DEP-15** — smoke test Gateway + Postman/runbook.

---

## 9. Definition of Done cho domain Order

- [ ] `./gradlew :cart-order-service:build` và `:api-gateway:build` pass.
- [ ] Flyway chạy sạch trên PostgreSQL từ database trống.
- [ ] API trả đúng response/error shape; validate input ở boundary.
- [ ] RBAC + `storeId` + ownership được enforce ở backend (không chỉ FE).
- [ ] State machine order/refund đúng; có optimistic locking.
- [ ] Cart Redis có TTL; đồng bộ giỏ guest → customer khi đăng nhập; clear sau checkout.
- [ ] `order_items` lưu snapshot tên/giá/options/toppings.
- [ ] Kafka event có `eventId`/`correlationId`; producer/consumer idempotent.
- [ ] FE build pass, không console error, responsive/a11y domain Order.
- [ ] FE chỉ gọi Gateway, không gọi thẳng service.
- [ ] Có evidence Postman/curl + review chéo + merge nhánh chính.

---

## 10. Ghi chú & rủi ro cần chốt

- **Checkout là trang dùng chung:** M3 giữ khung trang; voucher/điểm gọi API M5; phí ship/QR gọi API M4. Ranh giới ở API contract, không phải pixel.
- **Route Gateway đang thiếu:** `/api/party-orders/**` và `/api/refund-requests/**` chưa có trong `config-repo/api-gateway.yml`; cần bổ sung trước khi làm BE-26/BE-28.
- **Refund approve thuộc service nào:** API doc đặt `PUT /api/refund-requests/{id}/approve|reject` dưới Cart & Order, nhưng BE-46 (refund state machine) giao M4. Cần chốt với M4 trước khi làm BE-26/INT-52/TEST-03/TEST-11.
- **PaymentWidget:** UI-19 phụ thuộc M4; nếu chưa có, dùng placeholder theo contract và không hard-code QR.
- **Seed data:** INT-07/TEST-01 cần store/product/giá từ M2; chốt bộ seed data trước khi test E2E.
- **Kafka/DLQ:** INT-39/INT-47 cần config topic/DLQ từ M6; thống nhất tên topic và schema event trước.
- **Thời gian:** 3 ngày UI + 3 ngày backend + 2 ngày integration + 2 ngày test/deploy là rất chặt; nếu trễ, ưu tiên critical path: Cart → Preview → Create Order → COD → Admin/Staff Orders.
