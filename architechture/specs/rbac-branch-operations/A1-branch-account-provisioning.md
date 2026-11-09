# A1 — Cấp cặp tài khoản chi nhánh và kích hoạt

Mốc: D2A. Nguồn: plan §5.1. Phụ thuộc: Đợt 1; A3 trước áp unique lên dữ liệu cũ. Áp dụng [quy tắc chung](README.md). Trạng thái: đặc tả, chưa triển khai.

## Problem Statement

Mô hình nhân sự nhiều tài khoản và đăng nhập email duy nhất không phù hợp một Manager + một Staff dùng chung mỗi quán; retry tạo quán có thể tạo thiếu hoặc trùng tài khoản.

## Solution

Admin tạo quán cùng email recovery; Catalog giữ quán chưa sẵn sàng mở bán đến khi provision đủ cặp. Identity cấp định danh nội bộ ổn định, kích hoạt bằng token có hạn, không mật khẩu mặc định.

## User Stories

1. Là Admin, tôi muốn tạo quán và cặp Manager/Staff trong một quy trình theo dõi được.
2. Là Admin, tôi muốn retry lỗi mà không tạo thêm tài khoản hoặc xóa dữ liệu đã thành công.
3. Là Manager, tôi muốn dùng email recovery chung nhưng định danh đăng nhập hai tài khoản khác nhau.
4. Là Manager, tôi muốn xác minh email và đặt mật khẩu an toàn cho từng tài khoản đích.
5. Là Staff, tôi muốn đăng nhập nhiều thiết bị bằng cùng tài khoản tác nghiệp.
6. Là Customer/Admin hiện hữu, tôi muốn tiếp tục đăng nhập email như trước.

## Implementation Decisions

- Catalog sở hữu quán/trạng thái readiness; Identity sở hữu account/login/recovery/activation. Không FK xuyên service; giao tiếp nội bộ có xác thực.
- Identity tạo cả hai account trong một transaction, unique cặp store/role trên tài khoản vận hành hiện hành. Khóa tạm vẫn chiếm slot; không dùng khóa làm cách tạo account thứ hai.
- Provision idempotent theo store và request; phản hồi chứa kết quả cặp account, không password/token bí mật. Catalog chỉ hoàn tất provisioning khi xác minh đủ hai account; không mở bán khi thiếu cặp. Các điều kiện mở bán khác vẫn giữ.
- Đề xuất login `manager.<maquan>` và `staff.<maquan>` ổn định, normalize/unique ở server; không dùng một recovery email làm email login duy nhất cho hai user. Customer/Admin giữ email login.
- Xác minh email rồi đặt password bằng token một lần, hết hạn, gắn đúng target/purpose. Gửi lại token không tạo account mới; token cũ không được replay. Không plaintext password trong email/log/event.
- UI Admin hiển thị provisioning/activation và lỗi có thể retry, không báo quán hoàn tất khi mới lưu Catalog. Identity thành công nhưng response thất lạc phải tra/retry cùng key, không rollback bằng xóa account.

### Contract đề xuất

Create store: thông tin quán hợp lệ, recovery email, idempotency key; actor Admin từ JWT. Provision nội bộ: storeId, mã quán ổn định, recovery email, request/correlation ID. Kết quả: storeId, trạng thái provision, hai accountId/login/role và activation status; không trả credential. Activate: token gắn account + password đúng policy; output trạng thái account đã kích hoạt.

Schema mở rộng bằng migration mới, hỗ trợ login nội bộ riêng với recovery email đã xác minh và unique current slot. Dữ liệu cũ chuyển theo A3 trước khi bật ràng buộc cho toàn bộ quán.

## Acceptance Criteria

- AC1: Tạo quán hợp lệ có đúng một STORE_MANAGER và một STAFF; retry/đồng thời không tạo bản thứ ba.
- AC2: Identity lỗi giữa chừng không lưu nửa cặp; Catalog không mở bán vì mới tạo được quán.
- AC3: Response thất lạc sau commit rồi retry trả lại cùng cặp; không xóa account/quán đã có.
- AC4: Account bị khóa vẫn chiếm slot; API tạo account thứ hai hoặc role ADMIN bị chặn.
- AC5: Recovery email chung không xung đột login; Customer/Admin đăng nhập email không hồi quy.
- AC6: Token hết hạn/đã dùng/sai target không kích hoạt; không mật khẩu mặc định hoặc lộ bí mật.
- AC7: Hai thiết bị Staff cùng đăng nhập hoạt động, không logout thiết bị trước chỉ vì login mới.

## Testing Decisions

Chưa chạy. Boundary chính tạo quán qua Gateway và quan sát readiness/cặp tài khoản; mô phỏng retry/lỗi tại REST nội bộ. Tham khảo AuthServiceTest, EmailEventPublisherTest và AuthControllerCookieTest. Không coi email đã enqueue là đã kích hoạt.

## Out of Scope

Thêm Staff cá nhân, ca/PIN/chấm công, tạo Admin, hệ thống Identity mới hoặc xóa lịch sử user.

## Further Notes

Tên trạng thái readiness/activation và wire API là đề xuất kỹ thuật cần ghi vào API/database khi thực thi; không đổi quyết định một cặp/quán.
