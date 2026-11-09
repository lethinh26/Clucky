# F3 — Sửa state Order/Payment hiện hữu

Mốc: Đợt 1. Nguồn: plan §4 F3. Phụ thuộc: F1, phối hợp F2. Áp dụng [quy tắc chung](README.md). Trạng thái: đặc tả, chưa nghiệm thu.

## Problem Statement

Hủy từ PREPARING, thu COD bằng đổi Order thành COMPLETED và coi APPROVED là REFUNDED làm trạng thái không phản ánh thực tế, đặc biệt khi nhiều máy thao tác.

## Solution

Hủy chỉ từ PENDING_PAYMENT/CONFIRMED, bắt buộc lý do và chống race. Tách thu tiền, bàn giao và chi hoàn; đường chưa có backend thật bị vô hiệu hóa, không xây Payment mới trong gói fix.

## User Stories

1. Là Customer, tôi muốn hủy đúng điều kiện trước chế biến và thấy lý do khi không thể hủy.
2. Là Staff, tôi muốn hủy và bắt đầu chế biến không cùng thành công trên hai máy.
3. Là Staff, tôi muốn nút thu tiền không báo đã thu khi chưa có nghiệp vụ lưu thật.
4. Là Manager, tôi muốn duyệt hoàn khác với đã chuyển hoàn.
5. Là Admin, tôi muốn dữ liệu lịch sử thiếu bằng chứng được giữ để xử lý, không tự sửa thành đã thu/đã hoàn.

## Implementation Decisions

- Order service tập trung kiểm tra transition tại boundary nghiệp vụ dùng chung cho cancel/reject/status; quyền Admin không bỏ qua state.
- State và history/audit chuyển cùng transaction; optimistic version hoặc khóa phù hợp bảo đảm chỉ một transition từ state cũ được commit. Client conflict tải lại đơn, không tự retry một quyết định khác.
- Chuẩn hóa note/reason theo contract hiện hữu; lý do hủy không được rỗng/toàn khoảng trắng, có giới hạn độ dài.
- React bỏ đường COD gọi hoàn thành đơn. Nếu chưa có endpoint Payment chứng minh thu tiền, khóa thao tác với lý do; không endpoint giả/local success.
- Không cập nhật trạng thái tiền chỉ do đổi Order; không tạo refund chỉ trong frontend hoặc coi APPROVED đã chi. Không suy đoán/chuyển trạng thái lịch sử thiếu căn cứ.

### Contract nghiệp vụ

Cancel input gồm target, reason và concurrency token nếu triển khai version; actor/store do server xác minh. Output là state đã commit hoặc lỗi quyền/state/conflict. Chỉ `PENDING_PAYMENT | CONFIRMED → CANCELLED`; `PREPARING`, `READY`, `SHIPPING`, `COMPLETED` không đi CANCELLED bằng bất kỳ endpoint nào. Khóa luồng hoàn tất khi không chứng minh được điều kiện thu tiền thực tế của luồng đó.

## Acceptance Criteria

- AC1: Cancel/reject/status đều từ chối hủy từ PREPARING trở đi cho mọi role, kể cả Admin.
- AC2: Lý do rỗng bị từ chối; hủy hợp lệ lưu reason và actor thật.
- AC3: Hai máy hủy/bắt đầu PREPARING cùng version: chỉ một thắng; máy còn lại thấy conflict/state mới.
- AC4: Bấm thu COD không đổi Order sang COMPLETED thay Payment; thiếu API thì không có mutation thành công giả.
- AC5: Approve refund không tạo REFUNDED; reload vẫn phản ánh trạng thái thật.
- AC6: Không tự backfill các đơn lịch sử thành đã thu/đã hoàn khi không có bằng chứng.

## Testing Decisions

Chưa chạy. Biên chính Order HTTP và trạng thái bền; race cần hai request đồng thời, không chỉ gọi tuần tự. Tham khảo CheckoutRegressionTest/OrderVerificationTest; test frontend order-demo không phải bằng chứng thanh toán thực. Người dùng kiểm tra nút bị khóa và conflict.

## Out of Scope

Payment ledger, thu kết hợp, API chi hoàn, thiết kế lại màn xử lý đơn; thuộc C/D/B3.

## Further Notes

Đóng F3 bằng sửa an toàn luồng đang có, không phải hoàn thiện Payment. Danh sách tính năng tạm khóa đi cùng bàn giao F4.
