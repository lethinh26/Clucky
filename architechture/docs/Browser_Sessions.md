# Phiên trình duyệt — cập nhật 08/11/2026

## Hợp đồng
- Customer gửi `X-Clucky-Client: customer`; React quản trị gửi `admin`. Chỉ CUSTOMER được cấp phiên customer; ADMIN/STORE_MANAGER/STAFF được cấp phiên admin. Header chọn cookie, không cấp quyền.
- Identity cấp access và refresh qua Set-Cookie ở login, verify-otp và Google complete/login. JSON chỉ có `userId`, `role`, `storeId`, `email`, `fullName`. Pending Google và Firebase ID token là credential trao đổi tạm thời, chỉ giữ trong bộ nhớ, không phải token phiên Clucky.
- Cookie host-only, HttpOnly, SameSite=Lax; access Path=/api, refresh Path=/api/auth. Dùng `AUTH_COOKIE_SECURE=true` với HTTPS production; local HTTP dùng false. Hai ứng dụng trên hai port cùng host không ghi đè cookie của nhau.
- Access cookie giữ đến refresh TTL để JWT hết hạn vẫn tạo 401, không tự biến giỏ customer thành guest khi trình duyệt xóa cookie. JWT vẫn kiểm tra expiration, issuer, audience và revocation; cookie dài hạn không kéo dài quyền của JWT.
- Gateway xử lý CORS trước Security; 401/403 có CORS cho origin hợp lệ. Origin allow-list theo client nằm ở Config Server: `clucky.auth.customer-origins`, `clucky.auth.admin-origins`. Override bằng `AUTH_CUSTOMER_ORIGINS`/`AUTH_ADMIN_ORIGINS` hoặc `FRONTEND_CUSTOMER_URL`/`FRONTEND_ADMIN_URL`. Không dùng wildcard với credential.
- POST/PUT/PATCH/DELETE mang cookie và các mutation `/api/auth/**` phải có Origin hợp lệ theo client. SameSite không thay thế CSRF. Gateway relay Bearer tới service, bỏ Cookie khỏi request ngoài `/api/auth/**`; frontend không gọi business service trực tiếp.

## Vòng đời
- Bootstrap GET /api/auth/session để khôi phục user; không decode JWT trong JavaScript. Access hết hạn: dùng một refresh đang chạy chung trong tab, retry request tối đa một lần. Không refresh lỗi 403 hoặc lỗi đăng nhập.
- Web Locks phối hợp các tab cùng origin: kiểm tra session sau khi lấy lock trước khi rotate. `storage` event chỉ mang mã thông báo thay đổi, không mang token/user. Login/logout dùng cùng lock. Production yêu cầu HTTPS. Trình duyệt không có Web Locks chỉ được single-flight trong một tab; cần cơ chế phối hợp tương đương nếu hỗ trợ đồng thời nhiều tab trên các trình duyệt đó.
- Refresh hết hạn/revoked: xóa cookie ở Identity, kết thúc trạng thái user; trang cần đăng nhập chuyển về login. Lỗi mạng/5xx không xóa phiên hợp lệ. Logout thu hồi sid hiện tại và chỉ xóa cặp cookie của client đó.
- Sau login thường/OTP/Google, provider merge guest cart rồi tải cart customer. Merge lỗi được hiển thị; guest ID/giỏ Redis chỉ bị bỏ sau thành công. Dữ liệu giỏ/đơn không phục hồi từ cache localStorage dùng chung giữa tài khoản. Response thuộc phiên cũ bị bỏ khi đổi user/logout.
- Token localStorage cũ bị dọn. Cookie refresh legacy bị xóa khi cấp/kết thúc phiên mới; người dùng phiên cũ cần đăng nhập lại. Không xóa volume/database.

## Checklist người dùng tự chạy
1. Login email, OTP và Google; reload giữ phiên. Storage không có access/refresh token trong localStorage; cả hai cookie có HttpOnly và thuộc tính đúng môi trường.
2. Đặt access TTL ngắn, mở cart/orders, đợi hết hạn: một lần refresh cho request đồng thời, retry thành công; UI không báo lỗi mạng do CORS. Network vẫn có thể ghi nhận 401 ban đầu trước refresh.
3. Mở hai tab cùng ứng dụng, hết hạn đồng thời: không replay refresh token. Đăng nhập customer và admin cùng trình duyệt; logout một bên không đăng xuất bên còn lại.
4. Refresh hết hạn/revoked: không lặp vô hạn, quay về login ở trang bảo vệ; lỗi 503/network không giả làm logout. Request hoàn thành muộn không ghi lại dữ liệu user cũ.
5. Giỏ guest có món → login bằng từng luồng → merge, tải lại giỏ; giả lập merge lỗi phải giữ giỏ guest và hiện lỗi. Đổi user không lộ giỏ/đơn của user trước.
6. Origin lạ, thiếu Origin trên mutation dùng cookie, chọn client không thuộc Origin: bị từ chối; OPTIONS hợp lệ và 401/403 có CORS đúng.

Kiểm thử bổ sung (chưa chạy): `node --test tests/api.test.mjs` từ frontend/nextjs; `AuthControllerCookieTest` (identity-service), `SecurityConfigTest` (api-gateway), và fixture UI auth/cart. Không tự build/restart Docker; container hiện có vẫn chạy image cũ cho đến khi rebuild theo yêu cầu.
