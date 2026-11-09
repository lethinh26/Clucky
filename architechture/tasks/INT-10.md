# [INT-10] ĐÃ GỘP — không còn task độc lập

> **Đã gộp và xoá record nguồn trên Lark 08/11/2026**, sau khi chuyển snapshot/evidence và liên kết sang TASK đích. Các dòng “chưa đồng bộ” bên dưới chỉ phản ánh thời điểm biên soạn. [Kết quả đồng bộ](../docs/Lark_Backlog_Sync_2026-11-08.md).

Cập nhật 07/11/2026 tại repository; **chưa đồng bộ Lark**. Đây chỉ là trang truy vết, không giao việc/tính SP như task hoặc subtask.

**Bỏ record độc lập:** scope triển khai (nếu có), AC/DoD nằm trong TASK chính; dev tự test, không xóa yêu cầu nghiệp vụ/kiểm chứng.

- [BE-34](BE-34.md) — Cung cấp API quản lý và áp dụng voucher toàn chuỗi hoặc từng quán, kiểm tra điều kiện và trả số tiền giảm hợp lệ
- [BE-37](BE-37.md) — Cung cấp API điểm và hạng thành viên, cấu hình tích hoặc đổi điểm và lưu biến động số dư không bị cộng, trừ lặp
- [BE-24](BE-24.md) — Cung cấp API xem trước đơn hàng, tính giá món, voucher, điểm và phí giao từ backend mà chưa tạo đơn hoặc thanh toán
- [UI-18](UI-18.md) — Xây dựng và nối API checkout để chọn nhận hàng, áp dụng voucher hoặc điểm, xem chi tiết tiền và gửi yêu cầu tạo đơn
- [UI-22](UI-22.md) — Xây dựng và nối API trang ưu đãi để Customer xem voucher khả dụng, điểm và hạng thành viên trước khi đặt hàng
- [KAFKA-06](KAFKA-06.md) — Xử lý sự kiện order.completed để cộng điểm cho đúng khách, lưu biến động điểm và không cộng lại khi nhận sự kiện trùng

**Định danh Lark cũ để đối chiếu:** Mail-4593 / reczz28Rqn97UPKw

Xem [báo cáo phân loại](../docs/Backlog_Reclassification_2026-11-07.md), [backlog hiện hành](../docs/backlog.md) và lịch sử Git. Không đánh DONE vì đổi tài liệu; không chạy kiểm thử trong lần cập nhật này.
