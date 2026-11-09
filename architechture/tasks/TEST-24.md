# [TEST-24] ĐÃ GỘP — không còn task độc lập

> **Đã gộp và xoá record nguồn trên Lark 08/11/2026**, sau khi chuyển snapshot/evidence và liên kết sang TASK đích. Các dòng “chưa đồng bộ” bên dưới chỉ phản ánh thời điểm biên soạn. [Kết quả đồng bộ](../docs/Lark_Backlog_Sync_2026-11-08.md).

Cập nhật 07/11/2026 tại repository; **chưa đồng bộ Lark**. Đây chỉ là trang truy vết, không giao việc/tính SP như task hoặc subtask.

**Bỏ record độc lập:** scope triển khai (nếu có), AC/DoD nằm trong TASK chính; dev tự test, không xóa yêu cầu nghiệp vụ/kiểm chứng.

- [BE-57](BE-57.md) — Cấu hình Mail Sender qua Config Server và biến môi trường, kiểm tra cấu hình và bảo vệ Gmail App Password
- [BE-60](BE-60.md) — Hoàn thiện gửi email nghiệp vụ qua Gmail SMTP: kiểm tra đầu vào, render mẫu OTP, đơn hàng, thanh toán và hoàn tiền, trả rõ kết quả gửi
- [BE-63](BE-63.md) — Hoàn thiện vận hành email: ghi nhận failure/DLQ bền vững, truy vết các lần gửi và cung cấp API tra cứu log đúng quyền
- [BE-75](BE-75.md) — Chuẩn hóa DTO metadata ảnh và loại credential, payload nhạy cảm khỏi response, log và bundle frontend
- [KAFKA-12](KAFKA-12.md) — Xử lý sự kiện Order, Payment để tạo thông báo và yêu cầu gửi email đúng người, chống trùng và không rollback nghiệp vụ khi email lỗi

**Định danh Lark cũ để đối chiếu:** Mail-4610 / reczz28Rqn97VwpU

Xem [báo cáo phân loại](../docs/Backlog_Reclassification_2026-11-07.md), [backlog hiện hành](../docs/backlog.md) và lịch sử Git. Không đánh DONE vì đổi tài liệu; không chạy kiểm thử trong lần cập nhật này.
