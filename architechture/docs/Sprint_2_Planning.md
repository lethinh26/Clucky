# CLUCKY — SPRINT 2 PLANNING

## 1. Thông tin chung

| Nội dung | Kế hoạch |
|---|---|
| Ngày biên soạn | 04/11/2026 |
| Khung Sprint 2 | 02–08/11/2026, giữ để truy vết |
| Hạn hoàn thành | **23:59 ngày 05/11/2026 (UTC+7)** |
| Phạm vi | 94 task Sprint 2 |
| Trạng thái tài liệu | Tổng hợp kế hoạch hiện có; checklist planning và DoD là đề xuất để nhóm xác nhận |

## 2. Sprint Goal

> Kết nối hai frontend với backend qua Gateway để bàn giao luồng đặt món MVP có dữ liệu thật: xác thực → chọn món theo cửa hàng → giỏ hàng/checkout → COD hoặc chuyển khoản SePay → xử lý đơn và thông báo; bảo đảm quản trị đúng quyền, đúng cửa hàng và có bằng chứng nghiệm thu cho Sprint Review.

Đầu ra cần hướng tới: Customer đặt món/thanh toán/xem đơn; Staff/Manager/Admin xử lý nghiệp vụ đúng RBAC; Kafka nối các miền với idempotency; nhóm có collection, demo và evidence theo AC. Không dùng UI fixture thay kết quả tích hợp thật.

## 3. Cơ sở và Sprint Backlog

- [Backlog tổng hợp](backlog.md): lịch, phân công, SP, giờ công và phạm vi đã ghi nhận.
- [Danh sách Sprint 2](../tasks/README.md#sprint-2): toàn bộ 94 task; mở từng detail để đọc contract, dependency và AC.
- [SRS](SRS.md), [Đặc tả API](Đặc%20tả%20API.md), [Ma trận phân quyền](Ma%20trận%20phân%20quyền.md): yêu cầu và quyền nghiệp vụ.
- [Kiến trúc hệ thống](Kiến%20trúc%20hệ%20thống.md), [Thiết kế CSDL](Thiết%20kế%20cơ%20sở%20dữ%20liệu.md), [Brand Guidelines](Brand_Guidelines.md): ràng buộc kỹ thuật và UI.

### Phạm vi theo nhóm đầu ra

Các ID dưới đây là tham chiếu tiêu biểu, không thay toàn bộ danh sách 94 task hoặc tạo task mới.

| Nhóm | Đầu ra | Task tiêu biểu |
|---|---|---|
| Identity/RBAC | OTP/auth/profile/address, nhân sự, Gateway và quyền theo store | BE-16/17/18/19; INT-05/53/61/67/69 |
| Catalog/media | CRUD store/menu, availability/inventory/cache; ảnh product/combo qua Cloudinary | BE-21/22/54/70/71/72/74; INT-06/15/54/72/73 |
| Cart/Order | Preview, checkout, tạo/hủy/từ chối đơn, refund-request, history/reorder/polling | BE-24/25/26/27; INT-07/08/14/39/68 |
| Payment/refund | VietQR, SePay signature/matching/idempotency, COD/manual, mismatch/expiry/refund | BE-29/30/32/44/45/46/49; INT-09/40/49/50/51/52/63/64 |
| Shipping MVP | Phí giao hàng, shipment CREATED và thông tin shipment | BE-33/48; INT-43/65; TEST-12 |
| Promotion/Loyalty | Voucher thường ALL/STORE, validate/apply, điểm/hạng/earn/redeem | BE-34/37; INT-10/44/62 |
| Notification/email | Read-state, SMTP/template/log/retry/idempotency; email lỗi không rollback nghiệp vụ | BE-38/39/58/60/61/62/63/64/65/66/67; INT-11/60 |
| Review/Report/Audit | Review đúng quyền, report/export dữ liệu thật, Audit Service và producer/consumer | BE-40/41/42/43; INT-12/13/45/48 |
| Google/security | Firebase ID token, complete-password/JWT, bảo mật media response/log | BE-75/76; INT-74 |
| Nghiệm thu/bàn giao | Kafka DLQ/retry/compensation, regression, collection và demo | INT-46/47; TEST trong sprint; DEP-09/10 |


## 4. Phân công và capacity

Giữ một PIC mỗi task. Trọng tâm dưới đây không chuyển quyền sở hữu task liên miền.

| PIC | Trọng tâm | SP S2 |
|---|---|---:|
| Trần Nguyễn Hữu Khánh | Identity, auth/Gateway, RBAC, demo materials | 69 |
| Nguyễn Duy Quang Nhật | Catalog/store/inventory, Cloudinary/UI media, nghiệm thu tương ứng | 80 | 
| Trần Đức Anh | Cart/Order, checkout, trạng thái đơn, order events và COD E2E | 73 | 
| Lê Phú Thịnh | Payment/refund/shipping, Google login, bảo mật media | 132 | 
| Cao Tất Thành | Promotion/Loyalty, Notification, SMTP/template/retry, email E2E | 81 | 
| Mai Sơn Việt | Review/Report/Audit, email-log API/DLQ, Kafka và API collection | 87 | 
| **Tổng** | | **522** | 

## 5. Lịch và dependency

| Mốc kế hoạch | Đầu ra cần có |
|---|---|
| 02/11 | Contract/API nền, SMTP/OTP, giá/phí/voucher, media contract; fixture chỉ phục vụ chuẩn bị |
| 03/11 | Checkout/payment/auth, producer chính, catalog/media/Google theo deadline task; bàn giao từng phần |
| 04/11 | Chốt tích hợp checkout/SePay/COD/refund/email/report/media/Google/RBAC; chuẩn bị collection và demo |
| 05/11 | Regression, sửa lỗi/retest, evidence, collection/script/screenshots/slides; hoàn tất trước 23:59 UTC+7 |
| 06/11 | Review kết quả có evidence và phần chưa đạt; không triển khai bù |
| 07–08/11 | Chỉ giữ khung lịch để truy vết; không xếp triển khai/nghiệm thu |

| Luồng | Chuỗi bàn giao trọng yếu | Điều kiện |
|---|---|---|
| Auth/email | BE-58 → BE-60; BE-61 → BE-64 → BE-16/17 → INT-53/69 → INT-05 → TEST-01 | SMTP/template/token thật trước nghiệm thu |
| Checkout/refund | BE-24 → BE-25 → BE-26 → BE-46 → INT-52 → INT-64 | Order/Payment/Notification bàn giao theo thứ tự |
| Payment/email event | BE-30/32 → INT-40; INT-39/40 → BE-39 | Signature/idempotency và email lỗi có evidence |
| Report | INT-39/40 → INT-45 → BE-42 → INT-13 → TEST-05 | Có event/dữ liệu tổng hợp thật |
| Media | BE-71 → BE-70 → BE-72 → INT-73; BE-74 xử lý lỗi/cleanup | Credential, quyền, MIME/size và persistence sẵn sàng |
| Audit | BE-43 → INT-48 | API đọc không thay bằng chứng producer/consumer |
| Demo | TEST-01/05/06/07 → DEP-10 | Chốt kết quả/screenshot sau evidence |

Đây là tóm tắt, không thay dependency đầy đủ trong task. Cùng deadline không có nghĩa hết chặn; PIC thống nhất mốc bàn giao trong ngày. Giờ cụ thể chưa được ấn định.

## 7. Điều kiện nhận việc và Definition of Done

### Điều kiện sẵn sàng 

- [ ] PIC hiểu phạm vi, contract, AC, dependency và điểm cần chốt.
- [ ] Có prerequisite hoặc chỉ rõ phần chuẩn bị được/phần đang bị chặn.
- [ ] Quyết định sản phẩm/bảo mật được xác nhận trước nghiệm thu.
- [ ] Có cấu hình/dữ liệu kiểm chứng an toàn; không đưa secret vào repository.
- [ ] PIC cung cấp remaining/capacity và thống nhất mốc handoff.

### Definition of Done

- [ ] Đạt AC trong detail: happy path, validation, lỗi, quyền/trùng/retry thuộc phạm vi.
- [ ] Frontend gọi Gateway; service dùng Config Server/Eureka, schema riêng, không join/FK xuyên service.
- [ ] Backend thực thi ownership/storeId, DTO/error shape theo contract; không lộ secret/exception thô.
- [ ] Đổi schema dùng Flyway migration mới, không sửa migration đã áp dụng/reset dữ liệu để né lỗi.
- [ ] Payment/event có evidence signature/idempotency/correlation/event ID; không dùng correlation ID thay event ID chống trùng.
- [ ] UI đúng brand, responsive/accessibility, loading/empty/error; phân biệt demo/mock với tích hợp thật.
- [ ] PIC tự kiểm chứng, gắn phiên bản mã/môi trường/kết quả từng AC/evidence đã lọc thông tin nhạy cảm và lỗi còn lại.
- [ ] Handoff cho PIC phụ thuộc, cập nhật Lark đúng tiến độ; không đánh DONE chỉ vì có code/template/tài liệu.

Checklist không xác nhận task nào đã đạt. Người dùng/nhóm tự kiểm thử; tạo tài liệu không đồng nghĩa đã kiểm chứng ứng dụng.

## 8. Nghiệm thu và Sprint Review

| Kịch bản nhóm cần kiểm chứng | Task/evidence chính |
|---|---|
| Guest → register/OTP → browse → cart → COD; trạng thái/thu COD đúng quyền | TEST-01, INT-05/06/07/51; response Gateway và dữ liệu thật |
| QR PENDING, webhook hợp lệ/trùng/sai chữ ký/sai số tiền, expiry | INT-09/49/50/64; Payment/Order và chống xử lý lặp; hiện QR không phải đã nhận tiền |
| Hủy/từ chối/refund và thông báo | INT-08/14/52; state machine và email |
| Admin quản trị store/product/voucher; Staff A không xem quán B; Manager đúng quyền | TEST-05/06/07; phản hồi backend, không chỉ ảnh UI |
| Phí pickup/free threshold/store override, shipment MVP | TEST-12; CREATED, không tracking Phase 2 |
| Kafka replay/retry/DLQ; email lỗi không rollback; secret masking | TEST-16/22/23/24; event/log đã lọc secret và dữ liệu nghiệp vụ |
| Upload hợp lệ, URL/public_id, từ chối MIME/size sai; responsive | TEST-17/25/26; bằng chứng upload/read/update/validation |
| Google login, review/report/audit | INT-74, INT-12/13/48; quyền, dữ liệu thật và event quản trị |
