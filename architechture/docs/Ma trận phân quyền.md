# MA TRẬN PHÂN QUYỀN (RBAC)
## Hệ thống website bán hàng thức ăn nhanh

Ký hiệu: ✅ = Được phép | ❌ = Không được phép | 🔶 = Được phép trong phạm vi giới hạn (xem Ghi chú)
Phạm vi dữ liệu: Staff và Store Manager bị ép `storeId` của chi nhánh được gán ở backend (JWT + kiểm tra tại từng service), không chỉ ẩn giao diện.

| # | Chức năng | Guest | Customer | Staff | Store Manager | Admin | Shipper (Phase 2) |
|---|---|---|---|---|---|---|---|
| 1 | Xem trang chủ, menu, chi nhánh, khuyến mãi công khai | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | Tìm kiếm / lọc món, xem đánh giá | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3 | Giỏ hàng tạm (chưa đăng nhập) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 4 | Đăng ký / đăng nhập / quên mật khẩu | ✅ | ✅ | 🔶 tài khoản được cấp | 🔶 tài khoản được cấp | ✅ | 🔶 tài khoản được cấp |
| 5 | Hồ sơ cá nhân, sổ địa chỉ | ❌ | ✅ | 🔶 hồ sơ của mình | 🔶 hồ sơ của mình | ✅ | 🔶 hồ sơ của mình |
| 6 | Đặt hàng (checkout) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 7 | Dùng voucher, tích/đổi điểm | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 8 | Thanh toán chuyển khoản / COD cho đơn của mình | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 9 | Theo dõi đơn, lịch sử đơn, đặt lại đơn của mình | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 10 | Hủy đơn của mình (đủ điều kiện) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 11 | Đánh giá món sau đơn hoàn thành | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 12 | Gửi form đặt tiệc / đơn lớn | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 13 | Nhận thông báo đơn mới của quán | ❌ | ❌ | ✅ quán mình | ✅ quán mình | ✅ mọi quán | ❌ |
| 14 | Xử lý đơn: xác nhận, chế biến, sẵn sàng, hoàn thành | ❌ | ❌ | ✅ quán mình | ✅ quán mình | ✅ mọi quán | ❌ |
| 15 | Hủy / từ chối đơn tại quán | ❌ | ❌ | 🔶 kèm lý do | ✅ quán mình | ✅ mọi quán | ❌ |
| 16 | Duyệt hoàn tiền | ❌ | ❌ | ❌ chỉ tạo yêu cầu hộ/gửi lên | ✅ quán mình | ✅ toàn hệ thống | ❌ |
| 17 | Xác nhận đã thu COD tại quán | ❌ | ❌ | ✅ quán mình | ✅ quán mình | ✅ | 🔶 Phase 2: đơn mình giao |
| 18 | Đối chiếu chuyển khoản, báo sai lệch | ❌ | ❌ | 🔶 báo sai lệch | ✅ quán mình | ✅ toàn hệ thống | ❌ |
| 19 | Xác nhận thanh toán thủ công | ❌ | ❌ | ❌ | ✅ quán mình, ghi audit | ✅ | ❌ |
| 20 | Bật/tắt món hết/còn trong ca | ❌ | ❌ | ✅ quán mình | ✅ quán mình | ✅ | ❌ |
| 21 | Cập nhật kho cơ bản của quán | ❌ | ❌ | 🔶 cập nhật số lượng | ✅ duyệt + nhập/kiểm kê | ✅ | ❌ |
| 22 | Xem thông tin khách trong đơn | ❌ | ❌ | 🔶 chỉ trong đơn quán mình | 🔶 quán mình | ✅ toàn bộ | 🔶 chỉ đơn được gán |
| 23 | Phản hồi đánh giá | ❌ | ❌ | ✅ quán mình | ✅ quán mình | ✅ | ❌ |
| 24 | Ẩn / xóa đánh giá vi phạm | ❌ | ❌ | ❌ | 🔶 ẩn, quán mình | ✅ ẩn + xóa | ❌ |
| 25 | Dashboard | ❌ | ❌ | 🔶 tổng kết ca | 🔶 chi nhánh mình | ✅ toàn chuỗi | 🔶 lịch sử giao của mình |
| 26 | Báo cáo doanh thu + xuất Excel/PDF | ❌ | ❌ | ❌ | ✅ quán mình | ✅ toàn hệ thống | ❌ |
| 27 | Tạo / khóa tài khoản Staff, phân ca | ❌ | ❌ | ❌ | ✅ quán mình | ✅ | ❌ |
| 28 | Tạo tài khoản Store Manager, gán chi nhánh | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| 29 | CRUD chi nhánh | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| 30 | Cấu hình vận hành quán (giờ, tạm đóng) | ❌ | ❌ | ❌ | ✅ quán mình | ✅ | ❌ |
| 31 | CRUD danh mục / món / combo / giá gốc | ❌ | ❌ | ❌ | ❌ chỉ đề xuất | ✅ | ❌ |
| 32 | CRUD voucher / khuyến mãi toàn chuỗi, banner | ❌ | ❌ | ❌ | ❌ chỉ đề xuất | ✅ | ❌ |
| 33 | Duyệt voucher / khuyến mãi của chi nhánh | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| 34 | Cấu hình tích điểm / hạng thành viên | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| 35 | Quản lý khách hàng (khóa/mở, lịch sử mua) | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| 36 | Cấu hình ngân hàng nhận tiền, phí ship, hệ thống | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| 37 | Xem audit log | ❌ | ❌ | ❌ | 🔶 Staff quán mình | ✅ toàn hệ thống | ❌ |
| 38 | Gán đơn cho shipper, theo dõi giao hàng | ❌ | ❌ | ❌ | ✅ quán mình (Phase 2) | ✅ (Phase 2) | ❌ |
| 39 | Cập nhật trạng thái giao hàng | ❌ | ❌ | ❌ | 🔶 can thiệp quán mình | ✅ | ✅ đơn được gán (Phase 2) |
| 40 | Tiếp nhận / báo giá đơn tiệc | ❌ | ❌ | 🔶 tiếp nhận quán mình | ✅ báo giá quán mình | ✅ | ❌ |

## Ghi chú triển khai phân quyền
1. JWT chứa `role` và `storeId` (Staff/Manager/Shipper). Gateway kiểm tra token hợp lệ; từng service kiểm tra quyền chi tiết bằng `@PreAuthorize` và điều kiện storeId trên dữ liệu truy vấn.
2. Mọi thao tác nhạy cảm (hủy đơn, duyệt hoàn tiền, xác nhận thanh toán thủ công, ẩn đánh giá, khóa tài khoản) đều ghi audit log: actor, role, storeId, hành động, đối tượng, thời gian.
3. Khách chỉ truy cập được đơn/địa chỉ/điểm của chính mình (kiểm tra owner id phía server).
4. Webhook thanh toán không dùng JWT; xác thực bằng chữ ký bí mật của SePay/Casso + whitelist IP.
