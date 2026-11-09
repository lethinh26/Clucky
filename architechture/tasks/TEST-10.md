# [TEST-10] ĐÃ GỘP — không còn task độc lập

Cập nhật 07/11/2026 tại repository; **chưa đồng bộ Lark**. Đây chỉ là trang truy vết, không giao việc/tính SP như task hoặc subtask.

Đã gộp trước đây; chỉ cập nhật đích cuối, không tính là một lần xóa mới.

- [BE-29](BE-29.md) — Cung cấp luồng QR chuyển khoản, thời hạn và tra cứu trạng thái thanh toán, kèm contract và tài liệu tích hợp Payment/Shipping
- [BE-30](BE-30.md) — Tiếp nhận webhook SePay, xác thực chữ ký và đối chiếu mã đơn, số tiền để ghi nhận thanh toán đúng một lần
- [BE-25](BE-25.md) — Triển khai tạo đơn từ checkout, chốt giá và trạng thái bán, khởi tạo thanh toán và chống tạo trùng khi gửi lại
- [KAFKA-03](KAFKA-03.md) — Phát sự kiện xác nhận hoặc thất bại thanh toán và dữ liệu hết hạn, sai lệch, hoàn tiền theo contract cho các service nhận
- [KAFKA-12](KAFKA-12.md) — Xử lý sự kiện Order, Payment để tạo thông báo và yêu cầu gửi email đúng người, chống trùng và không rollback nghiệp vụ khi email lỗi
- [UI-19](UI-19.md) — Xây dựng trang theo dõi đơn, tự cập nhật trạng thái bằng polling và hiển thị QR, thanh toán, thông tin giao hàng theo backend

Xem [báo cáo phân loại](../docs/Backlog_Reclassification_2026-11-07.md), [backlog hiện hành](../docs/backlog.md) và lịch sử Git. Không đánh DONE vì đổi tài liệu; không chạy kiểm thử trong lần cập nhật này.
