# M5 Sprint 1 — Báo cáo kiểm chứng UI: Promotion & Notification Shared Components

## 1. Thông tin chung

- **Task ID:** UI-45
- **Tên Task:** Promotion + Notification visual components: voucher badge, points tier, notification item
- **PIC:** M5 (Cao Tất Thành)
- **Deliverable:** `Shared FE components`
- **Phạm vi bàn giao:**
  - `frontend/nextjs/components/promotion/*`: `voucher-badge.tsx`, `points-tier.tsx`, `promotion-shared.module.css`, `index.ts`
  - `frontend/nextjs/components/notification/*`: `notification-item.tsx`, `notification-shared.module.css`, `index.ts`
  - `frontend/nextjs/lib/types/promotion.ts`, `frontend/nextjs/lib/types/notification.ts`
  - `frontend/nextjs/lib/promotion.ts`, `frontend/nextjs/lib/notification.ts`
  - `frontend/react/src/types/promotion.ts`, `frontend/react/src/types/notification.ts`
  - `frontend/react/src/components/ui/VoucherBadge.tsx`, `PointsTier.tsx`, `NotificationItem.tsx`
  - Unit tests: `frontend/nextjs/tests/promotion-notification.test.mjs`, `frontend/react/tests/promotion-notification.test.mjs`

---

## 2. Đối chiếu đặc tả & thiết kế nghiệp vụ

### 2.1. Voucher Badge (`VoucherBadge`)
- **Loại chiết khấu:** `PERCENT` (ví dụ giảm 15% tối đa 50.000đ) và `AMOUNT` (ví dụ giảm 30.000đ).
- **Phạm vi áp dụng (scope):** `ALL` (toàn chuỗi) và `STORE` (áp dụng theo `storeId` / `storeName`).
- **Trạng thái vòng đời voucher:**
  - `ACTIVE`: Khả dụng, đang trong thời hạn và còn lượt dùng.
  - `EXPIRED`: Đã quá hạn `end_at`.
  - `UPCOMING`: Chưa đến thời gian bắt đầu `start_at`.
  - `EXHAUSTED`: Đã đạt giới hạn lượt sử dụng `used_count >= total_limit`.
  - `DISABLED`: Tạm khóa bởi Admin.
- **Biến thể hiển thị:**
  - `badge`: Dạng pill chuẩn có dot trạng thái, code và thông tin giảm giá.
  - `card`: Thẻ voucher phiếu giảm giá (dashed border kiểu coupon) dùng trong trang checkout/danh sách ưu đãi, hỗ trợ nút sao chép mã (copyable feedback) và nút áp dụng (`onApply`).
  - `compact`: Dạng chip rút gọn thích hợp nhúng trong item tóm tắt đơn hàng.
- **Xử lý phòng thủ (defensive handling):** Kiểm tra input rỗng/null, giá trị âm hoặc NaN; tự động fallback nhãn an toàn, không crash giao diện.

### 2.2. Điểm & Hạng thành viên (`PointsTier`)
- **Cấp bậc hội viên (Loyalty Tier):** Chuẩn hóa theo `schema.sql` gồm 3 bậc:
  - `MEMBER` (0 – 999 điểm): Tích điểm cơ bản (10.000đ = 1 điểm).
  - `SILVER` (1.000 – 4.999 điểm): Giảm trực tiếp 3% hóa đơn, nhân đôi điểm sinh nhật.
  - `GOLD` (từ 5.000 điểm trở lên): Giảm trực tiếp 5% hóa đơn, ưu tiên CSKH, quà tặng định kỳ.
- **Tính toán tiến độ lên hạng:**
  - Tự động xác định tier hiện tại, tier kế tiếp và số điểm cần tích lũy thêm.
  - Thanh tiến độ trực quan với `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`.
  - Khi đạt hạng cao nhất (`GOLD`), hiển thị nhãn "Hạng cao nhất" (Max tier) và danh sách đặc quyền VIP.
- **Trạng thái UI:**
  - `loading`: Hiệu ứng shimmer skeleton cho card và compact badge.
  - `error`: Box thông báo lỗi thân thiện kèm nút "Thử lại" (`onRetry`).
  - `isGuest`: Hiển thị lời kêu gọi đăng nhập tích điểm kèm nút action.
  - Biến thể: `card`, `compact`, `badge`.

### 2.3. Thông báo (`NotificationItem`)
- **4 Loại thông báo domain:**
  - `ORDER`: Đơn hàng (icon Giỏ hàng, badge màu vàng cam ấm).
  - `PAYMENT`: Thanh toán (icon Thẻ thanh toán, badge màu xanh lá).
  - `PROMOTION`: Khuyến mãi (icon Tag quà tặng, badge màu đỏ rượu).
  - `SYSTEM`: Hệ thống (icon Chuông thông báo, badge màu xanh lam).
- **Trạng thái đọc/chưa đọc:**
  - Chưa đọc (`isRead = false`): Dot cam nổi bật, viền highlight ấm, font chữ đậm hơn.
  - Đã đọc (`isRead = true`): Nền trắng thanh lịch, hiển thị rõ ràng.
- **Thời gian định dạng thân thiện (Relative time):**
  - "Vừa xong" (<1 phút), "X phút trước", "X giờ trước", "X ngày trước", hoặc định dạng ngày `DD/MM/YYYY`.
- **Tương tác:**
  - Hỗ trợ click mở chi tiết hoặc liên kết (`refId` / `link`).
  - Nút "Đánh dấu đã đọc" (icon check) và "Xóa" (icon thùng rác).
  - Bàn phím điều hướng (hỗ trợ Enter / Space, focus outline chuẩn WCAG).
  - Shimmer skeleton loading state khi dữ liệu danh sách đang tải.

---

## 3. Lệnh kiểm chứng và kết quả thực tế

### 3.1. Unit tests Next.js
Lệnh thực thi:
```powershell
npm --prefix Clucky/frontend/nextjs test
```
Kết quả:
- **29/29 tests PASS** (100% pass), bao gồm:
  - 10 test case mới cho Promotion & Notification logic (validation, tier calculation, formatting, immutable mutations).
  - 19 test case hiện có của cart, order, vietqr, loading-store.

### 3.2. Unit tests React Admin
Lệnh thực thi:
```powershell
npm --prefix Clucky/frontend/react test
```
Kết quả:
- **9/9 tests PASS** (100% pass).

### 3.3. Kiểm tra ESLint
Lệnh thực thi:
```powershell
npm --prefix Clucky/frontend/nextjs run lint
npm --prefix Clucky/frontend/react run lint
```
Kết quả:
- **0 errors** ở cả hai frontend.

### 3.4. Production Build
Lệnh thực thi:
```powershell
npm --prefix Clucky/frontend/react run build
npm --prefix Clucky/frontend/nextjs run build
```
Kết quả:
- React Admin: Build thành công (Vite, bundle output sạch sẽ).
- Next.js Customer: Build production thành công 25/25 static pages không gặp bất kỳ lỗi biên dịch nào.

---

## 4. Xác nhận tiêu chuẩn an toàn & phạm vi

1. **Bảo toàn Deliverable:** Giữ đúng `Shared FE components`, phục vụ chia sẻ và tái sử dụng cho các màn hình Sprint tiếp theo.
2. **Không vi phạm kiến trúc:** Không hardcode secret, không import trực tiếp backend service URLs, tuân thủ mô hình Gateway.
3. **Phân tách trách nhiệm:** Quản lý đúng phạm vi Promotion + Notification, không can thiệp trái thẩm quyền sang domain khác.
4. **Giữ backlog Phase 2:** Các hạng mục avatar/banner và proposal voucher giữ đúng trong backlog theo kế hoạch, không đánh đồng là đã hoàn tất.

