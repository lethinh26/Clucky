# Chính sách phiên đăng nhập cho tài khoản nội bộ (PR5)

## Quy tắc

- ADMIN, STORE_MANAGER và STAFF được cấp tối đa **3 phiên đăng nhập** theo mặc định. ADMIN và STORE_MANAGER được phép đặt hạn mức từ **1–10** qua API quản lý phiên. STAFF chỉ có thể đăng xuất bình thường, không có API/giao diện quản lý phiên.
- Số phiên hoạt động dựa vào ledger `identity_service.auth_sessions`: `revoked_at IS NULL` và `refresh_expires_at > now()`. Một phiên là một lần đăng nhập của trình duyệt, **không** chứng thực danh tính nhân viên sử dụng tài khoản STAFF dùng chung hay thiết bị vật lý.
- Đăng nhập khi đạt hạn mức và giảm hạn mức xuống thấp hơn số phiên hiện có đều trả **HTTP 409** (`RESOURCE_CONFLICT`, `fieldErrors.sessionLimit` là `REACHED` hoặc `BELOW_ACTIVE_COUNT`). Không tự thu hồi phiên cũ hoặc kích hoạt chiến lược LRU.
- Giới hạn, tạo phiên, refresh và thu hồi dùng cùng thứ tự khóa **hàng users trước**, sau đó cập nhật ledger và refresh tokens. User row lock khi đăng nhập được giữ tới khi transaction commit để hai login đồng thời không lấy trùng slot.
- Refresh JWT xoay `jti`, **giữ nguyên `sid`**, và token hash mới phải gắn với cùng session ledger. Refresh đối chiếu `sub`, `sid`, trạng thái phiên, role/store hiện tại; một session đã thu hồi không được tái tạo qua refresh. `last_seen_at` được cập nhật khi refresh, không phải heartbeat.
- Thu hồi ghi Redis `auth:revoked:sid:<sid>` với TTL > refresh TTL + access TTL để **API Gateway và mọi backend service** từ chối access JWT cũ; đồng thời cập nhật DB và thu hồi token refresh của toàn bộ `sid`. Thao tác không được thành công khi Redis không sẵn sàng. Các thao tác thu hồi toàn tài khoản tiếp tục ghi Redis user watermark.

## Phân quyền

| Vai trò | Phiên của mình | Phiên tài khoản chi nhánh |
| --- | --- | --- |
| ADMIN | Xem / chỉnh giới hạn / thu hồi | STAFF + STORE_MANAGER tại mọi chi nhánh |
| STORE_MANAGER | Xem / chỉnh giới hạn / thu hồi | Chỉ STAFF hiện hành cùng chi nhánh |
| STAFF | **Không có API/UI quản lý phiên**; đăng xuất bình thường | Không |

Tất cả thao tác backend phải kiểm tra lại vai trò/status/chi nhánh trong DB, không dựa riêng vào dữ liệu JWT hay UI. Mỗi thay đổi cấu hình/thu hồi thủ công được audit với actor + target.

## Chính sách chuyển tiếp và sự cố

Migration `V14` bổ sung `refresh_tokens.session_id` có thể NULL cho token hash cũ. Vì không giữ JWT gốc, **không thể khôi phục `sid` từ hash**. Sau nâng cấp, refresh cũ của ADMIN/STORE_MANAGER/STAFF bị từ chối (401) và người dùng phải đăng nhập lại. Access JWT đã cấp trước deploy có thể tồn tại đến tối đa access TTL (mặc định 30 phút); cần lên lịch cutover phù hợp hoặc thu hồi toàn bộ tài khoản nội bộ bằng Redis user watermark nếu yêu cầu chặn ngay lập tức. Khách hàng cũ vẫn có thể refresh theo luồng legacy; phiên đăng nhập mới đều có ledger.

Không có transaction hai pha giữa PostgreSQL và Redis. Mã ghi Redis denylist trước khi commit thay đổi SQL: lỗi Redis sẽ khiến transaction thất bại (fail-closed), còn lỗi SQL/commit phát sinh sau khi Redis được ghi có thể để lại một phiên ở DB nhưng access/refresh token vẫn bị Redis chặn. Cần giám sát sai lệch và dùng thao tác thu hồi lại để đồng bộ; không tự động xóa Redis denylist để tránh phục hồi token đã lộ.

Điều chỉnh hạn mức qua API được ràng buộc 1–10 ở cả validation và CHECK DB. `user_agent` chỉ là chuỗi đã giới hạn 240 ký tự và không được coi là dấu vết định danh đáng tin cậy.
