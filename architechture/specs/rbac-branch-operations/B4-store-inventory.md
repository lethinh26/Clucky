# B4 — Manager settings, số lượng tồn và cảnh báo

Mốc: D2B. Nguồn: plan §6.4. Phụ thuộc: F1/F2, Catalog/Notification. Áp dụng [quy tắc chung](README.md). Trạng thái: đặc tả.

## Problem Statement

Manager cần chỉnh vận hành quán mà không CRUD dữ liệu gốc; kho cần cảnh báo hữu ích, không spam hoặc cho Staff sửa quantity dưới tên “báo hết món”.

## Solution

Operation API scoped cho giờ, liên hệ, tạm đóng, tọa độ/khu vực giao. Manager cập nhật tồn/ngưỡng chung quán mặc định 20; Staff chỉ báo hết món thủ công.

## User Stories

1. Là Manager, tôi muốn chỉnh giờ/liên hệ/tạm đóng/vị trí/phạm vi giao quán mình.
2. Là Manager, tôi muốn cập nhật quantity và một ngưỡng chung cho quán.
3. Là Manager, tôi muốn nhận cảnh báo một lần mỗi đợt tồn thấp, không mỗi lần mở trang.
4. Là Manager, tôi muốn đổi ngưỡng và được đánh giá lại các món liên quan.
5. Là Staff, tôi muốn báo hết món ngay nhưng không tăng tồn hoặc bật bán vượt tồn 0.
6. Là Admin, tôi muốn quản lý tương ứng cho mọi quán, giữ quyền ngân hàng và dữ liệu gốc riêng.

## Implementation Decisions

- Catalog sở hữu settings/inventory/threshold, không thêm kho nguyên liệu. DTO operation allowlist giờ/liên hệ/tạm đóng/tọa độ/phạm vi giao; validate định dạng liên hệ, giờ và latitude/longitude hợp lệ, cấu trúc phạm vi theo mô hình sẵn có. Không cho Manager sửa ngân hàng/phí ship hệ thống/quán khác.
- Một threshold/store, số nguyên không âm, mặc định 20; áp quantity sản phẩm inventory hiện tại, không threshold từng món. Quantity validate theo đơn vị inventory hiện hữu, không âm; mutation có version/chống ghi đè cạnh tranh với reserve.
- Staff manual-unavailable là trạng thái khả dụng thủ công riêng, không rewrite quantity/price/threshold. Việc bật lại nếu có phải chịu quy tắc tồn/khả dụng server, không vượt tồn 0.
- Cảnh báo dựa đợt theo store/product: từ trên ngưỡng xuống bằng/dưới → mở đợt; tiếp tục thấp không spam; vượt ngưỡng → đóng; xuống lại → đợt mới. Mutation tồn/đổi ngưỡng là trigger, không GET.
- Đổi threshold đánh giá lại: mở cho sản phẩm vừa trở thành thấp, đóng cho sản phẩm không còn thấp; gộp thông báo theo thay đổi, không phát lặp cho đợt còn mở. Rollout dữ liệu đang thấp phải khởi tạo trạng thái đợt rõ, không phát mỗi lần đọc.
- Event/correlation và dedup tại Notification; nhận bởi Manager quán, không biến cảnh báo thành dashboard Staff. Gửi lỗi retry, không rollback cập nhật tồn đã commit.

### Contract đề xuất

Operations: update-store-operations, update-inventory-quantity, update-store-threshold, mark-manual-unavailable. Input chỉ field được phép + concurrency token; actor/store server xác định. Output settings/quantity/threshold/availability thật. Low-stock event có store/product/quantity/threshold/episode ID, không thông tin khách.

## Acceptance Criteria

- AC1: Manager sửa field hợp lệ quán mình; field ngân hàng/phí ship hệ thống/quán khác bị chặn.
- AC2: Threshold mặc định 20, số âm/thập phân bị từ chối; Staff không chỉnh quantity/threshold/price bằng request trực tiếp.
- AC3: 21→20 phát một cảnh báo; 20→19 và GET lặp không phát thêm; 19→21→20 mở đợt mới.
- AC4: Đổi threshold đánh giá lại và gộp thông báo, không spam đợt chưa đóng.
- AC5: Staff báo hết món không sửa quantity; không bật bán khi tồn 0.
- AC6: Hai mutation/reserve cạnh tranh không làm mất cập nhật hoặc tồn âm; Notification retry không duplicate cảnh báo.

## Testing Decisions

Chưa chạy. Boundary Catalog qua Gateway và Notification observable; tham khảo LocationControllerTest/InternalCatalogSecurityTest. Kiểm tra chuỗi chuyển tồn/ngưỡng và event replay; không test bằng đọc trang nhiều lần rồi coi đó là trigger hợp lệ.

## Out of Scope

Kho nguyên liệu/công thức, threshold từng món, Staff nhập kho chờ duyệt, đổi ngân hàng hoặc phí ship hệ thống.

## Further Notes

F2 chỉ cho sửa field đã có contract; B4 chịu trách nhiệm hoàn thiện liên hệ/phạm vi giao còn thiếu, không tận dụng endpoint Admin để lách quyền.
