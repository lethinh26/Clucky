# [TEST-15] ĐÃ GỘP — không còn task độc lập

Cập nhật 07/11/2026 tại repository; **chưa đồng bộ Lark**. Đây chỉ là trang truy vết, không giao việc/tính SP như task hoặc subtask.

Đã gộp trước đây; chỉ cập nhật đích cuối, không tính là một lần xóa mới.

- [BE-25](BE-25.md) — Triển khai tạo đơn từ checkout, chốt giá và trạng thái bán, khởi tạo thanh toán và chống tạo trùng khi gửi lại
- [BE-30](BE-30.md) — Tiếp nhận webhook SePay, xác thực chữ ký và đối chiếu mã đơn, số tiền để ghi nhận thanh toán đúng một lần
- [BE-32](BE-32.md) — Hoàn thiện quản lý thanh toán: tra cứu và đối soát giao dịch, xác nhận chuyển khoản hoặc COD, duyệt hoàn tiền và cấu hình ngân hàng
- [KAFKA-12](KAFKA-12.md) — Xử lý sự kiện Order, Payment để tạo thông báo và yêu cầu gửi email đúng người, chống trùng và không rollback nghiệp vụ khi email lỗi

Critical path/sửa lỗi/retest thuộc DoD **mọi TASK chính**; đích trên là đầu mối minh họa, không giới hạn coverage. Mỗi bug có một PIC; không có task chung giao cả nhóm.

Xem [báo cáo phân loại](../docs/Backlog_Reclassification_2026-11-07.md), [backlog hiện hành](../docs/backlog.md) và lịch sử Git. Không đánh DONE vì đổi tài liệu; không chạy kiểm thử trong lần cập nhật này.
