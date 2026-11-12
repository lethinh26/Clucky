# Tồn kho, báo cáo và thanh toán trực tiếp

- Catalog trả `stockQuantities` từ tổng nhu cầu đã kiểm tra (món lẻ + thành phần combo). Order đưa snapshot này vào `order.created`, không phụ thuộc việc combo bị sửa sau đó.
- Catalog nhận `order.created` để trừ kho và `order.cancelled` để hoàn đúng số đã trừ. Ledger theo `orderId` chứa `eventId`, `correlationId`, chi nhánh và snapshot. Khóa dòng tồn kho theo thứ tự product ID, cập nhật ledger và số lượng trong cùng transaction. Chỉ ACK sau commit; duplicate hoặc hủy đến trước tạo không làm tăng/giảm kho hai lần.
- Migration V18 đặt mốc bắt đầu tự động trừ kho. Không tự trừ lại đơn cũ hoặc ghi đè số kiểm kê hiện tại. Event không đủ kho/không hợp lệ không được ACK hoặc làm âm kho; cần xử lý nguyên nhân rồi replay. Đây là đồng bộ bất đồng bộ sau tạo đơn, không phải giữ chỗ tồn kho đồng bộ giữa hai service.
- Trạng thái hết hàng, cảnh báo dưới ngưỡng và cache thực đơn được cập nhật theo thay đổi tồn kho. Trang kho làm mới ngầm mỗi 5 giây khi không nhập số kiểm kê.
- Báo cáo mặc định ghi nhận `order.completed`: số tiền cuối đơn trước hoàn tiền, ngày Việt Nam. Tiền khai báo chuyển khoản không được coi là tiền ngân hàng đã đối soát. Số đơn đặt hôm nay lấy trực tiếp từ Order Service; biểu đồ và xuất Excel/PDF dùng dữ liệu báo cáo theo chi nhánh/kỳ.
- Đơn WEB/PICKUP chọn COD và chưa thu tiền có thể thu toàn bộ bằng tiền mặt hoặc QR tại quầy. QR dùng tài khoản được gán cho chi nhánh và nội dung chuẩn hóa từ mã đơn. Tiền mặt giữ yêu cầu duyệt chứng từ; khai báo QR phải có lý do và vẫn chờ đối soát ngân hàng. Không nới quyền theo chi nhánh, không đổi đơn đã thu hoặc đơn chuyển khoản trả trước thành thu thủ công.

Kiểm tra hồi quy đã bổ sung nhưng chưa chạy theo quy định repo: `OrderStockServiceTest`, `PaymentOperationsTest`, `frontend/react/tests/admin-reporting.test.mjs`.
