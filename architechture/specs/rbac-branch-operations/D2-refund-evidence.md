# D2 — Bằng chứng hoàn tiền Cloudinary có kiểm soát truy cập

Mốc: D2D. Nguồn: plan §8.3. Phụ thuộc: D1, Cloudinary delivery hạn chế được kiểm chứng khi triển khai. Áp dụng [quy tắc chung](README.md). Trạng thái: đặc tả.

## Problem Statement

Ảnh chuyển khoản chứa dữ liệu ngân hàng; dùng URL public như ảnh món hoặc tin publicId client có thể lộ thông tin/gắn ảnh người khác. Upload thành công cũng không chứng minh đã chuyển tiền.

## Solution

Manager chuyển bằng công cụ ngân hàng bên ngoài, upload bằng chứng vào đúng refund/attempt rồi xác nhận riêng. Server kiểm soát upload, liên kết asset và quyền xem; không tự động xác minh giao dịch bằng ảnh.

## User Stories

1. Là Manager, tôi muốn upload ảnh cho đúng lần xử lý refund quán mình.
2. Là Manager, tôi muốn lỗi upload giữ form và hồ sơ, không báo đã hoàn hoặc phải chuyển tiền lại.
3. Là Customer-owner, tôi muốn xem bằng chứng của yêu cầu mình mà không công khai ảnh.
4. Là Admin, tôi muốn kiểm tra actor/store/amount/time của lần xác nhận và ảnh kèm theo.
5. Là người vận hành, tôi muốn request retry không tạo refund hoặc liên kết asset trái phép.

## Implementation Decisions

- Tái dùng tích hợp Cloudinary hiện hữu, không tạo service upload mới. Server cấp quyền upload theo actor/store/refund/attempt, kiểm tra role và state trước cấp quyền và trước liên kết.
- Validate loại ảnh thực sự, MIME/extension/dung lượng và giới hạn upload theo contract; không cho HTML/SVG/script trá hình nếu không được xử lý an toàn. Không tin publicId/URL tùy ý hoặc URL ngoài để server tải về.
- Liên kết asset với refundId/store/actor/attempt, amount snapshot và thời điểm xác nhận; ownership asset phải do server xác minh qua phiên upload/provider, không chỉ parse tên file client.
- Ảnh dùng cơ chế authenticated/private delivery thích hợp. Server kiểm tra Customer-owner, Manager-quán hoặc Admin trước cấp URL/quyền xem có hạn; không URL public vĩnh viễn, không nhúng bí mật ký Cloudinary vào frontend.
- Nếu gói/cấu hình Cloudinary chưa bảo đảm delivery hạn chế thì giữ tính năng chưa khả dụng, không fallback public. Không gọi “private” chỉ vì URL khó đoán; kiểm chứng quyền truy cập là điều kiện mở tính năng.
- Upload success chỉ tạo evidence link; confirm refunded là mutation riêng D1, kiểm tra amount/attempt/version/evidence. Ảnh là bằng chứng người có quyền cung cấp, không xác nhận tự động từ ngân hàng.
- Upload lỗi giữ request/form và trạng thái lỗi để retry upload, không lặp bank transfer. Không tự xóa asset đã tham chiếu/đã xác nhận; dọn orphan nếu có phải xác minh không còn tham chiếu, không tác động ledger.

### Contract đề xuất

Operations: authorize upload, register verified asset, request evidence access, confirm refund qua D1. Output upload/access permission tối thiểu, có hạn; không credential provider. Register cần refund/attempt và kết quả phiên upload được xác minh; mọi thao tác asset truy vết server-side.

## Acceptance Criteria

- AC1: Staff/Manager khác quán/Customer khác không upload, gắn hoặc xem ảnh; biết publicId không đủ cấp quyền.
- AC2: URL ngoài hoặc asset không thuộc upload session/refund bị từ chối; ảnh sai loại/quá dung lượng không được lưu như evidence hợp lệ.
- AC3: Truy cập ảnh trực tiếp chưa được cấp quyền không public; access link có hạn, không secret frontend.
- AC4: Upload success không đổi REFUNDED; confirm cần role/state/version/asset đúng và ghi actor/amount/time.
- AC5: Upload lỗi/retry không mất form, không tạo refund/chi tiền lần hai; không tự xóa asset đang tham chiếu.
- AC6: Cấu hình không hỗ trợ delivery hạn chế giữ chức năng khóa có lý do, không chuyển sang ảnh public.

## Testing Decisions

Chưa chạy. Boundary upload authorization/register/access + confirm D1, dùng quyền owner/store khác nhau và asset giả. Bổ sung kiểm chứng provider delivery thực khi được yêu cầu; unit test URL signing không thay thế chứng cứ ảnh không public. Không upload ảnh ngân hàng thật trong lượt viết spec.

## Out of Scope

OCR xác minh ngân hàng tự động, app tự chuyển tiền, ảnh public, xóa bằng chứng đã xác nhận hoặc tích hợp lưu trữ mới ngoài phạm vi.

## Further Notes

Timeout sau khi người dùng đã chuyển ngoài app phải đối soát trước retry chi tiền; idempotency phần mềm không ngăn được hai lần chuyển thủ công ngoài hệ thống.
