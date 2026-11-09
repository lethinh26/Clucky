# F2 — Quyền API, ownership và phạm vi quán

Mốc: Đợt 1. Nguồn: plan §4 F2. Phụ thuộc: F1. Áp dụng [quy tắc chung](README.md). Trạng thái: đặc tả, chưa nghiệm thu.

## Problem Statement

Một số API tin actor header, thiếu guard role/action/owner, trong khi frontend Manager gọi endpoint quản trị quá rộng. Mở thêm quyền để chữa 403 sẽ làm lộ dữ liệu hoặc cho thao tác vượt vai trò.

## Solution

Khóa quyền tại service sở hữu, sửa frontend gọi đúng operation. Không mở danh sách users toàn hệ thống hoặc nghiệp vụ Party chỉ vì controller tồn tại.

## User Stories

1. Là Admin, tôi muốn CRUD voucher bằng danh tính xác thực, không actor header giả.
2. Là Manager, tôi muốn sửa vận hành quán mình qua API hẹp.
3. Là Customer, tôi muốn checkout và tài nguyên đơn được bảo vệ ownership.
4. Là Staff, tôi muốn chỉ xử lý action được phép trên đơn quán mình.
5. Là Manager, tôi muốn màn chưa có API scoped báo chưa khả dụng thay vì hiển thị người dùng toàn chuỗi.

## Implementation Decisions

- Promotion: lấy actor từ JWT; CRUD/list/detail quản trị voucher Admin-only trong khi proposal chưa làm. Tách rõ lookup/validate voucher cho checkout Customer hiện hữu, không vô tình khóa luồng mua hợp lệ.
- Catalog: Manager dùng operation API allowlist, không dùng CRUD quán Admin. Field phone/deliveryArea chưa có contract thì hiển thị chưa hỗ trợ, không lách lưu qua endpoint Admin; B4 bổ sung sau.
- Order: checkout/preview online theo quyền CUSTOMER và ownership hiện hữu; không gán ID nhân sự vào customerId. API quầy nằm ở B2.
- Order/Party: authorize từng action và scope trước mutation. Không cho Staff/Admin vượt state bằng generic status endpoint; tính năng Party chưa đủ điều kiện giữ khóa.
- Identity/UI Users: không mở GET users toàn hệ thống cho Manager. Chưa có list scoped thực thì hiển thị chưa khả dụng; không fixture.

### Contract nghiệp vụ

Các endpoint hiện hữu giữ URL khi có thể, nhưng bỏ quyền quyết định của header actor tự khai. DTO Manager chỉ gồm field vận hành đã được hỗ trợ, từ chối field quản trị bị cấm. Query/detail/mutation đều ép store và owner; list không được lấy toàn bộ rồi chỉ lọc trên frontend.

## Acceptance Criteria

- AC1: Giả actor header Admin với JWT Staff/Manager không CRUD hoặc đọc danh sách/detail voucher quản trị được.
- AC2: Manager cập nhật field hợp lệ của quán mình thành công; sửa ID quán hoặc gửi field Admin bị chặn, không thay dữ liệu.
- AC3: JWT Staff/Manager/Admin không checkout như Customer; Customer không đọc/hủy đơn người khác.
- AC4: Order/Party request trực tiếp không vượt quyền action; chức năng Party đang khóa không được mở thêm.
- AC5: Manager không nhận users toàn hệ thống, cả list và detail; màn thiếu API không dùng fixture.
- AC6: Customer vẫn validate voucher hợp lệ cho checkout; sửa quyền quản trị không làm hỏng boundary công khai đã được cho phép.

## Testing Decisions

Chưa chạy. Biên chính Gateway/JWT với role, store và owner khác nhau. Tham khảo VoucherServiceTest, CheckoutRegressionTest, OrderVerificationTest, InternalCatalogSecurityTest. Kiểm tra response và dữ liệu không đổi khi bị từ chối, không assert private method.

## Out of Scope

Voucher proposal, API quầy mới, danh bạ nhân sự toàn chuỗi cho Manager và hoàn thiện Party.

## Further Notes

Bàn giao ma trận endpoint/method/action/role/scope; đối chiếu source lúc triển khai vì audit phản ánh thời điểm trước đó.
