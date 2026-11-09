# F1 — Policy và điểm vào theo vai trò

Mốc: Đợt 1. Nguồn: plan §3, §4 F1. Phụ thuộc: không. Áp dụng [quy tắc chung](README.md). Trạng thái: đặc tả, chưa nghiệm thu.

## Problem Statement

Staff có đường vào dashboard và tài liệu ca cá nhân không còn đúng mô hình mới. Chỉ ẩn menu không ngăn deep link, request trực tiếp hoặc tạo/promote Admin qua đường khác.

## Solution

Staff vào xử lý đơn, Manager vào dashboard quán, Admin vào dashboard chuỗi. Policy thống nhất ở backend và tất cả điểm điều hướng; giữ báo hết món thủ công nhưng cấm Staff sửa số lượng/ngưỡng.

## User Stories

1. Là Staff, tôi muốn đăng nhập vào xử lý đơn để không gặp màn hình sai quyền.
2. Là Staff, tôi muốn nút quay lại từ 403 và thông báo dẫn đến nơi được phép.
3. Là Staff, tôi muốn báo hết món mà không được sửa giá hoặc số lượng tồn.
4. Là Manager, tôi muốn dashboard chỉ phản ánh quán được gán.
5. Là Admin, tôi muốn tài khoản quản trị hiện hữu được giữ nhưng không ai tạo/promote Admin qua ứng dụng.

## Implementation Decisions

- React: kiểm kê login redirect, index, menu, 403 return, notification, alias/deep link. Ưu tiên route orders chung hiện có; alias cũ chuyển đúng role, không vòng lặp hoặc mở dashboard Staff.
- Identity và service liên quan: kiểm tra mọi operation tạo/cập nhật role, kể cả payload/bulk nếu tồn tại; ADMIN không nằm trong lựa chọn được tạo hoặc promote. Customer registration không nhận role từ client.
- Catalog tách action báo hết món khỏi cập nhật quantity/threshold/price. Staff không được gửi field bị cấm qua endpoint hẹp rồi được silently áp dụng.
- Review/Report chặn Staff dashboard/revenue/export tại API, không chỉ navigation. Bỏ điều kiện check-in/ca cá nhân khỏi luồng tác nghiệp mục tiêu, không thêm PIN cá nhân.
- Không sửa lịch sử audit; tài liệu đánh dấu quyết định mới thay quy tắc cũ, không coi các chức năng đợt 2 là đã có.

### Contract nghiệp vụ

Input quyền lấy từ JWT đã xác minh; backend không tin `role` hoặc `storeId` tự khai. Output profile/khả năng hiển thị phải đủ cho frontend chọn điểm vào, nhưng không thay authorization server. Request role không hợp lệ bị từ chối theo error contract, không âm thầm tạo tài khoản khác kỳ vọng.

## Acceptance Criteria

- AC1: Staff login/index/403/deep link/notification không vào dashboard; truy cập trực tiếp API doanh thu bị chặn.
- AC2: Staff sửa quantity/threshold/price bằng request trực tiếp không thay dữ liệu; báo hết món quán mình vẫn được phép.
- AC3: Manager không xem dashboard quán khác dù sửa query; Admin có phạm vi chuỗi theo quyền hiện hữu.
- AC4: Mọi đường create/promote ADMIN bị chặn; Customer không đăng ký role nội bộ; Admin cũ vẫn đăng nhập.
- AC5: Không yêu cầu Staff check-in, không giới thiệu số liệu ca/cá nhân giả.

## Testing Decisions

Chưa chạy. Biên chính: request qua Gateway theo ma trận role/store và điều hướng sau xác thực. Tham khảo test AuthControllerCookie, Gateway SecurityConfig và frontend auth-api; bổ sung kiểm chứng hành vi route, không snapshot toàn component. Người dùng kiểm tra deep link/403/notification khi nghiệm thu.

## Out of Scope

Thiết kế workspace mới, cấp cặp tài khoản, reports thật và thay hệ thống login thuộc B1/A1/E1; không viết lại Identity trong đợt fix.

## Further Notes

Bàn giao bảng action → role → store và danh sách điểm điều hướng đã sửa. Chức năng thiếu backend vẫn khóa theo F4.
