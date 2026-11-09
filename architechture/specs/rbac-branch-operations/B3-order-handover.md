# B3 — Xử lý đơn, thu tiền và bàn giao

Mốc: D2B phối hợp D2C. Nguồn: plan §6.3. Phụ thuộc: F3, C4 cho thao tác thu. Áp dụng [quy tắc chung](README.md). Trạng thái: đặc tả.

## Problem Statement

Thu tiền và hoàn tất đơn từng bị gộp thành một trạng thái; lỗi giữa Payment/Order hoặc hai máy thao tác có thể ghi thu hai lần, hoàn tất sớm hoặc hủy món đã chế biến.

## Solution

PICKUP đi CONFIRMED → PREPARING → READY → COMPLETED. Nút “Đã thu tiền & bàn giao” là một thao tác UI nhưng hai nghiệp vụ bền riêng biệt, retry đúng phần còn thiếu.

## User Stories

1. Là Staff, tôi muốn xử lý đơn quán mình theo từng bước rõ ràng.
2. Là Staff, tôi muốn thu và bàn giao tại READY mà không cần hai màn hình rời.
3. Là Staff, tôi muốn biết tiền đã ghi nhận dù Order chưa hoàn tất, để không thu lần hai.
4. Là Customer đã thanh toán online, tôi muốn đơn chỉ hoàn tất khi thật sự bàn giao.
5. Là Manager/Admin, tôi muốn cùng điều kiện state, không quyền hủy vượt PREPARING.

## Implementation Decisions

- Order giữ state/history/reason/version; Payment giữ chứng cứ ghi thu. Không distributed SQL transaction; dùng kết quả/API/event tin cậy giữa service.
- Hủy chỉ PENDING_PAYMENT/CONFIRMED có lý do; giữ chống race F3 ở mọi đường. Generic status không được bỏ qua điều kiện hoàn tất.
- Tại READY/PICKUP, UI đọc payment summary. Chưa thu: ghi thu C4 bằng key ổn định; sau Payment success mới yêu cầu bàn giao/complete Order. Đã trả đủ/được chấp nhận đúng nghiệp vụ: không ghi thu lại.
- Payment success/Order failure trả và hiển thị hai kết quả riêng; retry chỉ complete sau xác minh payment. Nếu Payment response timeout, tra kết quả bằng key trước kết luận chưa thu.
- Complete yêu cầu quyền/store/READY/version và bằng chứng trạng thái tiền phù hợp từ server; không nhận `paid=true` client. Hai máy hoàn tất phải idempotent, không phát nghiệp vụ hoàn tất/earn points hai lần.
- DELIVERY không trở thành đã giao chỉ vì thu tiền tại quầy; không nối nút PICKUP sang shipping/tracking. Giữ MVP tạo shipment, không giả vận chuyển hoàn tất.

### Contract đề xuất

Collection operation trả receipt/payment status; handover operation nhận orderId/concurrency token/idempotency key và trả state đã commit. UI giữ cả collection result và fulfillment result. PAID/accepted payment và COMPLETED là hai trạng thái độc lập; không dùng một boolean success che lỗi một nửa.

## Acceptance Criteria

- AC1: PICKUP chỉ complete từ READY với điều kiện tiền hợp lệ; request trực tiếp không bypass.
- AC2: Online PAID không tự COMPLETED; chỉ bàn giao hợp lệ mới complete.
- AC3: Payment success, Order 5xx → hiện đã thu/chờ hoàn tất; retry không thêm receipt hoặc success event tiền.
- AC4: Payment timeout sau commit → tra/retry cùng key, không thu lại bằng key mới tự động.
- AC5: Hai máy complete/hủy/prepare cạnh tranh chỉ commit transition hợp lệ; không duplicate completion.
- AC6: Thu tiền DELIVERY không đánh delivered/COMPLETED; hủy từ PREPARING bị chặn kể cả Admin.

## Testing Decisions

Chưa chạy. Biên chính Gateway cho collection + handover, fault injection tại kết nối Payment/Order và readback; tham khảo CheckoutRegressionTest/OrderVerificationTest. Kiểm tra behavior của replay event, không chỉ toast UI.

## Out of Scope

Shipping Phase 2, tích hợp đối tác, khiếu nại, hoàn tiền sau chế biến, transaction xuyên database.

## Further Notes

Không mở nút thu/bàn giao gộp trước C4 và điều kiện complete server-side sẵn sàng.
