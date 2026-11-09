# [TEST-01] ĐÃ GỘP — không còn task độc lập

> **Đã gộp và xoá record nguồn trên Lark 08/11/2026**, sau khi chuyển snapshot/evidence và liên kết sang TASK đích. Các dòng “chưa đồng bộ” bên dưới chỉ phản ánh thời điểm biên soạn. [Kết quả đồng bộ](../docs/Lark_Backlog_Sync_2026-11-08.md).

Cập nhật 07/11/2026 tại repository; **chưa đồng bộ Lark**. Đây chỉ là trang truy vết, không giao việc/tính SP như task hoặc subtask.

**Bỏ record độc lập:** scope triển khai (nếu có), AC/DoD nằm trong TASK chính; dev tự test, không xóa yêu cầu nghiệp vụ/kiểm chứng.

- [BE-25](BE-25.md) — Triển khai tạo đơn từ checkout, chốt giá và trạng thái bán, khởi tạo thanh toán và chống tạo trùng khi gửi lại
- [BE-17](BE-17.md) — Hoàn thiện xác thực tài khoản: đăng ký và OTP, đăng nhập, làm mới phiên, đăng xuất và đặt lại mật khẩu trên hai ứng dụng
- [BE-20](BE-20.md) — Cung cấp API công khai để tìm cửa hàng, duyệt menu, tìm kiếm và xem món hoặc combo với giá đúng chi nhánh
- [BE-23](BE-23.md) — Triển khai giỏ hàng Redis cho khách vãng lai và Customer, hỗ trợ thêm, sửa, xóa món mà không trộn dữ liệu chủ sở hữu
- [BE-24](BE-24.md) — Cung cấp API xem trước đơn hàng, tính giá món, voucher, điểm và phí giao từ backend mà chưa tạo đơn hoặc thanh toán
- [BE-32](BE-32.md) — Hoàn thiện quản lý thanh toán: tra cứu và đối soát giao dịch, xác nhận chuyển khoản hoặc COD, duyệt hoàn tiền và cấu hình ngân hàng
- [UI-09](UI-09.md) — Xây dựng và nối API đăng nhập, đăng ký Customer, xác thực OTP, quên hoặc đặt lại mật khẩu cho đúng luồng của hai ứng dụng
- [UI-11](UI-11.md) — Xây dựng và nối API trang menu theo quán, hỗ trợ danh mục, tìm kiếm, bộ lọc và đồng bộ lựa chọn với URL
- [UI-17](UI-17.md) — Xây dựng và nối API trang giỏ hàng, hỗ trợ sửa số lượng, ghi chú, xóa món và cập nhật tổng tạm tính trước checkout
- [UI-18](UI-18.md) — Xây dựng và nối API checkout để chọn nhận hàng, áp dụng voucher hoặc điểm, xem chi tiết tiền và gửi yêu cầu tạo đơn
- [UI-30](UI-30.md) — Xây dựng và nối API màn đơn hàng tại quán để Staff xem đơn hôm nay, chuyển trạng thái hợp lệ và xác nhận đã thu COD

**Định danh Lark cũ để đối chiếu:** Mail-4544 / reczz28Rid5XjtTx

Xem [báo cáo phân loại](../docs/Backlog_Reclassification_2026-11-07.md), [backlog hiện hành](../docs/backlog.md) và lịch sử Git. Không đánh DONE vì đổi tài liệu; không chạy kiểm thử trong lần cập nhật này.
