# [INT-08] ĐÃ GỘP — không còn task độc lập

> **Đã gộp và xoá record nguồn trên Lark 08/11/2026**, sau khi chuyển snapshot/evidence và liên kết sang TASK đích. Các dòng “chưa đồng bộ” bên dưới chỉ phản ánh thời điểm biên soạn. [Kết quả đồng bộ](../docs/Lark_Backlog_Sync_2026-11-08.md).

Cập nhật 07/11/2026 tại repository; **chưa đồng bộ Lark**. Đây chỉ là trang truy vết, không giao việc/tính SP như task hoặc subtask.

**Bỏ record độc lập:** scope triển khai (nếu có), AC/DoD nằm trong TASK chính; dev tự test, không xóa yêu cầu nghiệp vụ/kiểm chứng.

- [BE-27](BE-27.md) — Cung cấp API lịch sử, chi tiết và đặt lại đơn, lọc theo chủ sở hữu hoặc cửa hàng và dùng giá hiện hành khi đặt lại
- [BE-26](BE-26.md) — Triển khai hủy hoặc từ chối đơn đúng quyền, đúng trạng thái và tạo yêu cầu hoàn tiền cho đơn đã chuyển khoản
- [UI-19](UI-19.md) — Xây dựng trang theo dõi đơn, tự cập nhật trạng thái bằng polling và hiển thị QR, thanh toán, thông tin giao hàng theo backend
- [UI-20](UI-20.md) — Xây dựng và nối API lịch sử, chi tiết đơn và hóa đơn, hỗ trợ đặt lại món theo giá, trạng thái bán hiện hành

**Định danh Lark cũ để đối chiếu:** Mail-4528 / reczz28Rid5XkJIs

Xem [báo cáo phân loại](../docs/Backlog_Reclassification_2026-11-07.md), [backlog hiện hành](../docs/backlog.md) và lịch sử Git. Không đánh DONE vì đổi tài liệu; không chạy kiểm thử trong lần cập nhật này.
