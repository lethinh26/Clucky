# C4 — Thu tiền mặt, chuyển khoản, kết hợp và xác nhận thủ công

Mốc: D2C. Nguồn: plan §7.4. Phụ thuộc: C1/C2 và contract C3; không bắt feed hoạt động để thu thủ công. Áp dụng [quy tắc chung](README.md). Trạng thái: đặc tả.

## Problem Statement

Khách quầy có thể trả nhiều nguồn, feed đến muộn hoặc sai nội dung. Bắt đủ toàn bộ số tiền trên sao kê chặn vận hành, nhưng biến xác nhận Staff thành bankTx thật làm sai sổ tiền.

## Solution

Nhân sự có quyền ghi thu theo nguồn và chấp nhận thủ công có lý do, không Manager duyệt từng đơn. Phân biệt tiền thực đối soát với tiền Staff khai/chờ đối soát; không đếm lại khi webhook đến.

## User Stories

1. Là Staff, tôi muốn ghi nhận 120.000 tiền mặt + 80.000 chuyển khoản cho đơn 200.000.
2. Là Staff, tôi muốn xác nhận có lý do khi feed chưa về hoặc chưa chọn được bankTx.
3. Là Staff, tôi muốn liên kết bankTx đúng quán/đơn nếu đã biết giao dịch.
4. Là Manager, tôi muốn xem từng nguồn, chênh lệch, lý do và account/session thao tác.
5. Là Staff, tôi muốn ghi tiền khách đưa/thối lại ngay mà không biến thành refund đơn.
6. Là Customer web, tôi không được tự đánh dấu đã trả bằng đường xác nhận của nhân sự.
7. Là người vận hành, tôi muốn retry và webhook muộn không ghi thu hai lần.

## Implementation Decisions

- Payment sở hữu collection receipt/manual acceptance; STAFF/STORE_MANAGER scope quán, ADMIN chọn quán. Chỉ server xác nhận operation thu tại quầy; Customer không bypass bằng method/channel/payload. Đơn WEB có thể được thu quầy nếu lựa chọn nghiệp vụ hợp lệ, không đổi source thành COUNTER.
- Lưu tách: cash ghi nhận, bank amount đã đối soát, transfer Staff khai chờ đối soát, quyết định chấp nhận thủ công. Không bankTx giả, không sửa bank amount, không tự bù chênh lệch vào cash/discount.
- DTO đề xuất gồm orderId/version, số tiền từng nguồn, cash tendered/change khi có, bankTx liên kết nếu biết, reason khi thủ công/ngoại lệ, idempotency key. Validate amount không âm, cash arithmetic nhất quán, quyền/store/state và bankTx chưa dùng; không tin tổng client.
- UI gợi ý thiếu/dư; không hard-block vì sao kê chưa đủ và không bắt Manager phê duyệt. Khi chấp nhận ngoại lệ, giữ nguyên số từng nguồn/chênh lệch, reason bắt buộc và audit; không thêm bán chịu/miễn tiền hoặc tự đổi giá trị đơn.
- Phương thức thực tế đã ghi nhận phải nhất quán với điều kiện refund: đơn kết hợp không được đổi nhãn thành thuần chuyển khoản để mở D1. Giữ lịch sử lựa chọn và nguồn thu, không chỉ field client sửa được.
- Link bankTx phải kiểm tra snapshot/store/đơn và unique allocation. Nếu webhook đến sau khớp khoản transfer đã khai, chuyển phần tương ứng từ chưa đối soát sang có chứng cứ; cash + tổng transfer khai không tự tăng bởi bằng chứng trùng. Phần nhận thực sự thêm theo C3; không đủ căn cứ thì chờ đối soát, không auto-match số tiền gần giống.
- Collection success không complete Order; B3 thực hiện bàn giao riêng. Version/idempotency bảo vệ nhiều máy; timeout đọc lại cùng operation, mất mạng không thành công local.

### Contract đề xuất

Receipt trả breakdown theo nguồn, bank evidence/linkage, pending reconciliation, discrepancy, manual acceptance/reason/actor/time, state/version. Bank receipt và manual acceptance là hai chiều độc lập; không dùng PAID đơn lẻ để khẳng định mọi tiền đã có sao kê. Cùng key/payload trả receipt cũ, khác payload conflict; request vào đơn đã hủy/hết hạn không tạo acceptance để mở lại.

## Acceptance Criteria

- AC1: Đơn 200.000 nhận 120.000 cash + 80.000 transfer hợp lệ, không yêu cầu bank statement 200.000.
- AC2: Chưa có feed/bankTx, Staff xác nhận thủ công với lý do; hiện pending reconciliation, không bankTx giả hoặc Manager approval.
- AC3: Ngoại lệ giữ đúng các số Staff khai, discrepancy/reason/audit, không tự bù tiền mặt hoặc coi chênh lệch là giảm giá.
- AC4: Customer/nhân sự quán khác hoặc đơn state không hợp lệ bị chặn; Admin cũng không mở lại expiry/cancel bằng collection.
- AC5: Replay/nhấn đôi/hai máy không ghi receipt hoặc success event hai lần.
- AC6: Webhook 80.000 tới sau khoản khai 80.000 không biến đơn thành thu 280.000; linkage không rõ vẫn chờ xử lý.
- AC7: Cash tendered/change hợp lệ được ghi riêng, không sinh refund; payment success không tự COMPLETED.
- AC8: Chọn/sửa nhãn phương thức không biến đơn thực thu kết hợp thành đủ điều kiện refund thuần chuyển khoản.

## Testing Decisions

Chưa chạy. Boundary collection qua Gateway + webhook muộn + readback ledger/Order; ưu tiên chuỗi 120k cash/80k transfer/retry/webhook và ngoại lệ có discrepancy. Payment cần bổ sung check hành vi tối thiểu khi triển khai; Order dùng prior art CheckoutRegressionTest. Không tự mở browser hoặc chạy kiểm thử ở lượt spec.

## Out of Scope

Manager duyệt từng khoản, hạn mức phức tạp, danh tính nhân viên cá nhân, công nợ/miễn tiền, chạy mất mạng, chi trả tiền chuyển dư.

## Further Notes

“Offline” ở đây là thanh toán tại quầy, không phải ứng dụng hoạt động không có mạng. Xác nhận Staff không phải bằng chứng ngân hàng để tự cấp refund.
