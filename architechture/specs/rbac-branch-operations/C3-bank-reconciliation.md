# C3 — Cộng dồn chuyển khoản, đối soát và hết hạn

Mốc: D2C. Nguồn: plan §7.3, §12. Phụ thuộc: C1/C2, feed được xác thực; phối hợp C4. Áp dụng [quy tắc chung](README.md). Trạng thái: đặc tả.

## Problem Statement

Một đơn có thể nhận nhiều khoản từ nhiều người, webhook trùng/đồng thời hoặc tiền đến trễ. Xử lý theo một lần chuyển dễ mất tiền, xác nhận lặp, tính dư thành doanh thu hoặc mở lại đơn hết hạn.

## Solution

Payment giữ sổ bank transaction và allocation bền, idempotent; tổng từ khoản hợp lệ, xác nhận một lần. Thiếu/dư/chưa đối soát/tiền đến trễ được hiển thị riêng, không tự mở chi trả ngoài phạm vi.

## User Stories

1. Là Customer, tôi muốn các lần chuyển hợp lệ cùng mã được cộng dù người gửi khác nhau.
2. Là Customer, tôi muốn thấy đã nhận/còn thiếu, đủ hoặc dư thì đơn được xác nhận.
3. Là Staff/Manager, tôi muốn webhook retry không làm tổng tiền tăng giả.
4. Là Admin, tôi muốn khoản sai nội dung hoặc đến sau expiry vẫn được lưu để theo dõi.
5. Là Manager, tôi muốn dư không tăng doanh thu/điểm thưởng và không tự phát hoàn tiền chưa hỗ trợ.

## Implementation Decisions

- Webhook xác thực theo nguồn tích hợp hiện hữu; chỉ chấp nhận dữ liệu sau validate identity/signature/secret, amount và ID. Lưu bền trước ACK thành công; lỗi tạm thời cho retry theo provider, không ACK rồi bỏ tiền.
- Unique bankTxId theo phạm vi định danh được nguồn bảo đảm; nếu ID chỉ unique trong provider/account thì key bao gồm phạm vi đó. Cùng ID khác nội dung tài chính không ghi đè ledger: giữ để điều tra/xử lý lỗi, không cộng lần hai.
- Bank transaction bất biến về amount gốc; allocation tối đa một order, không chia nhiều đơn. C3 chỉ cộng khoản hợp lệ gắn payment theo C2 và snapshot. Transaction/unique/lock bảo vệ allocation và recompute aggregate trước publish.
- Luồng thuần chuyển khoản: `received = tổng allocation ngân hàng hợp lệ`, `missing = max(orderTotal - received, 0)`, `excess = max(received - orderTotal, 0)`. VND chính xác, không float. Thiếu giữ chờ; đủ/dư chuyển payment thành đã nhận đủ và Order xác nhận đúng một lần khi còn hợp lệ.
- Tiền dư giữ riêng, không làm tăng order total/revenue/loyalty. Payment sau PAID/COMPLETED vẫn nhận thêm ledger, không publish thành công/earn points lần nữa.
- Deadline giữ nguyên. Expiry và webhook cạnh tranh phải có kết quả bền nhất quán: khi expiry/hủy đã thắng, tiền vẫn ghi nhận nhưng không mở lại/đẩy bếp. Không sửa deadline khi nhận một phần; không backdate để hồi sinh đơn.
- Khoản đến sau hủy/hết hạn lưu order/store nếu xác định được và trạng thái chưa xử lý. Hủy hợp lệ trước PREPARING xét D1, expiry không tự thành refund basic.
- C4 đã khai chuyển khoản: webhook xác nhận khoản khai thì bổ sung chứng cứ/thay phần chờ đối soát tương ứng, không cộng lần hai vào số thu tác nghiệp. Không đủ căn cứ liên kết thì giữ pending reconciliation; không ghép gần đúng để làm đẹp tổng.
- Phát sự kiện sau commit, dedup Payment/Order/Loyalty/Notification theo event và business transition; lỗi publish phải phát lại bền, không buộc khách trả lại.

### Contract đề xuất

Webhook input theo provider thực tế, không phát minh provider mới. Read summary trả bank received/missing/excess, allocation/reconciliation status, payment state và deadline. Tách financial receipt với manual acceptance C4; PAID không bắt Order COMPLETED. Có khả năng tra transaction/operation sau timeout.

## Acceptance Criteria

- AC1: Đơn 200.000, nhận 70.000+50.000 → received 120.000, missing 80.000; thêm 100.000 → received 220.000, excess 20.000, một lần xác nhận.
- AC2: Replay 100.000 giữ nguyên tổng; hai webhook đồng thời không mất khoản hoặc xác nhận hai lần.
- AC3: Hai bankTx khác ID/cùng nội dung/khác sender đều cộng khi hợp lệ; một bankTx không gán hai đơn.
- AC4: Webhook chưa xác thực/amount sai không ảnh hưởng ledger hợp lệ; lỗi lưu không báo ACK thành công giả.
- AC5: Tiền tới sau PAID/COMPLETED không phát success/points lần nữa; thiếu rồi expiry không gia hạn/mở lại.
- AC6: Sai nội dung giữ chưa đối soát, không thông báo nhầm khách; expiry/cancel race không đưa đơn đã hết hạn trở lại bếp.
- AC7: Dư và tiền đơn hết hạn được lưu chưa xử lý, không doanh thu/REFUNDED/REJECTED hoặc API/event chi trả.
- AC8: Webhook chứng minh khoản Staff đã khai không làm thu lần hai; không rõ linkage thì chờ đối soát.

## Testing Decisions

Chưa chạy. Boundary webhook → Payment summary → Order/Notification observable, có replay và concurrency thật. Tham khảo CheckoutRegressionTest và LoyaltyMathTest ở consumer; không dùng tổng local frontend làm oracle. Khi triển khai cần một kiểm chứng runnable tối thiểu cho các invariant cộng dồn/race, không thêm framework mới.

## Out of Scope

Trả dư, trả tiền đơn hết hạn, gia hạn tự động, một bankTx chia nhiều đơn, suy đoán match hoặc tích hợp ngân hàng ngoài phạm vi.

## Further Notes

Tạm hoãn chi trả không làm đơn nhận đủ/dư thất bại. Trạng thái “chưa xử lý” không phải từ chối hoàn vĩnh viễn.
