# B1 — Không gian tác nghiệp Staff

Mốc: D2B. Nguồn: plan §6.1. Phụ thuộc: Đợt 1; chức năng mở theo B2/B3/B4/C2/C4. Áp dụng [quy tắc chung](README.md). Trạng thái: đặc tả.

## Problem Statement

Màn quản trị đa năng không phù hợp Staff dùng chung thao tác nhanh ở quầy; số liệu doanh thu, nhân sự và mock gây nhầm quyền lẫn tình trạng đơn.

## Solution

Hai lối chính “Nhập đơn nhanh”, “Xử lý đơn”; màn phụ “Tiền vào”, giữ báo hết món nhanh. Không dashboard, CRUD ngân hàng, sửa quantity/threshold hoặc quản lý nhân sự.

## User Stories

1. Là Staff, tôi muốn đến ngay bảng đơn của quán để xử lý theo trạng thái.
2. Là Staff, tôi muốn tạo đơn nhanh và chuyển lại bảng đơn không mất kết quả.
3. Là Staff, tôi muốn thấy món/tùy chọn, mã đơn, thời gian và tình trạng tiền ngay trên thẻ.
4. Là Staff, tôi muốn báo hết món nhanh nhưng không đổi tồn/giá.
5. Là Staff, tôi muốn tìm tiền vào đã phân loại quán mình mà không thấy sao kê quán khác.
6. Là người dùng bàn phím hoặc màn hình nhỏ, tôi muốn thao tác rõ focus, nhãn và lỗi mà không dựa riêng vào màu.

## Implementation Decisions

- React sử dụng shell/route hiện có, tránh xây ứng dụng Staff thứ ba. Điểm vào theo F1; store cố định từ profile xác thực và backend scope.
- Tab: Chờ tiền, Mới xác nhận, Đang chuẩn bị, Sẵn sàng, Tra cứu đã xong. Count là số công việc, không doanh thu hoặc tổng kết ca cá nhân; trạng thái đơn/tiền hiển thị riêng để CONFIRMED nhưng chưa thu không bị hiểu là PAID.
- Thẻ có mã/thời gian/items/options/tình trạng thu; thao tác chính nổi bật, target khoảng 48px trở lên, có label/focus/loading/error, không chỉ màu.
- B2 tạo đơn, B3 chuyển trạng thái/bàn giao, B4 báo hết món, C2/C4 tiền vào/thu tiền. Chưa có backend tương ứng thì hiển thị chưa khả dụng; không fixture/local success.
- List có phân trang/tìm kiếm theo contract thật, giữ filter khi reload phù hợp; không tải dữ liệu toàn chuỗi để lọc local. Conflict nhiều máy làm mới dữ liệu và giải thích, không gửi lại mutation khác state.
- Reply review cũ còn quyền nhưng không nằm màn chính; không tự cấp quyền ẩn/xóa cho Staff.

### Contract UI/API

Order summary cần orderId/code/storeId/state/version/time/items/options/payment summary; không cần toàn bộ dữ liệu khách hoặc tài chính chuỗi. Các tab dựa state thật. Tiền vào chỉ nhận DTO đã lọc store ở backend, không raw bank payload.

## Acceptance Criteria

- AC1: Staff chỉ có hai lối chính và màn phụ đúng quyền, không dashboard/ngân hàng/kho số lượng/nhân sự.
- AC2: Tab/count/thẻ phản ánh dữ liệu thật và tách state tiền với state đơn; đơn đã trả online chưa bàn giao không được hiểu là hoàn tất.
- AC3: API lỗi/rỗng/chưa có khác nhau; reload không tạo dữ liệu mẫu hoặc mất kết quả đã lưu.
- AC4: Nhấn đôi hoặc thao tác hai máy không tạo mutation trùng; conflict không che bằng success.
- AC5: Bàn phím/focus/nhãn và trạng thái không chỉ màu hoạt động; target thao tác khoảng 48px trở lên.
- AC6: Staff không đổi store bằng query/deep link để đọc đơn hoặc tiền quán khác.

## Testing Decisions

Chưa chạy. Biên chính giao diện sử dụng API thật theo role/store; dùng frontend auth-api/promotion-notification làm prior art cho boundary hiện hữu, không coi order-demo là bằng chứng tích hợp. Người dùng kiểm tra thao tác quầy/bàn phím khi yêu cầu; không tự chạy browser.

## Out of Scope

Dashboard Staff, ca/cá nhân, POS đầy đủ, máy in/két tiền, chạy mất mạng, đổi branding.

## Further Notes

Màn đẹp không đủ nghiệm thu nếu API chưa enforce role/store/state. B1 không mở money action trước C4.
