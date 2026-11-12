INSERT INTO notification_service.mail_templates(template_key,subject_template,body_template,is_active)
VALUES
('register-otp','Clucky — Xác thực email của bạn','Chào bạn, chỉ còn một bước nữa thôi.
Nhập mã bên dưới tại màn hình đăng ký để hoàn tất tài khoản Clucky.',true),
('reset-password-otp','Clucky — Mã đặt lại mật khẩu','Bạn vừa yêu cầu đặt lại mật khẩu.
Nhập mã bên dưới trong phiên khôi phục đang mở để tiếp tục.',true),
('ORDER_CREATED','Clucky — Đã nhận đơn {{orderCode}}','Chào {{customerName}}, Clucky đã nhận đơn của bạn.
Đơn đang chờ thanh toán. Mở chi tiết đơn để xem hướng dẫn và thời hạn thanh toán.',true),
('ORDER_CONFIRMED','Clucky — Đơn {{orderCode}} đã được xác nhận','Chào {{customerName}}, cửa hàng đã nhận đơn của bạn.
Clucky sẽ cập nhật khi món đã sẵn sàng.',true),
('ORDER_PREPARING','Clucky — Đang chuẩn bị đơn {{orderCode}}','Chào {{customerName}}, cửa hàng đang chuẩn bị món cho bạn.
Clucky sẽ thông báo khi đơn đã sẵn sàng.',true),
('ORDER_READY','Clucky — Đơn {{orderCode}} đã sẵn sàng','Chào {{customerName}}, món của bạn đã được chuẩn bị xong.
{{readyInstruction}}',true),
('ORDER_COMPLETED','Clucky — Cảm ơn bạn! Đơn {{orderCode}} đã hoàn tất','Chào {{customerName}}, đơn hàng của bạn đã hoàn tất.
Cảm ơn bạn đã dùng bữa cùng Clucky. Mở chi tiết đơn để xem lại và đánh giá món ăn.',true),
('ORDER_CANCELLED','Clucky — Đơn {{orderCode}} đã hủy','Chào {{customerName}}, đơn hàng của bạn đã được hủy.
Lý do: {{reason}}',true),
('PAYMENT_CONFIRMED','Clucky — Đã ghi nhận thanh toán đơn {{orderCode}}','Clucky đã ghi nhận thanh toán của bạn.
Bạn có thể xem thông tin giao dịch và tiến trình xử lý trong chi tiết đơn.',true),
('PAYMENT_FAILED','Clucky — Cập nhật thanh toán đơn {{orderCode}}','Khoản thanh toán của bạn chưa được xác nhận thành công.
Vui lòng mở chi tiết đơn để kiểm tra và xem hướng xử lý.',true),
('REFUND_APPROVED','Clucky — Đã tiếp nhận hoàn tiền đơn {{orderCode}}','Yêu cầu hoàn tiền của bạn đã được duyệt để xử lý.
Clucky sẽ cập nhật khi hoàn tiền hoàn tất hoặc cần thêm thông tin.',true),
('REFUND_REJECTED','Clucky — Kết quả yêu cầu hoàn tiền đơn {{orderCode}}','Yêu cầu hoàn tiền của bạn đã bị từ chối.
Vui lòng đăng nhập và mở yêu cầu để xem lý do và hướng xử lý.',true),
('REFUND_WAITING_BANK_DETAILS','Clucky — Cần cập nhật thông tin hoàn tiền đơn {{orderCode}}','Yêu cầu hoàn tiền cần bạn kiểm tra thông tin nhận tiền.
Vui lòng đăng nhập và cập nhật trực tiếp trong chi tiết yêu cầu.',true),
('REFUND_PROCESSED','Clucky — Đã hoàn tiền cho đơn {{orderCode}}','Clucky đã ghi nhận hoàn tất khoản hoàn tiền của bạn.
Bạn có thể mở yêu cầu để xem và đối chiếu thông tin giao dịch.',true),
('BRANCH_ACTIVATE','Clucky — Kích hoạt tài khoản chi nhánh','Tài khoản chi nhánh của bạn đã sẵn sàng.
Nhập mã bên dưới tại màn hình kích hoạt để xác minh và đặt mật khẩu.',true),
('BRANCH_RESET','Clucky — Đặt lại mật khẩu tài khoản quản trị','Bạn vừa yêu cầu đặt lại mật khẩu tài khoản quản trị/nhân sự.
Nhập mã bên dưới trong phiên khôi phục cho đúng tài khoản.',true),
('BRANCH_RECOVERY','Clucky — Xác minh email khôi phục chi nhánh','Có yêu cầu thay đổi email khôi phục của tài khoản bên dưới.
{{channelInstruction}}
Chỉ nhập mã trong phiên quản trị bạn đang thực hiện.',true),
('BRANCH_ADMIN_RESET','Clucky — Xác nhận thao tác đặt lại mật khẩu','Bạn đang xác nhận thao tác Admin đặt lại mật khẩu cho tài khoản bên dưới.
Chỉ nhập mã trong phiên quản trị bạn vừa thực hiện.',true),
('BRANCH_ADMIN_RECOVERY','Clucky — Xác nhận đổi email khôi phục','Bạn đang xác nhận thao tác Admin đổi email khôi phục cho tài khoản bên dưới.
{{channelInstruction}}
Chỉ nhập mã trong phiên quản trị bạn vừa thực hiện.',true)
ON CONFLICT(template_key) DO UPDATE SET subject_template=EXCLUDED.subject_template,
    body_template=EXCLUDED.body_template,updated_at=now();
