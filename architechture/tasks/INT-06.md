# [INT-06] ĐÃ GỘP — không còn task độc lập

> **Đã gộp và xoá record nguồn trên Lark 08/11/2026**, sau khi chuyển snapshot/evidence và liên kết sang TASK đích. Các dòng “chưa đồng bộ” bên dưới chỉ phản ánh thời điểm biên soạn. [Kết quả đồng bộ](../docs/Lark_Backlog_Sync_2026-11-08.md).

Cập nhật 07/11/2026 tại repository; **chưa đồng bộ Lark**. Đây chỉ là trang truy vết, không giao việc/tính SP như task hoặc subtask.

**Bỏ record độc lập:** scope triển khai (nếu có), AC/DoD nằm trong TASK chính; dev tự test, không xóa yêu cầu nghiệp vụ/kiểm chứng.

- [UI-11](UI-11.md) — Xây dựng và nối API trang menu theo quán, hỗ trợ danh mục, tìm kiếm, bộ lọc và đồng bộ lựa chọn với URL
- [UI-10](UI-10.md) — Xây dựng trang chủ Customer hiển thị banner, danh mục và món nổi bật từ dữ liệu, điều hướng đến đúng menu hoặc chi tiết món
- [UI-12](UI-12.md) — Xây dựng trang chi tiết món, cho chọn tùy chọn, topping, số lượng, xem tạm tính và đánh giá trước khi thêm vào giỏ
- [UI-13](UI-13.md) — Xây dựng trang chọn chi nhánh, hiển thị địa chỉ, giờ mở và trạng thái nhận đơn rồi chuyển tới menu đúng quán
- [BE-20](BE-20.md) — Cung cấp API công khai để tìm cửa hàng, duyệt menu, tìm kiếm và xem món hoặc combo với giá đúng chi nhánh
- [BE-54](BE-54.md) — Kết nối menu qua Gateway và triển khai cache theo quán, làm mới dữ liệu khi giá hoặc trạng thái bán thay đổi

**Định danh Lark cũ để đối chiếu:** Mail-4526 / reczz28Rid5XkYJT

Xem [báo cáo phân loại](../docs/Backlog_Reclassification_2026-11-07.md), [backlog hiện hành](../docs/backlog.md) và lịch sử Git. Không đánh DONE vì đổi tài liệu; không chạy kiểm thử trong lần cập nhật này.
