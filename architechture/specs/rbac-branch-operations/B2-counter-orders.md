# B2 — Nhập đơn nhanh tại quầy, khách vãng lai

Mốc: D2B. Nguồn: plan §6.2. Phụ thuộc: Đợt 1, Catalog/Order; thu tiền theo C4. Áp dụng [quy tắc chung](README.md). Trạng thái: đặc tả.

## Problem Statement

Checkout online CUSTOMER-only và Order hiện bắt buộc customer không hỗ trợ nhân sự nhập đơn khách vãng lai. Gán Staff vào customerId sẽ cộng điểm, gửi email hoặc cấp review sai người.

## Solution

API quầy riêng cho Staff/Manager/Admin, tái dùng giá/tồn/đơn hiện hữu; khách không phải đăng ký. Nguồn tạo đơn và phương thức thu là hai thuộc tính độc lập.

## User Stories

1. Là Staff, tôi muốn chọn món/combo/tùy chọn/số lượng/ghi chú để nhập nhanh cho khách tại quầy.
2. Là khách vãng lai, tôi muốn mua mà không bắt tạo tài khoản.
3. Là Staff, tôi muốn chọn tiền mặt/chuyển khoản/kết hợp, xem tổng tính từ server.
4. Là Manager, tôi muốn nhập đơn quán mình với cùng điều kiện như Staff.
5. Là Admin, tôi muốn chọn rõ quán trước nhập đơn.
6. Là Staff, tôi muốn retry sau timeout không tạo trùng đơn hoặc giữ tồn hai lần.
7. Là Customer website, tôi muốn checkout hiện hữu giữ ownership và không bị đồng nhất với đơn quầy.

## Implementation Decisions

- Cart/Order sở hữu nguồn đơn và khách vãng lai. Migration mới cho phép customer thiếu trên đơn quầy, nhưng giữ invariant đơn web có Customer hợp lệ; không đổi lịch sử customerId hoặc tạo Customer giả dùng chung.
- Nguồn đề xuất WEB/COUNTER do server xác định theo operation, không tin client khai channel để vượt quyền. PICKUP/DELIVERY là fulfillment, không bằng chứng nguồn quầy; không tự mở workflow giao hàng mới.
- API quầy chỉ nhân sự; store Staff/Manager từ JWT, Admin chọn store tồn tại và được phép bán. Online checkout/preview vẫn CUSTOMER-only.
- Boundary nhận item/combo/options/quantity/note, phương thức thu, thông tin khách khi cần, idempotency key; không lấy giá/tổng/client role làm chuẩn. Server kiểm tra option thuộc món, số lượng dương, khả dụng/tồn và tính lại giá/khuyến mãi theo quy tắc hiện hữu.
- Tái dùng reserve/release inventory; create retry không giữ tồn hai lần. Failure sau reserve cần cơ chế phục hồi hiện hữu, không để giữ tồn vĩnh viễn hoặc đơn nửa chừng báo thành công.
- Rà loyalty/review/notification: thiếu Customer thì không earn vào Staff, không gửi email tài khoản nhân sự, không cấp quyền review như Customer. Không tự thêm cơ chế nhận diện khách bằng số điện thoại.
- Sau lưu trả order thật và chuyển bảng xử lý. Payment selection không chứng minh đã thu; thao tác thu do C4, state chờ/xác nhận phải theo contract Order/Payment được chốt trước mở luồng.

### Contract đề xuất

Create-counter-order output gồm orderId/code/source/customer nullable/store, snapshot items/prices/total, order state/version và payment summary. Cùng key/nội dung trả cùng đơn; key cũ khác payload trả conflict. Detail/list/reorder và consumer phải xử lý customer nullable an toàn, không fallback actorId.

## Acceptance Criteria

- AC1: Staff tạo đơn quán mình không customerId; customerId không bằng Staff và không có Customer giả phát sinh.
- AC2: Customer gọi API quầy bị từ chối; nhân sự không lách checkout web; Admin thiếu store không tạo đơn.
- AC3: Giá/option/quantity/tồn bị sửa từ client được validate/tính lại, hết hàng không bán vượt quy tắc.
- AC4: Nhấn đôi/timeout/retry cùng key chỉ một đơn và một lần giữ tồn; key khác payload bị từ chối.
- AC5: Đơn quầy không cộng điểm/gửi email/review cho Staff; đơn web vẫn giữ behavior hợp lệ.
- AC6: WEB thanh toán tại quầy vẫn là WEB; PICKUP không tự trở thành COUNTER.
- AC7: Payment thất bại hoặc chưa thu không hiển thị đã thu; đơn đã lưu có thể tra lại để tiếp tục.

## Testing Decisions

Chưa chạy. Biên chính create-order qua Gateway và đọc lại order/inventory; fault/retry ở boundary reserve/payment. Tham khảo CheckoutRegressionTest, OrderVerificationTest, LoyaltyMathTest; bổ sung trường hợp customer nullable tại consumer liên quan khi triển khai.

## Out of Scope

Ứng dụng offline, POS đầy đủ, chương trình khách vãng lai tích điểm mới, tự nhận diện khách hoặc khai thác Staff như Customer.

## Further Notes

Wire contract nguồn/khách vãng lai phải thống nhất Order, Payment, Loyalty, Review và Notification trước khi bật UI quầy.
