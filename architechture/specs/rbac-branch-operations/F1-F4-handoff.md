# Bàn giao F1–F4 — sửa quyền và luồng hiện hữu

Ngày 08/11/2026. **Đã sửa mã; chưa nghiệm thu chức năng.** Không đổi trạng thái backlog/PIC/SP, không triển khai A–E hoặc thay tài khoản Admin hiện hữu.

## F1: policy và điểm vào

- Staff: login, `/`, `/admin`, route không tồn tại và nút về từ 403 dẫn `/admin/orders`. Alias `/admin/staff/orders` về route orders chung. Dashboard chỉ Manager/Admin; menu Staff không còn dashboard hoặc mục ca cá nhân.
- Manager/Admin: điểm vào dashboard giữ nguyên nhưng hiện thông báo chưa tích hợp, không render dashboard mẫu. Manager không có menu/quyền quản trị voucher.
- Notification center tạm khóa hoàn toàn: không fixture, badge giả, đánh dấu đã đọc/xóa local hoặc link tài chính sai quyền. Chưa coi đây là tích hợp Notification API.
- Identity không có controller runtime cho quản trị users; template không được mở. Register và Google sign-in/complete từ chối field lạ (bao gồm role/storeId); Customer vẫn do server gán. Không thay seed/Admin cũ.

## F2: ma trận endpoint/action đã sửa hoặc giữ giới hạn

Mọi URL dưới đây đi qua Gateway; JWT được service xác minh. Các header `X-User-Id`, `X-User-Role`, `X-Store-Id` không quyết định quyền voucher.

| Method + endpoint | Action / role | Scope, boundary |
|---|---|---|
| POST `/api/auth/register`, `/api/auth/google`, `/api/auth/google/complete` | Đăng ký/đăng nhập Customer theo contract hiện có | Reject unknown fields; không nhận role/storeId; không tạo/promote Admin |
| GET/POST `/api/promotions/vouchers` | List/create: ADMIN | Actor từ JWT; Manager/Staff/Customer không đọc danh sách quản trị |
| GET/PUT/DELETE `/api/promotions/vouchers/{id}` | Detail/update/delete: ADMIN | Không dùng actor headers; giữ validation service |
| GET `/api/promotions/vouchers/available`, POST `/api/promotions/vouchers/validate` | Lookup/validate công khai đã có | Giữ nguyên boundary checkout, không bị guard Admin của CRUD |
| GET `/api/stores/{storeId}/inventory` | STAFF/MANAGER/ADMIN | Staff/Manager bắt buộc quán JWT |
| PUT `/api/stores/{storeId}/inventory/{productId}` | Quantity/threshold: MANAGER/ADMIN | Staff bị chặn toàn endpoint; DTO reject unknown fields |
| PUT `/api/stores/{storeId}/products/{productId}/availability` | STAFF/MANAGER/ADMIN | Staff chỉ gửi `isSoldOut`; Staff không sửa `isAvailable`; giá chỉ Admin; reject field lạ, kiểm tra store trước mutation |
| PUT `/api/stores/{id}/operation` | MANAGER/ADMIN | Allowlist `openTime`, `closeTime`, `status`; Manager chỉ quán mình, không name/address/phone/deliveryArea/managerId |
| PUT `/api/stores/{id}` | ADMIN | Manager UI không gọi CRUD Admin; sửa giờ/trạng thái qua operation |
| POST `/api/orders/preview`, POST `/api/orders` | CUSTOMER | Không lấy ID nhân sự làm customerId; preview không còn dành cho guest |
| GET `/api/orders/my`, PUT `/api/orders/{id}/cancel`, POST `/api/orders/{id}/reorder` | CUSTOMER | Owner từ JWT; không đọc/hủy/reorder của Customer khác |
| GET `/api/orders`, GET `/api/orders/{id}`, GET `/api/orders/code/{code}` | CUSTOMER owner ở detail; STAFF/MANAGER quán mình; ADMIN chuỗi | List nội bộ không cho Customer; thiếu store bị từ chối; SHIPPER không được đọc detail qua fallback |
| PUT `/api/orders/{id}/reject`, PUT `/api/orders/{id}/status` | STAFF/MANAGER/ADMIN | Guard store và state, Admin không bỏ qua state/payment |
| GET `/api/reports/dashboard`, `/revenue`, `/export` | MANAGER/ADMIN | Staff bị chặn; Manager không sửa query để đọc quán khác; chưa nối UI thật |
| `/api/party-orders/**` | Tất cả role bị khóa | Controller `denyAll`; không mở Party từ generic status |
| `/api/users/**` | Chưa có runtime controller | UI Users tạm khóa cho cả Manager/Admin; không mở danh sách chuỗi để chữa 403/404 |

## F3: wire contract và concurrency

- `PUT /orders/{id}/cancel` và `/reject`: `{ "reason": "..." }`; `/status`: `{ "status": "CANCELLED", "note": "..." }`. React đã đổi payload từ `reason` sang `note` cho status endpoint.
- Lý do hủy bắt buộc, trim, 1–1000 ký tự; sai input → `400 VALIDATION_ERROR`. Ba đường hủy dùng cùng kiểm tra `PENDING_PAYMENT | CONFIRMED → CANCELLED`; từ PREPARING trở đi → `409 RESOURCE_CONFLICT`, kể cả Admin.
- Giữ `@Transactional`, `Order.updatedAt @Version`, history actor/role từ JWT và outbox hiện hữu. Conflict optimistic locking trả 409; client đọc lại dữ liệu, không tự retry quyết định. Race thực hai request **chưa kiểm thử**.
- `OrderResponse.paymentStatus` mới đọc cột `orders.payment_status` đã có trong migration V5; không sửa migration, không backfill, không tự đổi payment khi đổi order. Trạng thái gồm PENDING/PAID/COLLECTED/REFUNDED. Client thiếu field hiển thị UNKNOWN, không đoán từ CANCELLED/COMPLETED hoặc phương thức thanh toán.
- `COMPLETED` và `PENDING_PAYMENT → CONFIRMED` yêu cầu trạng thái tiền PAID/COLLECTED đã lưu; thiếu bằng chứng → 409. Luồng thu COD chưa có API thật nên nút bị khóa kèm lý do; không gọi Order COMPLETED để giả thu.
- Refund approval chỉ giữ response APPROVED; không biến thành REFUNDED, không tạo refund/history trong browser. Không xây payment ledger, consumer payment.confirmed, hoặc quy trình chi hoàn ở gói này. Dữ liệu PENDING lịch sử giữ nguyên dù order từng hoàn thành.

## F4: API thật và tính năng còn khóa

| UI | Hiện trạng |
|---|---|
| Orders / Staff orders | API Order/Refund thật; bỏ optimistic demo mutation và ảnh suy đoán từ mock catalog; lỗi tải hiện lỗi + retry, không thay bằng empty/fixture; mutation dùng DTO trả về |
| Promotions / vouchers | Admin-only, API thật; create/update/toggle dùng DTO server; lỗi giữ form, list lỗi có retry; list rỗng không dùng fixture |
| Loyalty settings | Giữ tích hợp thật hiện có, Admin-only |
| Stores | Manager chỉ sửa giờ/trạng thái qua operation; phone/deliveryArea disabled + nhãn chưa hỗ trợ; gán Manager khóa, không gọi users toàn hệ thống |
| Inventory | Staff đọc/báo hết món quán mình; khóa kiểm kê quantity/threshold; Manager/Admin giữ nghiệp vụ hiện có |
| Dashboard, Reports/export, Reviews, Payments, Users | Route production hiện `UnavailableFeature`; các màn mẫu cũ không được mount. Không export/file/toast giả. Việc nối đầy đủ thuộc A–E |
| Voucher proposals, banners | Tab hiện chưa khả dụng; không mount các backlog component có fixture |
| Notification | Popover chưa khả dụng, không local success hoặc link không xác minh |
| Customer order tracking | Đọc paymentStatus thật; lỗi hủy giữ lý do/form và đọc lại đơn; không báo đã thanh toán dựa trên order state |

## Checklist tự kiểm thử — tất cả chưa chạy

- [ ] Hai quán A/B, Customer X/Y, Staff/Manager mỗi quán, Admin cũ: login/index/403/alias/URL không tồn tại đúng vai trò; Staff không vào dashboard.
- [ ] JWT Staff/Manager + actor header Admin giả: voucher CRUD/list/detail bị chặn; Customer available/validate vẫn hoạt động.
- [ ] Staff A báo hết món A thành công sau reload; quantity/threshold/price/isAvailable và quán B bị từ chối, không đổi dữ liệu.
- [ ] Manager A sửa giờ/trạng thái A; gửi field Admin/phone/deliveryArea hoặc ID quán B bị chặn; không phát request users toàn chuỗi.
- [ ] Nhân sự/Admin không preview/checkout; Customer không đọc/hủy/reorder đơn Y; SHIPPER không đọc detail.
- [ ] Customer cancel, nội bộ reject/status: lý do blank/quá dài trả 400; PREPARING/READY/SHIPPING/COMPLETED trả 409; cancel hợp lệ lưu đúng actor/reason.
- [ ] Hai request cancel và PREPARING đồng thời từ CONFIRMED: chỉ một commit, loser 409; kiểm tra order/history/outbox và reload hai màn hình.
- [ ] COD không gọi API COMPLETED; PENDING tiền không hoàn tất/xác nhận bằng generic status; APPROVED refund không hiện REFUNDED.
- [ ] 403/404/409/5xx/offline/timeout: không success giả, không fixture, form còn nhập liệu; tải lại để xác định kết quả trước retry mutation timeout.
- [ ] Danh sách voucher/order rỗng là rỗng thật; export/payment/users/reviews/dashboard/notification/proposals/banners thể hiện đang khóa; kiểm tra vi/en và bàn phím.

Đã thêm `RbacOrderRegressionTest` cho guard checkout/owner/store, cancel state/reason và chặn suy diễn thanh toán. **Không chạy test, lint/typecheck riêng hoặc trình duyệt theo yêu cầu.** Test unit không thay nghiệm thu race HTTP/DB.

## Triển khai Docker

Đã rebuild bằng `start-docker.ps1`, cả hai lượt đều exit 0. Lượt đầu gồm `identity-service`, `catalog-store-service`, `promotion-loyalty-service`, `cart-order-service`, `review-report-service`, `admin`, `customer`; sau rà soát cuối chỉ cập nhật lại `identity-service`, `catalog-store-service`, `cart-order-service`, `admin`, `customer`. Không rebuild toàn stack, không xóa volumes hoặc dữ liệu.

| Service | Build / trạng thái sau cập nhật |
|---|---|
| identity-service | Thành công / healthy |
| catalog-store-service | Thành công / healthy |
| promotion-loyalty-service | Thành công / healthy |
| cart-order-service | Thành công / healthy |
| review-report-service | Thành công / healthy |
| admin (React) | Thành công / healthy |
| customer (Next.js) | Thành công / healthy |

Chỉ chạy build/typecheck/lint có sẵn trong Docker và healthcheck của script. **Chưa chạy kiểm thử chức năng, test regression, lint/typecheck riêng hoặc browser.** Chưa đánh dấu nghiệm thu/đóng Đợt 1.
