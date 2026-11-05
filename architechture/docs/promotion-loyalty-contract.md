# [CONTRACT] Promotion & Loyalty API Contract Specification

> **Task Reference:** [BE-51] Promotion API contract: voucher validation/loyalty DTOs and error cases  
> **Source of Truth:** `contracts/errors.json`, `architechture/tasks/BE-51.md`, `architechture/tasks/BE-24.md`, `architechture/tasks/BE-37.md`, `architechture/tasks/INT-47.md`

---

## 1. Mục tiêu & Ranh giới tin cậy (Trust Boundary)

Tài liệu này xác định giao ước dữ liệu (API Contract), từ điển trường (Field Dictionary), bảng tính toán làm tròn (Calculation & Rounding), ma trận mã lỗi (Error Matrix), và bộ fixture mẫu giữa **Order Service (Cart/Checkout)**, **Frontend (Next.js/React)** và **Promotion-Loyalty Service**.

### 1.1. Nguyên tắc cốt lõi
1. **Tách biệt Read-only và Mutation:**
   - `POST /api/promotions/vouchers/validate` và `POST /api/loyalty/preview` là các truy vấn **đánh giá tức thời (read-only)**. Các endpoint này **KHÔNG** chiếm giữ voucher (no hold), **KHÔNG** trừ hạn ngạch (no consume quota), và **KHÔNG** trừ điểm thành viên.
   - Chỉ các endpoint mutation (`POST /api/loyalty/redeem`, `POST /api/loyalty/earn`, `POST /api/loyalty/release`, `POST /api/promotions/vouchers/release`) hoặc event hoàn tất đơn hàng mới làm thay đổi số dư và hạn ngạch.
2. **Ranh giới tin cậy (Authoritative Source):**
   - **Customer Identity:** Bắt buộc trích xuất từ JWT Actor (`CurrentActor.require().userId()`). Tuyệt đối **không** tin cậy `customerId` truyền trong request body từ phía client/browser. Với luồng S2S (Server-to-Server nội bộ), yêu cầu xác thực service kèm context order/customer tin cậy từ `cart-order-service`.
   - **Order Amount / Subtotal:** Dữ liệu client gửi lên chỉ dùng để minh họa bảng tính preview. Khi tiến hành đặt hàng (Checkout), số tiền hợp lệ **phải** được tính toán độc lập bởi Order Service dựa trên Catalog snapshot (giá món x số lượng + giá options/toppings), không dùng giá hay discount do browser tự tính.
   - **Store Scoping:** `storeId` phải là số nguyên dương hợp lệ, được kiểm tra đối chiếu nghiêm ngặt với phạm vi của voucher (`scope = STORE`).

---

## 2. Từ điển trường (Field Dictionary)

### 2.1. Voucher Validation

#### Request: `VoucherValidationRequest` (hoặc `ValidateVoucherRequest`)
| Tên trường | Kiểu dữ liệu | Bắt buộc | Ràng buộc / Định dạng | Nguồn tin cậy | Mô tả |
|---|---|---|---|---|---|
| `code` | `String` | Có | Tối đa 80 ký tự, regex `^[A-Za-z0-9_-]+$` | Client / User input | Mã voucher người dùng nhập, chuẩn hóa `trim().toUpperCase()`. |
| `storeId` | `Long` | Có (với `VoucherValidationRequest`), Tùy chọn (với `ValidateVoucherRequest`) | Số nguyên dương (`@Positive`) | Order / Selected Store | ID chi nhánh đặt hàng. Bắt buộc kiểm tra nếu voucher có `scope = STORE`. |
| `subtotal` / `orderAmount` | `BigDecimal` | Có | `>= 0`, tối đa 12 chữ số nguyên, 0 chữ số thập phân (`@Digits(integer=12, fraction=0)`) | Order Service (Subtotal) | Tổng giá trị giỏ hàng (chưa gồm phí ship). Hỗ trợ alias cả `subtotal` và `orderAmount`. |
| `customerId` | `Long` | Không | Số nguyên dương | Actor Token | ID khách hàng (dành cho voucher theo phân khúc/cá nhân hóa). |

#### Response: `VoucherValidationResponse` / `ValidateVoucherResponse`
| Tên trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| `valid` | `Boolean` | Có | `true` nếu mã hợp lệ và đủ điều kiện áp dụng; `false` nếu không hợp lệ. |
| `code` | `String` | Có | Mã voucher đã chuẩn hóa. |
| `discountAmount` | `BigDecimal` | Có | Số tiền được giảm giá (VND nguyên, `>= 0`). Bằng `0` nếu `valid = false`. |
| `errorCode` | `String` | Không | Mã lỗi chuẩn từ `contracts/errors.json` (chỉ xuất hiện khi `valid = false`). |
| `reason` | `String` | Không | Diễn giải lý do bằng tiếng Việt thân thiện với người dùng. |
| `voucher` | `VoucherResponse` | Không | Thông tin chi tiết voucher (tiêu đề, hạn dùng, loại giảm giá). |

---

### 2.2. Loyalty Points Preview

#### Request: `LoyaltyPreviewRequest`
| Tên trường | Kiểu dữ liệu | Bắt buộc | Ràng buộc / Định dạng | Nguồn tin cậy | Mô tả |
|---|---|---|---|---|---|
| `pointsToRedeem` | `Integer` | Có | Nguyên không âm (`@Min(0)`) | Client / User input | Số điểm khách hàng muốn dùng để đổi giảm giá. |
| `orderAmount` | `BigDecimal` | Có | `>= 0`, tối đa 12 chữ số nguyên, 0 chữ số thập phân (`@Digits(integer=12, fraction=0)`) | Order Service (Subtotal - Voucher) | Số tiền đơn hàng sau khi đã trừ giảm giá voucher. |

#### Response: `LoyaltyPreviewResponse`
| Tên trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| `availablePoints` | `int` | Có | Số điểm tích lũy hiện có của khách hàng. |
| `pointsUsed` | `int` | Có | Số điểm thực tế được chấp nhận quy đổi cho đơn này. |
| `pointsAmount` | `BigDecimal` | Có | Số tiền tương ứng được giảm từ điểm (`pointsUsed * redeemRate`). |
| `pointsToEarn` | `int` | Có | Số điểm dự kiến sẽ tích lũy được sau khi đơn hoàn tất. |
| `tier` | `String` | Có | Hạng thành viên hiện tại: `STANDARD`, `SILVER`, `GOLD`, `PLATINUM`. |

---

### 2.3. Mutation & Lifecycle Commands (Saga / Internal S2S)

| DTO | Endpoint | Quyền | Mục đích | Idempotency Key Format |
|---|---|---|---|---|
| `EarnPointsRequest` | `POST /api/loyalty/earn` | Internal / SYS | Cộng điểm khi đơn hàng hoàn tất (`order.completed`) | `EARN:order:{orderId}` |
| `RedeemPointsRequest` | `POST /api/loyalty/redeem` | Internal / SYS | Trừ điểm khi thanh toán đơn hàng | `REDEEM:order:{orderId}` |
| `LoyaltyReleaseRequest` | `POST /api/loyalty/release` | Internal / SYS | Hoàn trả điểm khi đơn hủy hoặc thanh toán thất bại (`payment.failed`) | `RELEASE:loyalty:order:{orderId}` |
| `VoucherReleaseRequest` | `POST /api/promotions/vouchers/release` | Internal / SYS | Hoàn trả hạn ngạch voucher khi đơn hủy hoặc thanh toán thất bại | `RELEASE:voucher:{code}:order:{orderId}` |

---

## 3. Quy tắc tính toán & Làm tròn (Calculation & Rounding Rules)

### 3.1. Voucher Discount Calculation
1. **Loại giảm theo phần trăm (`PERCENT`):**
   $$\text{discount} = \text{round}\left(\text{subtotal} \times \frac{\text{value}}{100}\right)$$
   - Làm tròn: Sử dụng `RoundingMode.HALF_UP` về số nguyên VND gần nhất.
   - Áp trần (Max discount cap): Nếu voucher cấu hình `maxDiscount > 0` và $\text{discount} > \text{maxDiscount}$, thì $\text{discount} = \text{maxDiscount}$.
2. **Loại giảm theo số tiền cố định (`AMOUNT`):**
   $$\text{discount} = \text{value}$$
3. **Giới hạn không vượt quá giá trị đơn:**
   $$\text{discountAmount} = \min(\text{discount}, \text{subtotal})$$
   Discount không bao giờ lớn hơn tổng tiền món (`subtotal`), và không áp dụng lên phí vận chuyển (`shippingFee`).

### 3.2. Loyalty Points Calculation
1. **Tỷ lệ đổi điểm (Redeem Rate):**
   - Mặc định: $1\text{ point} = 1,000\text{ VND}$.
   $$\text{pointsAmount} = \text{pointsUsed} \times 1,000\text{ VND}$$
   - Giới hạn: `pointsAmount` không được vượt quá số tiền còn lại của đơn hàng sau voucher.
2. **Chính sách khi `pointsToRedeem > availablePoints`:**
   - Hệ thống **từ chối** quy đổi điểm và trả về lỗi `INSUFFICIENT_POINTS` hoặc `valid = false`. Tuyệt đối **không** tự động clamp/cắt giảm điểm rồi báo thành công mà không có sự xác nhận của người dùng.
3. **Tỷ lệ tích điểm (Earn Rate):**
   - Mặc định: $10,000\text{ VND} = 1\text{ point}$.
   - Hệ số theo hạng thành viên (Tier Multiplier):
     - `STANDARD`: 1.0x (10,000đ = 1 điểm)
     - `SILVER`: 1.1x
     - `GOLD`: 1.25x
     - `PLATINUM`: 1.5x
   - Số điểm tích lũy được làm tròn xuống (`RoundingMode.DOWN`) về số nguyên.

---

## 4. Ma trận lỗi chuẩn hóa (Error Matrix)

Theo định dạng chuẩn từ `contracts/errors.json`:

| Tình huống vi phạm | Mã lỗi (`code`) | HTTP Status | Thông điệp mặc định tiếng Việt |
|---|---|---|---|
| Dữ liệu request thiếu/sai định dạng/số âm/tiền lẻ | `VALIDATION_ERROR` | 400 | "Thông tin nhập chưa hợp lệ." |
| Chưa đăng nhập khi gọi endpoint yêu cầu auth | `UNAUTHENTICATED` | 401 | "Vui lòng đăng nhập để tiếp tục." |
| Gọi thao tác ngoài quyền hạn (Customer gọi endpoint nội bộ/approve) | `FORBIDDEN` | 403 | "Bạn không có quyền thực hiện thao tác này." |
| Mã voucher không tồn tại trong hệ thống | `VOUCHER_NOT_FOUND` | 404 | "Không tìm thấy mã giảm giá." |
| Mã voucher chưa đến thời gian áp dụng (`now < startAt`) | `VOUCHER_NOT_STARTED` | 409 | "Mã giảm giá chưa đến thời gian sử dụng." |
| Mã voucher đã hết hạn (`now > endAt`) | `VOUCHER_EXPIRED` | 409 | "Mã giảm giá đã hết hạn." |
| Mã voucher đang bị khóa (`DISABLED`), chờ duyệt (`PENDING_APPROVAL`), hoặc bị từ chối (`REJECTED`) | `VOUCHER_INACTIVE` | 409 | "Mã giảm giá hiện không khả dụng." |
| Mã voucher đã hết lượt sử dụng trên hệ thống (`usedCount >= totalLimit`) | `VOUCHER_EXHAUSTED` | 409 | "Mã giảm giá đã hết lượt sử dụng." |
| Voucher áp dụng riêng cho chi nhánh khác (`scope = STORE` và `storeId` khác nhau) | `VOUCHER_SCOPE_MISMATCH` | 409 | "Mã giảm giá không áp dụng tại cửa hàng này." |
| Giá trị đơn hàng chưa đạt giá trị tối thiểu của voucher (`subtotal < minOrderAmount`) | `MIN_ORDER_NOT_MET` | 409 | "Đơn hàng chưa đạt giá trị tối thiểu để dùng mã giảm giá." |
| Khách hàng yêu cầu đổi số điểm lớn hơn số dư hiện có (`pointsToRedeem > availablePoints`) | `INSUFFICIENT_POINTS` | 409 | "Bạn không đủ điểm để thực hiện thao tác này." |
| Service Promotion gặp sự cố hoặc timeout khi Order gọi S2S | `DEPENDENCY_UNAVAILABLE` | 503 | "Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau." |

---

## 5. Mutation Lifecycle & Saga Compensation (INT-47)

```
        Order Checkout                Payment Gateway               Promotion Service
              │                              │                              │
              ├────── Create Order ─────────>│                              │
              │   (status: PENDING_PAYMENT)  │                              │
              │                              │                              │
              │                              │── payment.failed ───────────>│
              │                              │   (Webhook / Kafka)          │
              │<───── Cancel Order ──────────┤                              │
              │   (status: CANCELLED)        │                              │
              │                              │                              │
              │── Saga Compensation: release voucher / loyalty ────────────>│
              │   POST /api/promotions/vouchers/release                     │
              │   POST /api/loyalty/release                                 │
              │   (Idempotent key: RELEASE:order:{orderId})                 │
```

- **Tính lũy thừa (Idempotency):**
  - Mọi request mutation (earn, redeem, release) phải gửi kèm `orderId`.
  - Nếu request release được gọi lặp lại nhiều lần với cùng `orderId`, hệ thống trả về kết quả thành công mà **không** hoàn trả điểm/hạn ngạch lần thứ hai.
  - Phân tách rõ ràng giữa khóa Redeem và khóa Release (ví dụ `REDEEM:order:1001` vs `RELEASE:loyalty:order:1001`) để không bị xung đột khóa.

---

## 6. Bộ Test Fixtures (AC-01 đến AC-07)

### AC-01: Voucher hợp lệ (Giảm cố định 20.000đ, Subtotal 150.000đ, Min 100.000đ)
**Request:**
```http
POST /api/promotions/vouchers/validate
Content-Type: application/json

{
  "code": "CLUCKY20K",
  "storeId": 1,
  "subtotal": 150000
}
```
**Response (HTTP 200 OK):**
```json
{
  "valid": true,
  "code": "CLUCKY20K",
  "discountAmount": 20000,
  "voucher": {
    "id": 12,
    "code": "CLUCKY20K",
    "title": "Giảm 20K cho đơn từ 100K",
    "type": "AMOUNT",
    "value": 20000,
    "minOrderAmount": 100000,
    "scope": "ALL",
    "status": "ACTIVE"
  }
}
```

---

### AC-02: Ma trận từ chối Voucher (Scope Mismatch / Expired / Exhausted / Not Started)

#### 1. Scope Mismatch (Voucher Store 1 dùng tại Store 2)
**Request:**
```json
{
  "code": "STORE1ONLY",
  "storeId": 2,
  "subtotal": 150000
}
```
**Response (HTTP 200 OK):**
```json
{
  "valid": false,
  "code": "STORE1ONLY",
  "discountAmount": 0,
  "errorCode": "VOUCHER_SCOPE_MISMATCH",
  "reason": "Mã ưu đãi chỉ áp dụng tại chi nhánh #1, không áp dụng cho chi nhánh hiện tại."
}
```

#### 2. Expired Voucher (Đã hết hạn)
**Response (HTTP 200 OK):**
```json
{
  "valid": false,
  "code": "EXPIRED2025",
  "discountAmount": 0,
  "errorCode": "VOUCHER_EXPIRED",
  "reason": "Mã ưu đãi đã hết hạn sử dụng."
}
```

#### 3. Exhausted Voucher (Đã hết lượt dùng)
**Response (HTTP 200 OK):**
```json
{
  "valid": false,
  "code": "SOLDOUT50",
  "discountAmount": 0,
  "errorCode": "VOUCHER_EXHAUSTED",
  "reason": "Mã ưu đãi đã hết lượt sử dụng."
}
```

#### 4. Not Started (Chưa đến ngày áp dụng)
**Response (HTTP 200 OK):**
```json
{
  "valid": false,
  "code": "XMAS2026",
  "discountAmount": 0,
  "errorCode": "VOUCHER_NOT_STARTED",
  "reason": "Mã ưu đãi chưa đến thời gian áp dụng."
}
```

---

### AC-03: Loyalty Points Preview & Insufficient Points

#### 1. Preview thành công
**Request:**
```http
POST /api/loyalty/preview
Content-Type: application/json
Authorization: Bearer <Customer_JWT>

{
  "pointsToRedeem": 50,
  "orderAmount": 200000
}
```
**Response (HTTP 200 OK):**
```json
{
  "availablePoints": 120,
  "pointsUsed": 50,
  "pointsAmount": 50000,
  "pointsToEarn": 15,
  "tier": "SILVER"
}
```

#### 2. Khách hàng không đủ điểm (Có 50 điểm nhưng yêu cầu đổi 80 điểm)
Khi gọi preview hoặc redeem vượt quá điểm hiện có:
**Response:**
```json
{
  "timestamp": "2026-11-05T16:50:00Z",
  "status": 409,
  "error": "Conflict",
  "code": "INSUFFICIENT_POINTS",
  "message": "You do not have enough points for this operation.",
  "path": "/api/loyalty/preview"
}
```

---

### AC-04: Mutation Idempotency & Release (Saga INT-47)

#### 1. Redeem Points khi đặt hàng
**Request:**
```http
POST /api/loyalty/redeem
Content-Type: application/json

{
  "customerId": 105,
  "orderId": 8001,
  "points": 50,
  "orderAmount": 200000
}
```
**Response (HTTP 200 OK):**
```json
{
  "id": 501,
  "customerId": 105,
  "orderId": 8001,
  "change": -50,
  "balanceAfter": 70,
  "type": "REDEEM",
  "createdAt": "2026-11-05T16:50:00Z"
}
```

#### 2. Release Points do đơn hàng bị hủy (Idempotent)
**Request:**
```http
POST /api/loyalty/release
Content-Type: application/json

{
  "customerId": 105,
  "points": 50,
  "orderId": 8001
}
```
**Response (HTTP 200 OK):**
```json
{
  "id": 502,
  "customerId": 105,
  "orderId": 8001,
  "change": 50,
  "balanceAfter": 120,
  "type": "RELEASE",
  "createdAt": "2026-11-05T16:52:00Z"
}
```
*Gọi lặp lại request trên sẽ nhận về cùng transaction id 502 hoặc HTTP 200/204 mà không cộng thêm điểm lần nữa.*

---

### AC-05: Chặn Client Spoofing tại Trust Boundary
Nếu client từ browser cố tình gửi kèm `customerId: 999` khác với chủ token để trừ điểm người khác hoặc hưởng ưu đãi:
- Hệ thống bỏ qua `customerId` trong body và chỉ lấy ID từ Actor Token.
- Nếu token không hợp lệ hoặc thiếu quyền:
```json
{
  "timestamp": "2026-11-05T16:50:00Z",
  "status": 403,
  "error": "Forbidden",
  "code": "FORBIDDEN",
  "message": "You do not have permission to perform this action.",
  "path": "/api/loyalty/redeem"
}
```

---

### AC-06: Vi phạm định dạng dữ liệu (Validation Errors)
Khi client gửi `code` dài > 80 ký tự, `storeId` âm, hoặc `subtotal` có phần lẻ thập phân:
**Request:**
```json
{
  "code": "VERY_LONG_CODE_EXCEEDING_EIGHTY_CHARACTERS_12345678901234567890123456789012345678901234567890",
  "storeId": -5,
  "subtotal": 150000.75
}
```
**Response (HTTP 400 Bad Request):**
```json
{
  "timestamp": "2026-11-05T16:50:00Z",
  "status": 400,
  "error": "Bad Request",
  "code": "VALIDATION_ERROR",
  "message": "The submitted information is invalid.",
  "path": "/api/promotions/vouchers/validate"
}
```

---

### AC-07: Round-trip Serializer / Deserializer Compatibility
Các DTO đảm bảo tương thích 2 chiều:
1. `VoucherValidationRequest` chấp nhận cả tên trường `subtotal` và `orderAmount`.
2. `ValidateVoucherRequest` chấp nhận cả tên trường `orderAmount` và `subtotal`.
3. `VoucherValidationResponse` và `ValidateVoucherResponse` đồng nhất hỗ trợ: `valid`, `code`, `discountAmount`, `errorCode`, `reason`.

