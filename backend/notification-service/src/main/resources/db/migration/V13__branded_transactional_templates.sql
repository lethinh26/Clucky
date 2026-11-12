INSERT INTO notification_service.mail_templates(template_key,subject_template,body_template,is_active)
VALUES
('register-otp','Clucky — Xác thực đăng ký tài khoản','Chào bạn! Cảm ơn bạn đã chọn Clucky.
Nhập mã xác thực bên dưới vào màn hình đăng ký để hoàn tất tài khoản.
Nếu bạn không đăng ký, hãy bỏ qua email này. Không chia sẻ mã với bất kỳ ai, kể cả người tự nhận là nhân viên Clucky.',true),
('reset-password-otp','Clucky — Mã đặt lại mật khẩu','Clucky nhận được yêu cầu đặt lại mật khẩu tài khoản của bạn.
Nhập mã xác thực vào màn hình quên mật khẩu để tiếp tục. Mật khẩu chỉ thay đổi sau khi bạn xác minh và chọn mật khẩu mới.
Nếu không phải bạn yêu cầu, hãy bỏ qua email này và không chia sẻ mã.',true),
('ORDER_CREATED','Clucky — Đã nhận đơn {{orderCode}}','Xin chào {{customerName}}, Clucky đã nhận đơn hàng của bạn.
Đơn đang chờ thanh toán. Vui lòng mở chi tiết đơn để xem hướng dẫn và thời hạn thanh toán; email này chưa xác nhận đã thanh toán hay cửa hàng đã chuẩn bị món.',true),
('ORDER_CONFIRMED','Clucky — Đơn {{orderCode}} đã được xác nhận','Xin chào {{customerName}}, đơn hàng của bạn đã được xác nhận.
Bạn có thể theo dõi các bước chuẩn bị tại trang chi tiết đơn. Với đơn thanh toán khi nhận, vui lòng thanh toán theo phương thức đã chọn.',true),
('ORDER_PREPARING','Clucky — Đang chuẩn bị đơn {{orderCode}}','Xin chào {{customerName}}, cửa hàng đang chuẩn bị món cho đơn hàng của bạn.
Clucky sẽ cập nhật khi món đã sẵn sàng. Vui lòng xem chi tiết đơn để theo dõi trạng thái mới nhất.',true),
('ORDER_READY','Clucky — Đơn {{orderCode}} đã sẵn sàng','Xin chào {{customerName}}, món trong đơn hàng của bạn đã được chuẩn bị xong.
{{readyInstruction}}
Vui lòng kiểm tra hình thức nhận và thông tin cửa hàng trong chi tiết đơn.',true),
('ORDER_COMPLETED','Clucky — Cảm ơn bạn! Đơn {{orderCode}} đã hoàn tất','Xin chào {{customerName}}, đơn hàng của bạn đã hoàn tất.
Cảm ơn bạn đã dùng bữa cùng Clucky. Bạn có thể mở chi tiết đơn để xem lại và đánh giá món ăn.',true),
('ORDER_CANCELLED','Clucky — Đơn {{orderCode}} đã hủy','Xin chào {{customerName}}, đơn hàng của bạn đã được hủy.
Lý do: {{reason}}
Nếu có khoản tiền cần hoàn, tiến trình hoàn tiền được cập nhật riêng. Email hủy đơn không phải xác nhận tiền đã được hoàn.',true),
('PAYMENT_CONFIRMED','Clucky — Đã ghi nhận thanh toán đơn {{orderCode}}','Clucky đã ghi nhận khoản thanh toán {{amount}} cho đơn {{orderCode}}.
Bạn có thể mở đơn hàng để xem phương thức thanh toán và trạng thái xử lý. Email này là thông báo giao dịch, không phải hóa đơn thuế.',true),
('PAYMENT_FAILED','Clucky — Cập nhật thanh toán đơn {{orderCode}}','Khoản thanh toán cho đơn {{orderCode}} chưa được xác nhận thành công.
{{paymentExplanation}}
Hãy mở đơn hàng để xem hướng xử lý. Nếu tài khoản ngân hàng đã bị trừ tiền, không chuyển thêm trước khi đối chiếu trạng thái.',true),
('REFUND_APPROVED','Clucky — Đã tiếp nhận hoàn tiền đơn {{orderCode}}','Yêu cầu hoàn tiền cho đơn {{orderCode}} đã được duyệt để xử lý.
Số tiền của yêu cầu: {{amount}}.
Đây chưa phải xác nhận tiền đã chuyển về tài khoản. Clucky sẽ cập nhật khi hoàn tiền hoàn tất hoặc cần thêm thông tin.',true),
('REFUND_REJECTED','Clucky — Kết quả yêu cầu hoàn tiền đơn {{orderCode}}','Yêu cầu hoàn tiền cho đơn {{orderCode}} đã bị từ chối.
Vui lòng đăng nhập và mở yêu cầu để xem lý do, thông tin đối chiếu và hướng xử lý. Không gửi mã OTP hay thông tin ngân hàng qua email.',true),
('REFUND_WAITING_BANK_DETAILS','Clucky — Cần cập nhật thông tin hoàn tiền đơn {{orderCode}}','Yêu cầu hoàn tiền cho đơn {{orderCode}} cần bạn kiểm tra/cập nhật thông tin nhận tiền.
Vui lòng đăng nhập và cập nhật trực tiếp trong chi tiết yêu cầu. Không trả lời email bằng số tài khoản, ảnh chứng từ hoặc mã OTP.',true),
('REFUND_PROCESSED','Clucky — Đã hoàn tiền cho đơn {{orderCode}}','Clucky đã ghi nhận hoàn tất khoản hoàn tiền {{amount}} cho đơn {{orderCode}}.
Bạn có thể đăng nhập để xem chi tiết lần hoàn. Nếu chưa thấy tiền về, hãy đối chiếu thông tin giao dịch trong yêu cầu và với ngân hàng.',true),
('BRANCH_ACTIVATE','Clucky — Kích hoạt tài khoản chi nhánh','Tài khoản chi nhánh của bạn đã sẵn sàng để kích hoạt.
Nhập mã bên dưới tại màn hình kích hoạt, kiểm tra đúng tài khoản và đặt mật khẩu. Không dùng mã này để đặt lại tài khoản khác.',true),
('BRANCH_RESET','Clucky — Đặt lại mật khẩu tài khoản quản trị','Clucky nhận được yêu cầu đặt lại mật khẩu tài khoản quản trị/nhân sự.
Nhập mã bên dưới tại màn hình khôi phục cho đúng tài khoản. Nếu không yêu cầu, hãy bỏ qua email và thông báo cho người quản lý tài khoản.',true),
('BRANCH_RECOVERY','Clucky — Xác minh email khôi phục chi nhánh','Có yêu cầu thay đổi email khôi phục của tài khoản chi nhánh.
{{channelInstruction}}
Kiểm tra tài khoản và chỉ nhập mã trong phiên quản trị đang thực hiện thao tác. Mã này không dùng để đăng nhập hoặc đặt lại mật khẩu.',true),
('BRANCH_ADMIN_RESET','Clucky — Xác nhận thao tác đặt lại mật khẩu','Bạn đang xác nhận thao tác Admin đặt lại mật khẩu tài khoản chi nhánh được liệt kê bên dưới.
Chỉ nhập mã trong phiên quản trị bạn vừa thực hiện. Nếu bạn không khởi tạo thao tác này, không cung cấp mã và kiểm tra phiên đăng nhập.',true),
('BRANCH_ADMIN_RECOVERY','Clucky — Xác nhận đổi email khôi phục','Có thao tác Admin thay đổi email khôi phục cho tài khoản chi nhánh.
{{channelInstruction}}
Chỉ nhập mã cho đúng tài khoản trong phiên quản trị đang mở. Nếu không nhận ra thao tác, không cung cấp mã.',true)
ON CONFLICT(template_key) DO UPDATE SET subject_template=EXCLUDED.subject_template,
    body_template=EXCLUDED.body_template,is_active=TRUE,updated_at=now();

UPDATE notification_service.mail_templates SET is_active=FALSE,updated_at=now()
WHERE template_key IN ('OTP_REGISTER','branch-security');

CREATE INDEX email_event_template ON notification_service.email_logs(event_id,template);
