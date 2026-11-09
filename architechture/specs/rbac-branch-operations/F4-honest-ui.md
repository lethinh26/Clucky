# F4 — Dữ liệu thật, lỗi thật và bàn giao Đợt 1

Mốc: Đợt 1. Nguồn: plan §4 F4. Phụ thuộc: F1–F3. Áp dụng [quy tắc chung](README.md). Trạng thái: đặc tả, chưa nghiệm thu.

## Problem Statement

Fixture, fallback local success và thông báo dẫn sai quyền khiến người dùng tưởng đã lưu/xóa/thu/xuất báo cáo trong khi server chưa thực hiện.

## Solution

Tách rõ loading, thành công, rỗng thật, lỗi và chưa triển khai. Chỉ thông báo thành công sau phản hồi nghiệp vụ thật; chức năng chưa có backend không được giả làm dữ liệu vận hành.

## User Stories

1. Là người dùng, tôi muốn biết thao tác thất bại để không dựa vào dữ liệu chưa lưu.
2. Là Manager, tôi muốn danh sách rỗng khác lỗi quyền hoặc server.
3. Là Staff, tôi muốn thông báo mở được màn đúng quyền/quán.
4. Là Admin, tôi muốn biết chức năng còn khóa và phần đã sửa để nghiệm thu Đợt 1 độc lập.

## Implementation Decisions

- Rà các màn Promotions, Users, Payments, Reports, Reviews, Dashboard và notification; gỡ fixture/fallback khỏi đường production được mở. Có thể giữ source demo tách biệt, không hiển thị như dữ liệu thật.
- Mutation lỗi giữ form và thông báo phù hợp; rollback optimistic state nếu dùng. Không catch rồi sửa array/toast success; request timeout có khả năng đã commit phải reload/tra kết quả trước retry theo key.
- List trả rỗng thật thì empty state; 403/404/5xx/network hiện trạng thái tương ứng, không thay bằng mock hoặc tự hiểu 404 là danh sách rỗng.
- Notification link dùng loại tài nguyên/quyền/store đã xác minh; đích vẫn kiểm tra quyền. Không phát link tài chính cho Staff chỉ vì nhận cùng loại thông báo.
- Export chỉ báo thành công khi nhận kết quả/file thật; chưa có backend thì khóa có lý do. Không hoàn thiện toàn bộ Reports/Payments/Users ở F4.

### Contract nghiệm thu UI

Mỗi action công bố API thật đang dùng hoặc trạng thái chưa khả dụng. Thành công phải tồn tại sau reload; API không hỗ trợ không được tự sinh object nghiệp vụ/audit trong trình duyệt. Lỗi dùng catalog/i18n hiện hữu, không lộ raw exception.

## Acceptance Criteria

- AC1: 403/404/5xx/mất mạng không hiện success, fixture hoặc bản ghi tạo local như dữ liệu thật.
- AC2: Danh sách rỗng không bị thay bởi dữ liệu mẫu; lỗi giữ form và có cách retry hợp lý.
- AC3: Notification Staff không dẫn dashboard/payments quản trị/voucher; deep link sai quán vẫn bị backend chặn.
- AC4: Export chưa nối thật không tạo toast/file giả; mọi chức năng còn khóa có nhãn rõ.
- AC5: Có bảng endpoint/action/role đã sửa, chức năng còn khóa, checklist tự kiểm thử và ghi nhận phần chưa nghiệm thu.
- AC6: Đóng Đợt 1 không phụ thuộc việc toàn bộ A–E đã hoàn thiện, nhưng không còn lỗi vượt quyền/scope đã xác định trong các luồng đang mở.

## Testing Decisions

Chưa chạy. Biên chính UI/API tại từng action với response thành công/rỗng/lỗi, sau đó reload. Tham khảo frontend promotion-notification/auth-api tests; không dùng fixture test để chứng minh tích hợp production. Không tự mở browser hoặc chạy test.

## Out of Scope

Làm lại dashboard, báo cáo, thanh toán và danh sách tài khoản đầy đủ; công việc đó thuộc đợt 2.

## Further Notes

Bàn giao phân biệt “đã sửa code”, “build/health thành công” và “người dùng đã kiểm thử”; không gộp thành tuyên bố đã test.
