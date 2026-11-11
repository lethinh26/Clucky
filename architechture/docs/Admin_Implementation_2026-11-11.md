# Admin toàn hệ thống — triển khai 11/11/2026

## Trạng thái bàn giao

Đã tích hợp các nhóm chức năng dưới đây bằng API/DB thật và hoàn tất rebuild các service bị ảnh hưởng. Đây chưa phải nghiệm thu production. Không đổi nhãn DONE trong backlog/task, không commit/push, không cập nhật Lark. Các tài liệu bị xóa và các task mới có sẵn ngoài phạm vi được giữ nguyên.

Phạm vi: Admin toàn chuỗi. Không triển khai thêm luồng Quản lý chi nhánh/Nhân viên; giữ mô hình một Manager và tài khoản Staff dùng chung mỗi quán. Các sửa backend dùng chung chỉ nhằm bảo vệ quyền, dữ liệu và đồng bộ sự kiện.

## Các nhóm thay đổi

| Nhóm | Đường tích hợp | Nội dung |
| --- | --- | --- |
| Khách hàng | `/admin/customers`, `/api/users/customers` | Tìm kiếm/phân trang, che thông tin liên hệ, khóa/mở khóa có lý do và trạng thái kỳ vọng, thu hồi phiên, lịch sử đơn thật theo customerId |
| Tài khoản legacy | Identity | Chặn assign-store legacy đi vòng quy trình cấp tài khoản; không mở khóa tài khoản chi nhánh đã bị thay thế; audit bền vững |
| Nhật ký toàn chuỗi | `/admin/audit`, `/api/audit-logs` | Lọc domain/tài khoản/quán/ngày/action/target; phân trang, xuất CSV cùng bộ lọc tối đa 10.000 dòng, chống công thức; giữ sessionId để phân biệt phiên tài khoản Staff dùng chung; loại bỏ credential/ngân hàng |
| Thông báo/email | Chuông Admin, `/admin/email-logs` | Inbox Admin, trạng thái đọc riêng từng Admin, liên kết đơn/kho thật; log gửi email phân trang/lọc, che địa chỉ, mã lỗi/retry/eventId/correlationId; đủ template từ chối/yêu cầu sửa ngân hàng/hoàn tiền; không gửi lại tùy ý |
| Báo cáo | Dashboard/Reports | Không giữ dữ liệu cũ dưới bộ lọc mới; số đơn đang xử lý lấy tổng từ API; xuất theo bộ lọc; chỉ rõ trạng thái ghi nhận doanh thu |
| Phí giao hàng | Shipping | Cập nhật phí và ghi outbox audit trong cùng transaction; publish có retry |
| Voucher | Promotions/Loyalty + Order | Version bắt buộc khi sửa; reserve/consume/release quota và giới hạn theo khách; reserve đúng discount khi checkout; đối soát reservation bằng Order thật, recovery sau rollback/hủy; audit bền vững; ẩn proposal/banner |
| Danh mục/chi nhánh | Catalog/Stores | Category CRUD, sửa món/options/toppings; tạo/sửa combo với số lượng và option đúng món; version chống stale write; ngừng hoạt động quán giữ ID/lịch sử/tài khoản; ảnh giải mã thật, bảo vệ ảnh đang tham chiếu, cleanup retry |
| Kho theo quán | Inventory | Version cho lượng tồn/trạng thái bán; Admin gửi snapshot version khi chỉnh lượng/ngưỡng/hết món, không ghi nhầm quán khi đổi bộ lọc; low-stock outbox và recipient Manager đã xác minh; payload cũ của vai trò chi nhánh vẫn được chấp nhận |
| Đơn/thanh toán/hoàn tiền | Orders/Payments | Phân trang/lọc toàn chuỗi, collection/COD, reconcile, legacy adoption, xem receipt conflict; idempotency key giữ nguyên khi kết quả chưa rõ; hoàn tiền có hold/confirm/release/recovery bền vững; tự tạo yêu cầu hoàn đủ điều kiện sau hủy, không tự chuyển khoản |

UI mới dùng Ant Design và dữ liệu Gateway thật. Không đưa mock modules vào đường thực thi Admin; các component demo cũ không được mở thành chức năng. Bỏ nút tải lại thủ công trên các màn Admin đã tích hợp; giữ thao tác thử lại khi lỗi, đặt lại bộ lọc và retry provisioning đúng mục đích. Danh sách tự cập nhật có chặn response cũ; không ghi đè biểu mẫu tài chính đang thao tác. Không đổi nhánh hoặc commit.

## Hoàn tiền: thao tác và an toàn

- Tạo yêu cầu thủ công qua `POST /api/refund-requests` chỉ dành cho Customer sở hữu đơn; Admin/Manager không được tạo thay. Admin chỉ xem và xử lý yêu cầu hiện có. Cơ chế nội bộ ghi nhận hoàn tiền đủ điều kiện sau hủy được giữ nguyên.
- Chi tiết đơn dùng một drawer; tài chính và hoàn tiền dùng modal có vùng cuộn riêng. Khi modal mở, drawer nền tạm dừng tự đồng bộ và không nhận thao tác đóng bằng phím Escape.
- Admin/Manager chịu điều kiện hủy trước chế biến, receipt live đã nhận và quyền đúng phạm vi; Staff không được tác nghiệp hoàn tiền. Không coi DECLARED/legacy/cash/mixed là khoản bank refund hợp lệ.
- Approve/confirm có thể trả HTTP 202 với `paymentOperation=RESERVE/CONFIRM`; UI không báo đã chi trả. `RELEASE` còn chờ sau từ chối được giữ và retry. REFUNDED chỉ sau Payment xác nhận đúng order/amount/attempt/evidence reference.
- Claim giữ một người xử lý lượt chuyển; upload/confirm và báo lỗi ngân hàng khi đang PROCESSING yêu cầu người đã claim. Không tạo lượt chuyển mới khi có chứng từ hoặc kết quả ngân hàng chưa rõ. UI yêu cầu xác nhận chưa chuyển thành công trước khi báo lỗi ngân hàng.
- Cập nhật ngân hàng chỉ ở PENDING/WAITING_BANK_DETAILS; Admin phải gửi `expectedBankDetailsVersion`. Đổi thông tin khi đang chuyển/đã xác nhận bị chặn. Field API canonical là `bankAccountNo/bankAccountName`; alias cũ vẫn được chấp nhận.
- Chứng từ nhận JPEG/PNG tối đa 5 MiB và 20 triệu điểm ảnh, giải mã/re-encode PNG rồi upload Cloudinary loại authenticated. Server chỉ trả URL truy cập riêng có hạn 600 giây sau kiểm tra quyền, `Cache-Control: no-store`. Không dùng URL public hoặc tin publicId tùy ý từ client.
- Chứng từ do người có quyền cung cấp, không phải xác nhận tự động từ ngân hàng. Ứng dụng không thực hiện lệnh chuyển tiền. Các hold legacy không có intent được đánh dấu để đối chiếu/từ chối/tạo lại, không dựng kết quả thành công.

## Hợp đồng liên dịch vụ

- Voucher: `POST /internal/loyalty/voucher-reservations`, header `X-Loyalty-Service-Token`, body `{orderId,customerId,storeId,code,orderAmount,discountAmount}`; release `POST /internal/loyalty/voucher-reservations/{orderId}/release`. Không cho frontend gọi trực tiếp.
- Liên hệ thông báo: Identity `GET /api/auth/internal/customers/{customerId}/notification-contact`; `X-Contact-Time` epoch giây, `X-Contact-Signature` là hex HMAC-SHA256 của `notification-contact-v1:{customerId}:{timestamp}` với secret backend hiện hữu. Cửa sổ thời gian -120/+30 giây, so sánh constant-time; Gateway chặn internal API. Chỉ trả email đã xác minh của Customer; response `no-store`.
- Event hoàn tiền có `recipient:{userId,role:"CUSTOMER",email,emailVerified:true}` từ Identity đã xác minh. Chưa xác minh được thì lưu WAITING_RECIPIENT và retry, không mất sự kiện; đơn quầy không có Customer không gán email giả. Consumer sở hữu template, không chèn ngân hàng/evidence vào email. Lần hoàn tất mới chỉ phát `refund.processed`, không phát thêm `refund.confirmed` cho cùng lần hoàn.
- Audit dùng `audit.recorded`, có eventId/correlationId/sourceService/actor/action/target/time; consumer dedup eventId. Shipping/Catalog/Promotion/Review được nhận ngoài Identity/Order/Payment.

## Giới hạn chủ động

- Không bật `REPORT_REVENUE_EVENT` để che việc chưa duyệt chính sách. Báo cáo đã lưu không được coi là sổ doanh thu ròng sau hoàn tiền hoặc bằng chứng ngân hàng đã nhận tiền.
- Không mở Party, proposal/banner, phân công/theo dõi shipper Phase 2, chi trả tiền dư hoặc tiền chuyển cho đơn hết hạn.
- Không tạo/promote Admin trong ứng dụng; không thêm thiết lập hệ thống tùy ý ngoài yêu cầu có tài liệu.
- Không tự gửi thử SMTP, upload thử Cloudinary, tạo giao dịch thử hoặc dùng dữ liệu mẫu để chứng minh chức năng.
- SMTP outcome không xác định không tự gửi lại: tránh email trùng; cần đối chiếu nhà cung cấp trước khi can thiệp.
- Không chứng nhận production chỉ từ build/healthy. Chưa chạy acceptance thực tế với Cloudinary/SMTP, concurrency, lỗi mạng, quota lượt cuối hoặc quyền truy cập ảnh. Cần chính sách retention/vận hành chứng từ và đối chiếu ngân hàng trong môi trường triển khai.

## Áp dụng và kiểm chứng

- Cloudinary/SMTP: đã kiểm tra flag bật và sự hiện diện biến cấu hình, không in credential. Đây không phải xác minh kết nối/provider acceptance.
- Đã chạy `./start-docker.ps1 -Services identity-service,notification-service,review-report-service,audit-service,shipping-service`: build thành công, 5 container healthy.
- Sau tích hợp, đã chạy `./start-docker.ps1 -Services identity-service,catalog-store-service,notification-service,audit-service,admin`: build thành công, 5 container healthy, áp dụng signed-contact API và migration Catalog V11–V15.
- Đã chạy `./start-docker.ps1 -Services promotion-loyalty-service,payment-service,cart-order-service,admin`: build thành công, 4 container healthy. Order V10–V13, Payment V12–V13 và Promotion V7 không chặn khởi động. Identity đã được cập nhật trước Order.
- Đã chạy `./start-docker.ps1 -Services admin` lần cuối: build thành công, container healthy, gồm trạng thái nút chứng từ và đóng modal kho. Không reset/xóa volume, không sửa migration đã áp dụng, không rebuild lại toàn stack.
- Docker build có cảnh báo bundle UI lớn hơn 500 kB và unchecked operations từ Cloudinary SDK; build không thất bại. Chưa đo hiệu năng tải trang hoặc kiểm chứng provider; không coi các cảnh báo là đã được giải quyết.
- Có bổ sung mã kiểm tra hồi quy; chưa chạy test, lint/typecheck riêng hoặc browser theo yêu cầu. Docker build/healthcheck không thay thế nghiệm thu chức năng/concurrency/failure.

## Nghiệm thu do người dùng thực hiện

Đối chiếu Admin toàn chuỗi với Manager/Staff hai quán và Customer owner; danh sách nhiều trang/bộ lọc; ghi DB rồi đọc lại; đồng thời/retry/timeouts; ảnh thật và URL hết hạn; quota lượt cuối; email/refund đúng người; audit event đến đủ; export đúng bộ lọc; responsive/keyboard/error/loading. Không đánh dấu DONE chỉ vì container healthy.
