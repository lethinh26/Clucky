# D1 — Refund basic, trạng thái và thông tin nhận hoàn

Mốc: D2D, không phải mốc Đợt 1 của plan. Nguồn: plan §8.1–8.2, §12. Phụ thuộc: F3, C3/C4; hoàn tất cần D2, thông báo D3. Áp dụng [quy tắc chung](README.md). Trạng thái: đặc tả.

## Problem Statement

Duyệt hoàn chưa phải đã chi tiền; CANCELLED hiện tại không chứng minh đơn hủy trước chế biến hoặc không phải expiry. Luồng cũ có thể hoàn quá số thực nhận hoặc cho sửa tài khoản nhận trong lúc đang chuyển.

## Solution

Refund chỉ cho đơn chọn thuần chuyển khoản, đã nhận tiền thực, hủy hợp lệ tại PENDING_PAYMENT/CONFIRMED trước PREPARING. Manager xử lý quán mình, Admin cùng điều kiện toàn hệ thống; trạng thái tách xét duyệt, chuyển, chờ thông tin và xác nhận hoàn.

## User Stories

1. Là Customer, tôi muốn yêu cầu hoàn đúng khoản đã chuyển khi hủy hợp lệ trước chế biến.
2. Là Manager, tôi muốn thấy căn cứ hủy, tiền thực nhận/chưa hoàn trước xét duyệt.
3. Là Admin, tôi muốn xử lý mọi quán nhưng không vượt điều kiện refund đã chốt.
4. Là Customer, tôi muốn sửa tài khoản nhận của chính yêu cầu đang chờ thông tin.
5. Là Manager, tôi muốn tài khoản nhận được snapshot để biết mình chuyển theo phiên bản nào.
6. Là Manager, tôi muốn lỗi ngân hàng/upload/timeout không biến thành từ chối hoặc chi hai lần.
7. Là khách mua tại quầy thuần chuyển khoản, tôi muốn cùng điều kiện refund, không bị loại chỉ vì nguồn COUNTER.
8. Là Staff, tôi không được duyệt hoặc đánh dấu hoàn; không thể lách qua status mutation.

## Implementation Decisions

- Giữ boundary hiện hữu: Order sở hữu refund request và bằng chứng state/cancellation reason/history; Payment sở hữu tiền thực nhận/allocation/đã chi. Trao đổi API/event có xác thực, không chuyển toàn bộ request sang service mới hoặc cross-DB join.
- Eligibility do server tính: phương thức thuần chuyển khoản, có bank receipt hợp lệ chưa hoàn, cancellation snapshot từ PENDING_PAYMENT/CONFIRMED, chưa từng vào PREPARING và không phải expiry. Manual acceptance C4 không thay bank evidence.
- Phân biệt reason nghiệp vụ hủy với hủy do hết hạn ở dữ liệu/event. Cả WEB/COUNTER cùng điều kiện, không lấy PICKUP hoặc customerId có/không làm chứng cứ đủ điều kiện.
- Số tiền hoàn do server tính từ phần thực nhận hợp lệ thuộc giá trị đơn chưa hoàn/đang giữ cho lượt chi. Không hoàn total nếu mới nhận một phần; không gồm excess hoặc tiền nhóm expiry. Cần reservation/unique/version bảo vệ tổng hoàn không vượt phần đủ điều kiện khi hai request cạnh tranh.
- Request hiện có trong Order cần migration mới cho state mở rộng, cancellation snapshot, bank details phiên bản, processing attempt và customer nullable nếu đơn quầy. Không tự gán Staff là Customer để né schema.
- Thông tin người thụ hưởng do Customer chọn từ danh sách ngân hàng VietQR theo BIN; nhập số tài khoản và tên chủ tài khoản trực tiếp dạng text. Snapshot ngân hàng/BIN/tài khoản/tên chủ tài khoản được lưu cùng refund attempt.
- Customer chỉ tạo/xem/cập nhật yêu cầu của mình theo ownership hiện hữu. Với đơn vãng lai không customerId, không tự cấp đường public chỉnh ngân hàng bằng mã đơn; Manager/Admin xử lý hồ sơ đúng quán qua tác nghiệp có audit, xác nhận thông tin nhận hoàn và snapshot. Đây là contract tác nghiệp đề xuất để hỗ trợ phạm vi đơn quầy, không thêm account Customer giả hoặc email người nhận suy đoán.
- Review từ chối chỉ vì yêu cầu không hợp lệ với reason bắt buộc, không tiêu chí cảm tính. Khoản tạm hoãn không vào REJECTED chỉ vì chưa làm tính năng. Không đổi payment PAID thành UNPAID sau hoàn.

### State contract đề xuất

| Từ | Đến/action | Điều kiện |
|---|---|---|
| Chưa có request | PENDING | Eligibility/ownership hợp lệ, chống trùng |
| PENDING | APPROVED | Manager quán/Admin xác minh điều kiện và amount server |
| PENDING | REJECTED | Không hợp lệ, reason bắt buộc; chưa chi tiền |
| APPROVED | PROCESSING | Claim xử lý bằng version/attempt; snapshot nơi nhận |
| APPROVED/PROCESSING | WAITING_BANK_DETAILS | Ngân hàng nhận không dùng được, có lý do; lượt chuyển được dừng rõ, không chuyển chưa biết kết quả |
| WAITING_BANK_DETAILS | APPROVED | Cập nhật thông tin hợp lệ bởi Customer-owner hoặc tác nghiệp quầy có quyền; không tự REFUNDED |
| PROCESSING | REFUNDED | Manager/Admin xác nhận chuyển thành công, D2 evidence hợp lệ, amount/attempt/version khớp |

REFUNDED không quay lại để chi thêm. PROCESSING không cho đổi nơi nhận; chưa rõ chuyển tiền thành công hay chưa thì giữ chờ đối soát attempt, không timeout rồi tự chuyển lại. Upload thành công không đổi state tài chính. REJECTED không dùng cho lỗi hạ tầng.

### Contract đề xuất

Operations: create/read request, approve/reject, claim processing, request bank detail update, update own bank details, confirm refunded. DTO nhận target/reason/bank detail version/idempotency hoặc concurrency token theo action; không nhận amount/approval tùy ý từ Customer. Reject API hiện hữu cần reason được validate. Output gồm state, amount server, eligibility reason an toàn, attempt và field ngân hàng theo quyền, không dữ liệu người khác.

## Acceptance Criteria

- AC1: Thuần chuyển khoản đã nhận/hủy trước PREPARING được xét; cash/mixed/chưa có tiền/đã chế biến/hoàn thành không đủ điều kiện, kể cả Admin.
- AC2: Đơn quầy thuần chuyển khoản cũng được xét; không fake customerId hoặc cấp quyền public theo mã đơn.
- AC3: Đơn 200.000 mới nhận 70.000 thì không hoàn 200.000; nhận 220.000 không gộp 20.000 excess vào refund basic.
- AC4: Expiry có tiền không tự tạo refund; excess/expiry vẫn chưa xử lý, không REJECTED/REFUNDED hoặc event chi trả.
- AC5: Approve không là refunded; hai máy claim/confirm không chi nhận trùng; tổng request không vượt phần đủ điều kiện.
- AC6: Bank lỗi đi WAITING_BANK_DETAILS có notify; Customer khác/Staff không sửa nơi nhận hoặc amount/approval.
- AC7: Cập nhật thông tin đưa về APPROVED, giữ snapshot lần cũ; PROCESSING không đổi nơi nhận đang chuyển.
- AC8: Upload/network timeout không thành REJECTED hoặc tự chi lại; REFUNDED cần bằng chứng và xác nhận có quyền.

## Testing Decisions

Chưa chạy. Boundary Refund qua Gateway kết hợp Payment readback; bảng eligibility theo method/receipt/cancel snapshot/expiry và actor/store/owner. Có race claim/confirm và sửa bank detail. Tham khảo OrderVerificationTest/CheckoutRegressionTest; controller Refund hiện chỉ có create/list/approve/reject không chứng minh các operation mới đã tồn tại.

## Out of Scope

Refund cash/mixed, khiếu nại sau chế biến/hoàn thành, trả dư, trả tiền đơn hết hạn, bank transfer tự động, quyền Staff approve/refunded.

## Further Notes

Các state mới và tác nghiệp hồ sơ khách vãng lai phải chốt wire contract trước mở UI; không cần hỏi lại phạm vi refund đã được người dùng duyệt.
