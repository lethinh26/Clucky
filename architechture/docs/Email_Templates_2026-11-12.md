# Email Clucky — inventory và wiring (12/11/2026)

## Phạm vi

19 template đang hoạt động: **14 Customer + 5 bảo mật tài khoản nhân sự/Admin**. Hai key cũ `OTP_REGISTER`, `branch-security` được giữ để đọc lịch sử nhưng không dùng render mới; tổng cộng 21 bản ghi seed. Không có email marketing hay danh sách Admin nhận thông báo đơn hàng tự suy đoán.

V14 áp dụng mẫu OTP/order đã được người dùng duyệt cho cả 19 key; không sửa migration V13 đã chạy. Layout chung: card trắng 560px, nền sáng #F7F5F2, logo gốc 80px nhúng CID `clucky-logo-v1`, heading ngắn căn giữa, khoảng trắng gọn và footer nhẹ bên ngoài card. Fredoka/Quicksand có Arial fallback; không tải webfont/tracking pixel. Email client có thể chặn hình ảnh, nên tên thương hiệu/nội dung vẫn có dạng chữ. HTML được escape và đi kèm bản text đầy đủ.

**Cả 7 email xác thực (2 Customer + 5 nhân sự/Admin) không có nút hoặc liên kết mở ứng dụng.** Mã dùng một lần và thời điểm hết hạn tuyệt đối theo giờ Việt Nam vẫn hiện rõ; không thay bằng thời hạn tương đối có thể sai khi thư đến trễ. Các email giao dịch có một nút căn giữa bằng table/align, dựng từ customer origin cấu hình và orderId; bản text có URL tương ứng. Không đưa địa chỉ localhost hay dữ liệu mẫu từ bản HTML duyệt vào nội dung thực tế.

## Customer — 14 template

| Template | Trigger thực tế | Người dùng nhận được |
| --- | --- | --- |
| `register-otp` | Identity đăng ký / gửi lại mã → `email.requested` | OTP 6 số và hạn tuyệt đối để hoàn tất xác thực |
| `reset-password-otp` | Identity quên mật khẩu / gửi lại mã → `email.requested` | OTP 6 số, hạn tuyệt đối, cảnh báo không chia sẻ |
| `ORDER_CREATED` | `order.created`, trạng thái `PENDING_PAYMENT` | Đã nhận đơn nhưng còn chờ thanh toán; mở đơn xem hướng dẫn/thời hạn |
| `ORDER_CONFIRMED` | `order.created` đã `CONFIRMED` (COD), hoặc `order.status-changed` → `CONFIRMED` | Xác nhận cửa hàng nhận đơn, không khẳng định COD đã trả tiền |
| `ORDER_PREPARING` | `order.status-changed` → `PREPARING` | Đang chuẩn bị món |
| `ORDER_READY` | `order.status-changed` → `READY` | Sẵn sàng nhận món; phân biệt nhận tại cửa hàng với giao hàng, không giả lập tracking |
| `ORDER_COMPLETED` | `order.completed` | Đơn hoàn tất, mở đơn để xem lại/đánh giá |
| `ORDER_CANCELLED` | `order.cancelled` | Hủy đơn, lý do hoặc hướng dẫn xem ứng dụng; không khẳng định đã hoàn tiền |
| `PAYMENT_CONFIRMED` | Payment `payment.confirmed`, không phải `operationType=COLLECTION` | Đã ghi nhận thanh toán, số tiền VND; không tự nhận là hóa đơn thuế |
| `PAYMENT_FAILED` | Payment `payment.failed` | Chưa xác nhận thanh toán; nhắc đối chiếu trước khi chuyển thêm |
| `REFUND_APPROVED` | `refund.approved` | Đã duyệt để xử lý, số tiền yêu cầu; **chưa phải tiền đã về** |
| `REFUND_REJECTED` | `refund.rejected` | Kết quả từ chối, mở yêu cầu để xem chi tiết |
| `REFUND_WAITING_BANK_DETAILS` | `refund.waiting-bank-details` | Đăng nhập để bổ sung/sửa tài khoản nhận tiền; không trả lời email bằng dữ liệu ngân hàng |
| `REFUND_PROCESSED` | `refund.processed`; hỗ trợ legacy `refund.confirmed` | Ghi nhận đã hoàn tiền, số tiền, mở yêu cầu đối chiếu |

Email đơn hàng có thẻ mã đơn/hình thức nhận, bảng món/số lượng/đơn giá/thành tiền, tạm tính/giảm giá/điểm/phí giao hàng/tổng đơn khi sự kiện cung cấp. Định dạng VND; giảm giá hiển thị dấu trừ, tổng đơn nổi bật. Hình thức và trạng thái thanh toán lấy từ sự kiện: không suy diễn COD đã trả, COLLECTION đã đối soát hoặc hủy đơn đã hoàn tiền. Không bịa tên chi nhánh khi sự kiện không có. Hiển thị tối đa 30 dòng món và tối đa 8.500 ký tự JSON; phần còn lại có hướng dẫn xem chi tiết. Không đưa điện thoại, tọa độ, ghi chú tự do hoặc chứng từ ngân hàng vào email. CTA chỉ dùng origin cấu hình + orderId, không dùng URL tùy ý của payload. OTP chỉ nhập trong phiên người dùng đang thao tác, không có liên kết tạo lại phiên.

## Nhân sự/Admin — 5 template

Tất cả đi qua `identity.branch-email`, input contract giữ `template=branch-security` và `purpose`. Notification ánh xạ khi render mới; không đổi fingerprint/messageId của command cũ.

| Template | Purpose | Người nhận |
| --- | --- | --- |
| `BRANCH_ACTIVATE` | `ACTIVATE` | Email khôi phục đăng ký cho tài khoản chi nhánh |
| `BRANCH_RESET` | `RESET` | Email hợp lệ được Identity chọn cho luồng tự khôi phục tài khoản |
| `BRANCH_RECOVERY` | `RECOVERY` | Email khôi phục hiện tại và email mới, hai mã/kênh riêng |
| `BRANCH_ADMIN_RESET` | `ADMIN_RESET` | Email đã xác thực của Admin thực hiện thao tác |
| `BRANCH_ADMIN_RECOVERY` | `ADMIN_RECOVERY` | Email đã xác thực của Admin và email khôi phục mới, hai mã/kênh riêng |

Mỗi email có OTP 8 số, hạn theo giờ Việt Nam, tài khoản đích, vai trò, accountId, challengeId, mô tả đúng hành động. Kênh `.primary`/`.secondary` quyết định hướng dẫn xác minh địa chỉ hiện tại/mới. Không gắn quyền đọc Store Manager cho security email; quyền log giữ nguyên cơ chế private/Admin của BE-63.

## Điểm nối và chống mất/trùng

- Order/Payment chỉ mang customerId, không cần đưa email vào Kafka. Notification gọi Identity qua Eureka `GET /api/auth/internal/customers/{customerId}/notification-contact`, HMAC có timestamp, timeout kết nối/đọc 5/10 giây. Chỉ nhận CUSTOMER đúng ID, email đã xác thực, một địa chỉ hợp lệ; không fallback sang actor, Staff hay email payload.
- Identity tạm lỗi: ném lỗi đã khử thông tin nhạy cảm, transaction notification rollback, Kafka retry rồi DLT bền vững. Không ACK như đã gửi. Identity trả thiếu tài khoản/chưa xác thực: không đoán địa chỉ; lưu `notification_delivery_gaps` với lý do, vẫn giữ thông báo in-app nếu biết customerId.
- Refund giữ recipient snapshot do producer xác minh, `recipient.userId == customerId`, role CUSTOMER, emailVerified. Producer order outbox có luồng WAITING_RECIPIENT; không chuyển sang email của người duyệt hoàn tiền.
- Email giao dịch dùng khóa ổn định theo event/channel/customer; `refund.processed` dùng refundId/channel/customer. Tra delivery đã tồn tại trước khi tra lại email, bao gồm delivery legacy theo eventId/template. Không tự gửi lại do email người dùng/template vừa đổi. Hoàn tất/hủy chỉ gửi từ topic dedicated, không gửi lần hai từ status-changed.
- Subject/text/HTML được đóng băng và mã hóa ngay khi enqueue; worker gửi MIME alternative + logo inline. Snapshot cũ chỉ có body vẫn gửi text như cũ, không render lại để đổi lịch sử. Logo CID v1 phải được giữ nếu sau này thêm phiên bản branding mới.
- SMTP terminal failure, retry an toàn, history và `notification.email-failed` giữ nguyên [runbook BE-62/BE-63/UI-50](Email_Operations_2026-11-11.md). SENT chỉ là SMTP chấp nhận, không bảo đảm inbox, không bảo đảm exactly-once qua SMTP.

## Chủ đích không bật

- `promotion.approved`: vẫn deferred theo KAFKA-11/INT-41/58, chưa có approval/audience/consent contract để gửi marketing. Không tự tạo template rồi broadcast toàn bộ khách hàng.
- `payment.confirmed` loại COLLECTION: chỉ thông báo in-app ghi nhận thu tại quầy; số chuyển khai báo chưa đồng nghĩa đã được ngân hàng đối soát.
- Admin đơn mới, tồn kho thấp: inbox có sẵn, không phát email cho tập người nhận không được đặc tả.
- Shipping assignment/tracking: Phase 2, không giả thông báo giao hàng ở MVP.

## Cấu hình và nghiệm thu

Config Server cung cấp `clucky.frontend.customer-url` cho nút giao dịch; chỉ chấp nhận http(s), không userinfo/query/fragment/path. `admin-url` vẫn giữ tương thích trong cấu hình nhưng không dùng dựng nút vì security email đã bỏ CTA. Gmail App Password vẫn chỉ từ môi trường; không đưa vào DB, tài liệu, log. Không tự bật sender nếu môi trường đang chủ đích tắt.

Regression sources: `EmailTemplateRendererTest` kiểm đủ 19 key V14, logo80/card560, OTP không link, CTA căn giữa, bảng món/tổng tiền/trạng thái, HTML escaping, origin/OTP/purpose; `NotificationSafetyTest` kiểm mapping, owner lookup, replay, không ACK lỗi lookup và giới hạn bảng món/không đưa ghi chú riêng tư vào email; `EmailDeliveryPostgresTest` kiểm MIME, logo, snapshot bất biến cùng delivery ledger. Chưa chạy các test này theo AGENTS.md.

Nghiệm thu do người dùng thực hiện: đăng ký/quên mật khẩu; mọi trạng thái order; thanh toán thành công/thất bại; bốn bước refund; năm purpose security (cả hai kênh đổi email); kiểm logo/text/nút trên mail client thực tế và đối chiếu email-logs/failure stream. Docker build/health và kiểm kê DB không thay thế các bước này; không gọi phần email đã nghiệm thu 100% khi chưa có kết quả inbox.

### Rollout thực tế

Đợt giao diện V14: `./start-docker.ps1 -Services notification-service` hoàn tất, bootJar BUILD SUCCESSFUL, container Notification healthy. Truy vấn read-only xác nhận V14 success và vẫn đủ 19 template active (7 security không CTA, 12 giao dịch có CTA theo renderer). Không chạy standalone test/lint/typecheck, trình duyệt hoặc gửi thư thử. Mẫu mới áp dụng cho intent được render sau rollout; email cũ trong hộp thư và snapshot đã enqueue không bị thay đổi hay tự gửi lại.

Đã chạy `./start-docker.ps1 -Services notification-service`: bootJar BUILD SUCCESSFUL, script kết thúc thành công, `clucky-local-notification-service-1` healthy. Chỉ recreate Notification; giữ nguyên dữ liệu/volumes. Truy vấn PostgreSQL read-only xác nhận V11/V12/V13 success, 14 Customer + 5 nhân sự/Admin đang active, 2 key retired (21 bản ghi). Container nhận đúng customer origin `http://localhost:3000`, admin origin `http://localhost:3001`; sender đang bật, username/App Password hiện diện (chỉ kiểm tra boolean, không in giá trị). Đây không phải xác nhận credentials còn hiệu lực hay inbox đã nhận thư. Không chạy standalone test/lint/typecheck, trình duyệt, SMTP probe hoặc tạo sự kiện gửi email thử.
