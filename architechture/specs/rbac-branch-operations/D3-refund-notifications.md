# D3 — Thông báo khách theo vòng đời refund

Mốc: D2D. Nguồn: plan §8.4. Phụ thuộc: D1/D2, Kafka/Notification. Áp dụng [quy tắc chung](README.md). Trạng thái: đặc tả.

## Problem Statement

Khách cần biết lỗi thông tin ngân hàng, từ chối hoặc đã hoàn theo trạng thái thật. Gửi webhook ngân hàng vào frontend hoặc email trước commit sẽ làm lộ thông tin và báo sai kết quả.

## Solution

Order/Payment commit → sự kiện Kafka → Notification lưu in-app/gửi email → Customer đọc qua Gateway. Dùng realtime hiện có nếu có; không thêm WebSocket chỉ vì tên “webhook sang customer”.

## User Stories

1. Là Customer, tôi muốn nhận lý do ngân hàng không dùng được và link cập nhật đúng yêu cầu.
2. Là Customer, tôi muốn biết yêu cầu bị từ chối có lý do hoặc đã được xác nhận hoàn.
3. Là Customer, tôi muốn không nhận thông báo trùng khi event/email retry.
4. Là Manager, tôi muốn gửi email thất bại không rollback khoản tiền đã chi.
5. Là người có đơn vãng lai, tôi không muốn hệ thống gửi dữ liệu của mình cho email tài khoản Staff thay thế.

## Implementation Decisions

- Service sở hữu transition phát event theo envelope hiện hữu sau commit, có eventId/correlationId/eventType/sourceService/occurredAt và target identifiers. Giữ eventId khi replay; không frontend tự phát sự kiện tài chính.
- WAITING_BANK_DETAILS có reason an toàn + đường dẫn request; REJECTED có lý do nghiệp vụ; REFUNDED chỉ sau D1/D2 xác nhận thật. APPROVED không dùng nội dung “đã hoàn”.
- Consumer lưu in-app idempotent theo event/recipient/channel phù hợp; gửi email có trạng thái/retry riêng để lỗi email không tạo notification thứ hai hoặc rollback refund. Trường hợp provider timeout chưa rõ kết quả cần theo dõi/reconcile để hạn chế gửi lặp, không hứa exactly-once ngoài hệ thống nếu provider không hỗ trợ.
- Resolve người nhận từ ownership/dữ liệu server, không email/body client hay actor Staff. Không có Customer/contact được xác minh thì không gửi nhầm; ghi trạng thái không có kênh nhận để tác nghiệp đúng hồ sơ, không tạo Customer giả.
- Link tới màn request yêu cầu đăng nhập và backend ownership; link email không tự cấp quyền sửa amount/bank account. Sau cập nhật hợp lệ Customer thấy APPROVED, không REFUNDED.
- Payload/email chỉ thông tin cần thiết, không credential/OTP hoặc đủ số tài khoản nhạy cảm/URL ảnh public; ảnh xem qua D2 có kiểm soát.
- Mất Kafka/mail có retry/observability hiện hữu; không thêm service hay websocket mới. Notification frontend phân biệt API lỗi với inbox rỗng, không fixture.

### Contract đề xuất

Event dữ liệu tối thiểu: refund/request ID, order/store/owner identifiers hợp lệ, transition/version, reason code/an toàn và thời điểm; bank detail đầy đủ không đi notification. API inbox/unread/read giữ owner scope hiện hữu; deep link lấy theo loại tài nguyên, không URL client tự khai.

## Acceptance Criteria

- AC1: Bank detail invalid đã commit tạo in-app/email phù hợp cho đúng owner, có lý do/link cập nhật.
- AC2: Approve không thông báo đã hoàn; reject/refunded chỉ theo event thật, giao dịch rollback không phát thông báo thành công.
- AC3: Replay cùng event không nhân notification; retry mail không thay trạng thái refund hoặc gửi liên tục vô hạn.
- AC4: Khách khác mở link không đọc/sửa request; email không lộ credential/đầy đủ dữ liệu ngân hàng/ảnh public.
- AC5: Đơn vãng lai không gửi thông tin cho Staff vì actor tạo đơn; thiếu người nhận được ghi nhận rõ.
- AC6: Inbox lỗi không giả rỗng; frontend không là đích webhook ngân hàng và không cần WebSocket mới.

## Testing Decisions

Chưa chạy. Boundary event → inbox API/email adapter, có replay/failure và recipient ownership; tham khảo EmailEventPublisherTest và frontend promotion-notification tests. Email đến hộp thư thực chỉ kiểm tra khi được yêu cầu; không coi publish Kafka thành công là email đã đến.

## Out of Scope

WebSocket mới, webhook vào browser, chiến dịch marketing, tự lấy email Customer từ Staff, gửi bí mật ngân hàng.

## Further Notes

Gmail App Password từ môi trường/Config Server, không credential Gmail khách và không log/lưu database.
