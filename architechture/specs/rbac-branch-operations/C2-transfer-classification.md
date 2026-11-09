# C2 — Mã chuyển khoản và phân loại tiền vào theo quán

Mốc: D2C. Nguồn: plan §7.2. Phụ thuộc: C1, Order. Áp dụng [quy tắc chung](README.md). Trạng thái: đặc tả.

## Problem Statement

Nhiều quán dùng chung một ngân hàng không thể phân quyền bằng tài khoản nhận hoặc tìm chuỗi “001”. Nội dung sai/xung đột cần giữ lại thay vì lộ toàn sao kê hoặc gán nhầm khách.

## Solution

Mã quán và mã đơn tách rõ, parse/đối chiếu tại backend; lưu phân loại storeId bền để query scoped. Khoản không đủ căn cứ giữ cho Admin, không phỏng đoán phân cho Staff.

## User Stories

1. Là Customer, tôi muốn nội dung/QR chỉ rõ đơn và quán để tiền được đối soát đúng.
2. Là Staff quán 001, tôi muốn chỉ thấy khoản đã phân loại 001 dù account dùng chung với 002.
3. Là Staff, tôi muốn tìm khoản đúng quán nhưng chưa gán đơn để hỗ trợ thu thủ công theo quyền.
4. Là Admin, tôi muốn thấy khoản thiếu/sai/xung đột mã để xử lý, không bị mất giao dịch.
5. Là người trả payment cũ, tôi muốn QR/nội dung cũ vẫn đối soát được đúng snapshot.

## Implementation Decisions

- Giữ Store.id số tự tăng, biểu diễn tối thiểu ba chữ số: 1→001, 2→002, 1000→1000. Không cắt số, đổi PK hoặc tái sử dụng mã quán.
- Mẫu đề xuất `CLUCKY-<maQuan>-<maDonDuyNhat>`; grammar/case/normalization cụ thể ghi contract trước triển khai. Không match `LIKE '%001%'`; parser phải tách đúng token và reject mơ hồ.
- Đối chiếu mã quán, mã đơn và receiving-account snapshot từ nguồn feed tin cậy. Cả ba tương thích mới auto-assign order; chuyển tiền là dữ liệu tài chính, không xác thực danh tính người dùng.
- Mã quán đúng + mã đơn không hợp lệ, nhưng tài khoản nhận phù hợp và không có xung đột: phân loại quán/chưa gán đơn; Staff/Manager quán xem DTO hạn chế. Nếu có mã đơn thực của quán khác hoặc tài khoản không phù hợp: chưa phân loại cho Admin.
- Thiếu/sai mã quán hoặc không đủ căn cứ: giữ unclassified, không đoán theo sender/amount/quán đầu tiên gán account. Với mã cũ, chỉ resolve khi contract cũ và snapshot cho kết quả không mơ hồ.
- Query list/detail/search đều scope server-side store đã phân loại, không chỉ filter UI. Không raw payload/credentials/full chain statement; search nội dung không nới quyền.
- Gán/đối soát thủ công vẫn kiểm tra cùng store, bankTx chưa dùng và payment snapshot; không cho Staff sửa phân loại sang quán khác hoặc chia một bankTx cho hai đơn.

### Contract đề xuất

Bank transaction read DTO: ID ổn định, amount/time, nội dung cần thiết, classification status/storeId, matched order nếu có; không nhận classifiedStoreId từ frontend như dữ kiện tin cậy. Các trạng thái khái niệm: chưa phân loại, đã phân loại quán/chưa gán đơn, đã gán đơn; tên enum cuối cùng ghi API/schema.

## Acceptance Criteria

- AC1: Cùng account gán 001/002, JWT 001 chỉ list/detail/search được giao dịch đã phân loại 001.
- AC2: Chuỗi 001 trong amount hoặc token khác không đủ để phân loại; mã 1000 giữ nguyên.
- AC3: Mã quán đúng/đơn sai không xung đột → hiện quán đúng/chưa gán; mã quán–đơn/tài khoản xung đột → chỉ Admin thấy khoản chưa phân loại.
- AC4: Thiếu mã vẫn lưu giao dịch; không tự match bằng số tiền gần giống hoặc sender.
- AC5: QR/mã cũ đối soát theo snapshot cũ; không rewrite lịch sử để ép mã mới.
- AC6: Đổi query/storeId/bankTxId không lộ khoản khác quán; response không raw payload/secret.

## Testing Decisions

Chưa chạy. Biên chính nhận giao dịch rồi query Gateway theo JWT, kèm bảng parser cho mã hợp lệ/sai/xung đột/legacy/1000. Payment chưa có prior art hoàn chỉnh; ưu tiên kiểm chứng contract observable, không assert regex implementation.

## Out of Scope

CSKH mới, một giao dịch chia nhiều đơn, quyền sao kê toàn chuỗi cho Staff/Manager, thay Store PK.

## Further Notes

Chỉ mở màn Tiền vào B1 sau khi scope list/detail/search đã có thật; chia sẻ account không đồng nghĩa chia sẻ quyền dữ liệu.
