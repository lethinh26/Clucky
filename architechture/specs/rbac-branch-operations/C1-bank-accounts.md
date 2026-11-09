# C1 — Admin quản lý ngân hàng nhận tiền và gán quán

Mốc: D2C. Nguồn: plan §7.1. Phụ thuộc: Đợt 1, Catalog xác minh store. Áp dụng [quy tắc chung](README.md). Trạng thái: đặc tả.

## Problem Statement

Thông tin nhận tiền cần Admin quản lý tập trung, dùng chung nhiều quán nhưng không làm mất lịch sử payment hoặc ngụ ý thêm account là đã kết nối sao kê.

## Solution

Payment sở hữu danh sách tài khoản nhận tiền và gán quán; Admin CRUD/ngưng dùng/gán. Payment/QR lưu snapshot nơi nhận; Manager/Staff chỉ xem thông tin cần thu.

## User Stories

1. Là Admin, tôi muốn thêm ngân hàng/mã ngân hàng/số tài khoản/tên chủ hợp lệ vào danh sách.
2. Là Admin, tôi muốn một tài khoản nhận phục vụ nhiều quán.
3. Là Admin, tôi muốn đổi gán mà không đổi nơi nhận của đơn đang thanh toán.
4. Là Admin, tôi muốn ngưng dùng account nhưng giữ giao dịch và đối soát lịch sử.
5. Là Staff/Manager, tôi muốn xem thông tin nhận tiền được gán mà không tự sửa.
6. Là người vận hành, tôi muốn biết feed chưa kết nối thay vì thấy “tự đối soát hoạt động” giả.

## Implementation Decisions

- Payment sở hữu bank account/assignment; Catalog chỉ xác minh store qua service có xác thực, không DB join/FK. Đề xuất một account nhận hiện hành/quán, cùng account gán được nhiều store, không unique accountId toàn assignment.
- Validate field bắt buộc/độ dài/định dạng; số tài khoản là chuỗi bảo toàn số 0 đầu. Chỉ nhận thông tin tài khoản, không PAN/CVV/PIN/password ngân hàng; credentials tích hợp ở môi trường/Config Server, không form CRUD này.
- Admin create/update/deactivate/assign; Manager/Staff không ghi qua UI hoặc API. DTO đọc chỉ field phục vụ nhận tiền, không feed secret hoặc raw config.
- Payment tạo snapshot bank/code/account/holder/assignment tại lúc khởi tạo. Thay danh sách/gán chỉ tác động payment mới; snapshot cũ bất biến.
- Account có payment/giao dịch không xóa cứng; deactivate giữ lịch sử, không ngắt xử lý feed cũ khi còn khoản chờ đối soát. Đổi gán đồng thời phải có version và một kết quả current rõ.
- Chưa có account hợp lệ cho payment mới thì báo chưa khả dụng, không fallback ngân hàng quán khác. Thêm account không cấp quyền đọc sao kê; chỉ báo auto-reconciliation khi nguồn thật được kết nối/cho phép.

### Contract đề xuất

Admin operations: list/create/update/deactivate bank account, assign/unassign store theo điều kiện còn payment đang dùng; input bank metadata/storeId/version. Output account status, assignment và feed availability phân biệt. Payment creation trả snapshot/QR từ account được resolve phía server, không nơi nhận client tự chọn.

## Acceptance Criteria

- AC1: Admin thêm account hợp lệ và gán cho 001/002; không bị ràng buộc độc quyền một quán.
- AC2: Staff/Manager gửi request thay account/gán quán bị chặn; chỉ thấy field cần thiết.
- AC3: Đổi gán sau tạo payment không đổi snapshot/QR của payment cũ; payment mới dùng cấu hình mới.
- AC4: Account có giao dịch không xóa cứng; deactivate không mất ledger hoặc bỏ giao dịch gửi cho payment cũ.
- AC5: Thêm số tài khoản chưa có feed không báo đối soát tự động; không thu thông tin thẻ/password.
- AC6: Gán vào store không tồn tại hoặc conflict version bị từ chối; không fallback nơi nhận của quán khác.

## Testing Decisions

Chưa chạy. Boundary Payment qua Gateway + tạo payment trước/sau đổi gán; xác minh snapshot bền. Payment controller hiện được khảo sát là template nên không giả định có test tích hợp sẵn; bổ sung kiểm chứng API bảo vệ quyền/snapshot tối thiểu khi triển khai, tái dùng harness repo thay vì framework mới.

## Out of Scope

Kết nối ngân hàng mới không có trong kiến trúc, giữ credential khách, tự động chi tiền hoặc Manager CRUD ngân hàng.

## Further Notes

“Thẻ ngân hàng” trong yêu cầu được chuẩn hóa thành tài khoản ngân hàng nhận tiền; không mở nghiệp vụ thẻ thanh toán.
