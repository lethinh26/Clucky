# Báo cáo rà soát phân quyền Clucky — 08/11/2026

## 1. Phạm vi và mức xác minh

- Rà soát tĩnh source hiện tại: React admin, Gateway, Identity, Catalog/Store, Order/Refund/Party, Payment, Promotion/Loyalty, Review/Report và Audit.
- Đối chiếu SRS, ma trận RBAC, đặc tả API, kiến trúc, backlog, snapshot Sprint 3 ngày 08/11 và chi tiết các task liên quan.
- Không thay đổi mã ứng dụng, cấu hình, database, tài khoản hoặc quyền. Không chạy test/lint/typecheck, request kiểm thử, trình duyệt hay rebuild Docker. Chỉ thêm báo cáo này.
- Phát hiện dưới đây có bằng chứng trong mã; chưa phải kết quả tái hiện trên phiên đăng nhập đang chạy. Chưa có URL/request cụ thể của từng lần người dùng gặp lỗi nên không khẳng định tất cả lỗi truy cập đều có cùng nguyên nhân.
- Không đọc tiến độ Lark trực tiếp. Trạng thái task được dẫn là snapshot repository, không phải xác nhận nghiệm thu. GitNexus index ghi ngày 01/11; dùng source trực tiếp thay vì dựa vào đồ thị cũ.

## 2. Kết luận chính

Phân quyền hiện không hỏng đồng loạt ở một chỗ. Có bốn nhóm vấn đề:

1. **Quyền vượt mức ở backend:** voucher tin header thay vì JWT; một số nghiệp vụ Order/Party thiếu kiểm tra vai trò hoặc điều kiện thao tác.
2. **Người có quyền nhưng frontend gọi sai API:** Manager sửa giờ/quán qua endpoint chỉ dành cho Admin; thu COD gọi đổi trạng thái đơn.
3. **Điều hướng gây 403:** thông báo chung đưa Staff tới trang thanh toán/khuyến mãi bị chặn; một đường dẫn đơn hàng chỉ nhận Staff.
4. **Nghiệp vụ chưa nối thật:** Users, Payments, Reviews, Reports, Dashboard vẫn có mock hoặc thiếu endpoint. Không được sửa nhóm này bằng cách mở quyền bừa bãi.

P1 trong báo cáo là cần xử lý trước nghiệm thu nghiệp vụ liên quan; P2 là lỗi giao diện/phạm vi hoặc thiếu tích hợp cần giải quyết. Không gọi một chức năng backlog là đã phát hành hoàn chỉnh chỉ vì có màn hình.

## 3. Chuẩn hóa ba vai trò

Thuật ngữ dùng thống nhất:

- **STAFF — Nhân viên chi nhánh:** vận hành ca, chỉ chi nhánh được gán.
- **STORE_MANAGER — Quản lý/trưởng chi nhánh:** cách gọi “chủ chi nhánh” của người dùng tương ứng role này; hệ thống chưa định nghĩa một actor chủ sở hữu/franchise riêng.
- **ADMIN — Quản trị viên/chủ hệ thống:** quản lý toàn chuỗi.

Manager kế thừa nghiệp vụ Staff trong quán; Admin kế thừa nghiệp vụ Manager trên mọi quán. Đây là kế thừa **quyền nghiệp vụ**, không nhất thiết phải hiển thị mọi màn hình chuyên dụng giống nhau. Cả ba vẫn bị ràng buộc bởi trạng thái đơn, tính hợp lệ thanh toán và audit; Admin không có quyền bỏ qua mọi quy tắc dữ liệu.

| Nghiệp vụ | STAFF | STORE_MANAGER | ADMIN |
|---|---|---|---|
| Hồ sơ cá nhân | Hồ sơ mình | Hồ sơ mình | Hồ sơ mình; quản lý tài khoản theo quyền riêng |
| Lịch ca | Xem ca mình | Xếp ca Staff của quán, duyệt bàn giao | Quản lý theo quyền kế thừa; cần làm rõ contract schedules |
| Dashboard | Đơn hôm nay, đơn chờ, tổng kết ca/quán | Doanh thu, hiệu suất quán | Toàn chuỗi hoặc từng quán |
| Xem/xử lý đơn | Quán mình | Quán mình | Mọi quán |
| Hủy/từ chối đơn | Quán mình, lý do bắt buộc, đúng trạng thái | Quán mình, đúng điều kiện | Mọi quán, đúng điều kiện |
| Đơn đã trả tiền bị hủy | Tạo/chuyển yêu cầu hoàn, không duyệt | Tạo và duyệt/từ chối trong quán | Tạo và duyệt/từ chối toàn hệ thống |
| Xác nhận đã thu COD | Quán mình | Quán mình | Mọi quán |
| Chuyển khoản | Xem mã trong đơn, báo sai lệch | Đối chiếu và xác nhận thủ công quán mình, có lý do/audit | Đối chiếu/xác nhận toàn hệ thống |
| Bật/tắt còn/hết món | Trong ca tại quán | Quán mình, có quản lý dài hạn theo SRS | Mọi quán |
| Kho | Cập nhật số lượng, xem cảnh báo | Nhập/kiểm kê/duyệt, quản lý ngưỡng quán | Toàn hệ thống |
| Giá, món, danh mục, combo, topping gốc | Không | Không sửa trực tiếp; chỉ đề xuất | CRUD |
| Vận hành chi nhánh | Không | Giờ, tạm đóng/mở, liên hệ, khu vực giao quán mình | Mọi quán |
| Tạo/xóa chi nhánh, gán Manager | Không | Không | Có |
| Tài khoản Staff | Không | Tạo/khóa/mở Staff quán mình | Toàn hệ thống |
| Tài khoản Manager/Admin/Customer, chuyển quán | Không | Không | Có theo nghiệp vụ được đặc tả |
| Dữ liệu khách | Chỉ thông tin cần thiết trong đơn quán | Chỉ phạm vi đơn quán | Quản lý khách toàn hệ thống |
| Trả lời đánh giá | Quán mình | Quán mình | Mọi quán |
| Ẩn/xóa đánh giá vi phạm | Không | Chỉ ẩn trong quán | Ẩn và xóa toàn hệ thống |
| Báo cáo doanh thu, Excel/PDF | Không | Quán mình | Toàn chuỗi/từng quán |
| Voucher/khuyến mãi/banner | Không CRUD | Chỉ đề xuất của quán, Admin duyệt mới có hiệu lực | CRUD và phê duyệt |
| Tích điểm, hạng thành viên | Không cấu hình | Không cấu hình | Cấu hình |
| Ngân hàng nhận tiền, phí ship, cấu hình hệ thống | Không | Không | Có |
| Audit log | Không | Chỉ thao tác của Staff thuộc quán mình | Toàn hệ thống |
| Đơn tiệc | Tiếp nhận, liên hệ, chuyển Manager | Báo giá/xác nhận/phân công quán | Toàn hệ thống |
| Gán shipper/tracking | Không trong MVP | Phase 2, quán mình | Phase 2, toàn hệ thống |
| Checkout/voucher/đổi điểm với tư cách khách | Không | Không | Không; dùng tài khoản Customer riêng |

**Ranh giới MVP:** shipment chỉ tạo bản ghi CREATED. Đề xuất voucher BE-35 và xử lý đơn tiệc BE-28 còn nằm trong backlog chưa xếp lịch ở bảng hiện tại; đó là quyền mục tiêu, không phải yêu cầu tự triển khai ngay toàn bộ. Không tự thêm chức năng nhân sự/lương/POS hay actor mới.

## 4. Lỗi và khoảng trống có bằng chứng

### F01 — P1: API voucher không kiểm tra quyền từ JWT

- `backend/promotion-loyalty-service/src/main/java/com/clucky/promotionloyaltyservice/controller/VoucherController.java:52`: list nhận `X-User-Role`, `X-Store-Id`; create/update/delete cũng nhận các header tự khai, không có role guard tại controller.
- `backend/promotion-loyalty-service/src/main/java/com/clucky/promotionloyaltyservice/service/VoucherService.java:169`: chỉ hạn chế khi chuỗi actorRole bằng STORE_MANAGER; role thiếu hoặc role khác đi tiếp. Get-by-id không kiểm tra scope.
- `backend/promotion-loyalty-service/src/main/java/com/clucky/promotionloyaltyservice/config/SecurityConfig.java:85`: các request còn lại chỉ yêu cầu đăng nhập.
- `backend/api-gateway/src/main/java/com/clucky/apigateway/config/CorrelationIdFilter.java:41`: xóa X-User-Id/X-Role/X-Store-Id, không xóa X-User-Role và không cấp lại actor cho controller. Frontend API hiện không gửi role/store headers đó.
- **Hệ quả theo đường mã:** tài khoản đăng nhập không bị loại theo role khỏi CRUD voucher; Manager không gửi header có thể đi nhánh không hạn chế scope. Nếu gửi đúng header Manager, store header lại bị Gateway xóa. Actor tạo voucher có thể null.
- **Hướng sửa:** actor chỉ lấy từ security context/JWT; chặn từng action và store ở backend. Chưa triển khai proposal thì không cấp quyền CRUD trực tiếp cho Manager. Update cũng phải giữ quy trình phê duyệt, không cho đổi PENDING_APPROVAL sang ACTIVE để tự duyệt.

### F02 — P1: Manager sửa thông tin quán bằng API chỉ dành cho Admin

- `frontend/react/src/pages/Stores/index.tsx:280`: Manager vẫn thấy nút sửa; `:140` luôn gọi `storesApi.update`.
- `frontend/react/src/lib/api.ts:452` gọi PUT `/api/stores/{id}`; `backend/catalog-store-service/src/main/java/com/clucky/catalogstoreservice/controller/StoreController.java:44` chỉ cho ADMIN.
- API vận hành đúng cho Manager đã có tại `StoreController.java:65`, PUT `/{id}/operation`, kiểm tra đúng store.
- **Hệ quả:** Manager được vào trang và mở form nhưng lưu giờ/thông tin vận hành bị từ chối quyền theo mã hiện tại.
- **Hướng sửa:** tách field/action Admin và Manager; Manager dùng operation. Không mở toàn bộ PUT store cho Manager. `StoreDto.OperationRequest` hiện chỉ có giờ/trạng thái, còn thiếu phone/deliveryArea theo FR-MGR-06; cần hoàn thiện contract giới hạn field.

### F03 — P1: Thu COD gọi nhầm hoàn thành đơn, không xác nhận Payment

- `frontend/react/src/context/OrderContext.tsx:265`: action COD gọi `ordersApi.updateStatus(id, "COMPLETED", "COD confirmed")`.
- `frontend/react/src/lib/order-demo.ts:68`: frontend chỉ đổi paymentStatus thành PAID; không đồng bộ đúng trạng thái đơn đã gửi backend.
- `backend/cart-order-service/src/main/java/com/clucky/cartorderservice/service/OrderService.java:435`: CONFIRMED/PREPARING không được nhảy COMPLETED nên thao tác thu tiền ở các trạng thái này thất bại; READY có thể bị hoàn thành sớm.
- API đã đặc tả là PUT `/api/payments/{id}/confirm-cod`; Payment hiện chỉ có controller template, không có HTTP controller nghiệp vụ.
- **Hướng sửa:** tách thu COD và hoàn thành đơn; trạng thái tiền thuộc Payment. Không coi đổi status Order là bằng chứng đã thu tiền.

### F04 — P1: Backend đổi trạng thái đơn thiếu điều kiện tiền/lý do

- `OrderService.java:435` cho người có quyền quán chuyển PENDING_PAYMENT → CONFIRMED mà không kiểm tra Payment; READY → COMPLETED cũng không kiểm tra đã thu/đã trả tiền trong hàm này.
- `frontend/react/src/lib/api.ts:259` gửi `{ status, reason }`, nhưng `backend/cart-order-service/src/main/java/com/clucky/cartorderservice/dto/UpdateOrderStatusRequest.java:5` nhận `note`; lý do nhập từ UI không vào field lịch sử mà hàm sử dụng.
- `OrderService.java:460` thay note thiếu bằng thông điệp mặc định; `rejectOrder` tại `:376` cũng cho thiếu lý do, trái yêu cầu hủy của Staff.
- **Hướng sửa:** kiểm tra điều kiện trạng thái/payment tại backend; thống nhất note/reason; bắt buộc lý do cho hủy/từ chối. Việc UI đang chặn một số bước không bảo vệ API trực tiếp.

### F05 — P1: Quyền Staff tạo yêu cầu hoàn tiền chưa được triển khai đúng

- RBAC cho Staff tạo/chuyển yêu cầu hoàn hộ, không duyệt.
- `backend/cart-order-service/src/main/java/com/clucky/cartorderservice/service/RefundRequestService.java:53` chỉ `requireOwner(customerId)` khi tạo; Staff/Manager/Admin xử lý đơn khách không phải owner.
- `frontend/react/src/lib/order-demo.ts:56` đặt refund PENDING cục bộ khi hủy đơn đã trả tiền; `OrderContext.tsx:263` chỉ gửi đổi trạng thái Order, không tạo refund. Trong source rà soát không thấy consumer Payment tạo refund bù cho đường này.
- **Hệ quả:** UI có thể hiện cần hoàn nhưng không có refundRequestId bền vững để duyệt; nhân sự gọi API tạo hộ bị chặn ownership.
- **Hướng sửa:** tách quyền Customer-owner với quyền nhân sự-store; tạo yêu cầu bền vững, chống trùng và xác minh khoản tiền. Giữ nguyên chỉ Manager/Admin được approve/reject và không coi APPROVED là đã chuyển tiền hoàn thực tế.

### F06 — P1: Users chưa có API thật, Manager dùng contract toàn hệ thống

- `backend/identity-service/src/main/java/com/clucky/identityservice/controller/UserControllerTemplate.java:7` không phải RestController, không map `/api/users`, lock/unlock/assign-store; chưa thấy implementation HTTP khác cho các đường này.
- `frontend/react/src/pages/Users/index.tsx:75` mọi role gọi `usersApi.list(undefined)`; đặc tả chỉ cấp GET `/api/users` toàn hệ thống cho Admin. BE-19 còn yêu cầu chốt route list Staff của Manager.
- UI catch lỗi rồi nạp fixture tại `:82`; filter danh sách không ép role=STAFF/store của Manager. Các hàm lock/assign có nhánh sửa state khi API không khả dụng, không phải thay đổi tài khoản thật.
- **Hệ quả:** thiếu endpoint có thể bị hiểu nhầm là thiếu quyền; thấy/sửa dữ liệu mẫu không chứng minh backend đã cấp quyền hay lưu dữ liệu.
- **Hướng sửa:** triển khai BE-19; contract list scoped rõ ràng cho Manager, kiểm tra target role/store ở backend. Không mở danh sách toàn hệ thống cho Manager chỉ để màn hình hết lỗi.

### F07 — P1: Trang voucher nuốt lỗi lưu/xóa rồi báo thành công

- `frontend/react/src/pages/Promotions/PromotionsPage.tsx:92` trả fixture khi API lỗi hoặc trả danh sách rỗng.
- `:214` catch lỗi create/update rồi vẫn sửa state/báo thành công; `:329` có fallback xóa cục bộ. Nút thao tác voucher không được tách đúng quyền proposal-only của Manager.
- **Hệ quả:** 403, lỗi mạng hoặc lỗi validation có thể bị che; danh sách rỗng biến thành voucher mẫu; người dùng tưởng thao tác hợp lệ và đã lưu.
- **Hướng sửa:** bỏ fallback thành công khỏi đường nghiệp vụ thật; rollback và giữ lỗi rõ. Quyền thao tác phải khớp F01 và backlog BE-35.

### F08 — P2: Reviews còn mock và Staff không bị lọc theo quán

- `frontend/react/src/pages/Reviews/index.tsx:174` dùng initialReviews; reply/hide chỉ sửa state.
- `:250` comment nói Manager/Staff nhưng điều kiện chỉ lọc STORE_MANAGER; Staff nhìn và trả lời fixture của nhiều quán. Manager thiếu storeId cũng không bị fail-closed tại bộ lọc này.
- Backend reply/hide hiện dùng JWT và xác minh store qua Order; không vì lỗi mock frontend mà kết luận API này đang rò dữ liệu thật.
- **Hướng sửa:** nối API danh sách quản trị scoped và mutation thật; cả Staff/Manager đều scope quán; giữ guard backend. Chưa có route list quản trị đầy đủ trong ReviewController đang đọc.

### F09 — P2: Dashboard chưa tách nghiệp vụ ba vai trò

- `frontend/react/src/pages/Dashboard/index.tsx:383` hiển thị chọn mọi chi nhánh và tạo khuyến mãi không phân role.
- `:414` và `:425` dùng KPI cố định 128 đơn/18,65 triệu, không gọi Report API. Bảng đơn lấy OrderContext đã có scope nên không suy ra KPI là dữ liệu thật bị lộ.
- Backend `/api/reports/dashboard` đã phân STAFF STORE_DAY, Manager quán, Admin toàn chuỗi; UI chưa dùng.
- **Hướng sửa:** Staff chỉ tổng kết vận hành ca; Manager dashboard quán; Admin toàn chuỗi. Không hiển thị quyền tạo khuyến mãi toàn chuỗi cho Staff/Manager.

### F10 — P2: Reports chỉ xuất thông báo, không xuất file thật

- `frontend/react/src/pages/Reports/index.tsx:218` lọc mockRevenueData; `:248` lập tên file rồi hẹn message.success, không gọi API/download file.
- Bộ lọc Manager phụ thuộc `user.storeId` có giá trị; không phải backend scope. ReportController/ReportService đã có role/store guard cho revenue/export.
- **Hướng sửa:** nối API báo cáo/export có thật; không hiển thị mock là doanh thu kinh doanh. Giữ Staff bị chặn báo cáo doanh thu.

### F11 — P1: Payments là demo, thiếu backend quản trị thanh toán

- `frontend/react/src/pages/Payments/PaymentsPage.tsx:76` khởi tạo từ MOCK_PAYMENTS; `:123` xác nhận thủ công đổi local state, audit cũng chỉ là array local.
- `backend/payment-service/src/main/java/com/clucky/paymentservice/controller/PaymentControllerTemplate.java:7` chưa khai báo controller/endpoint.
- **Hướng sửa:** hoàn thiện BE-32; Manager chỉ đối soát quán, Admin cấu hình ngân hàng/toàn hệ thống. Staff chỉ COD/báo sai lệch từ đơn hoặc màn hình tác nghiệp riêng, không được mở toàn bộ Payments quản trị.

### F12 — P2: Thông báo dẫn Staff vào trang chắc chắn bị route guard chặn

- `frontend/react/src/components/ui/AdminNotificationCenter.tsx:32` mọi nhân sự dùng chung fixture; không lọc người nhận/role/store.
- `:117` điều hướng PAYMENT tới `/admin/payments`, `:121` PROMOTION tới `/admin/promotions`, trong khi App chỉ cho Admin/Manager vào hai trang đó.
- **Hệ quả theo route:** Staff nhấp thông báo loại này đi vào 403, dù sidebar đã ẩn menu. Đây là nguồn lỗi truy cập cụ thể, không phải lý do mở hai trang cho Staff.
- **Hướng sửa:** thông báo đúng recipient/scope/action; dẫn tới đơn được phép hoặc hiện thông tin phù hợp, không tạo link bị cấm.

### F13 — P1: API checkout thiếu role CUSTOMER

- `backend/cart-order-service/src/main/java/com/clucky/cartorderservice/controller/OrderController.java:35` POST order không có guard role; SecurityConfig chỉ authenticated.
- `OrderService.java:174` lấy actor.userId làm customerId, cho fallback request.items; không kiểm tra actor.role là CUSTOMER trong luồng tạo đơn.
- CartController có chặn tài khoản nội bộ, nhưng POST order không bắt buộc đi qua CartController nên guard đó không đủ.
- **Hướng sửa:** CUSTOMER-only ở boundary tạo đơn. Admin/Manager/Staff không kế thừa nghiệp vụ mua hàng của Customer. Chưa xác nhận request trái role đã tạo đơn thành công trong runtime; lỗi thiếu kiểm tra role có bằng chứng mã nguồn.

### F14 — P1 trước khi mở nghiệp vụ tiệc: Staff được chuyển trạng thái vượt quyền tiếp nhận

- `backend/cart-order-service/src/main/java/com/clucky/cartorderservice/service/PartyOrderService.java:116` chỉ requireStore rồi cho CONTACTED → QUOTED → CONFIRMED; không phân biệt Staff với Manager/Admin.
- RBAC/SRS chỉ cho Staff tiếp nhận/liên hệ/chuyển Manager, không báo giá hoặc xác nhận tiệc.
- **Hướng sửa:** kiểm tra role theo action/transition, không chỉ theo quán. BE-28 đang backlog; đây là điều kiện cần giải quyết trước nghiệm thu, không khẳng định luồng tiệc đã hoàn thiện.

## 5. Những trang/khả năng còn thiếu hoặc có contract chưa thống nhất

| Hạng mục | Bằng chứng / hiện trạng | Phân loại |
|---|---|---|
| `/admin/staff/orders` | `frontend/react/src/App.tsx:198` chỉ cho STAFF. `/admin/orders` đã cho cả ba và tự chọn UI cho Staff tại `:27` | URL chuyên dụng có thể chủ ý; Manager/Admin vẫn xử lý đơn ở route chung. Nên chuyển link chia sẻ về `/admin/orders`, không coi đây là mất mọi quyền xử lý đơn |
| Lịch ca/duyệt bàn giao, tạo Staff | App chưa có route lịch; Users chưa có luồng tạo Staff hoàn chỉnh; BE-19 ghi cần chốt contract | Chưa triển khai đủ, không chữa bằng allowedRoles |
| Audit log | Backend GET `/api/audit-logs` có Admin/Manager và scope Staff-quán; App chưa có trang audit | Thiếu UI/tích hợp, không phải backend cấm Admin |
| Audit mutation toàn hệ thống | API docs nói rõ review outbox chưa có dispatcher; nhiều domain chưa thấy phát audit ngoài khai báo topic | Có log kỹ thuật/history không đồng nghĩa có audit bền vững; cần KAFKA-10 |
| Admin xóa đánh giá vi phạm | RBAC/SRS cho phép; `ReviewController.java:101` DELETE hiện chỉ CUSTOMER xóa của mình | API contract chưa bao phủ moderation delete của Admin; không mở rộng endpoint ownership một cách tùy tiện |
| Contact/khu vực giao của Manager | FR-MGR-06 cho phép; OperationRequest chỉ giờ/trạng thái | Thiếu field/action contract giới hạn |
| Banner/proposal voucher | Có section backlog; BE-35/36 và UI-28 còn phần chưa hoàn thiện | Không quảng bá là nghiệp vụ đang hoạt động |
| Cấu hình hệ thống/phí ship | Vai trò Admin trong SRS; chưa có trang cấu hình hệ thống đầy đủ trong App | Kiểm kê theo BE liên quan, không tự cấp Manager |
| Kho nâng cao | Số lượng/ngưỡng/availability có API; nhập/kiểm kê/duyệt/giới hạn trong ca chưa được chứng minh đầy đủ bằng các endpoint này | Không coi inventory CRUD đơn giản là hoàn tất FR-MGR-05 |

## 6. Những chỗ đang phân quyền đúng — nên giữ

- Sidebar và phần lớn route chính có allowlist. Staff không được vào catalog/users/reports/promotions là đúng; Manager không được sửa dữ liệu menu/giá gốc cũng đúng.
- StoreInventoryController dùng requireStore; Staff không đổi lowStockThreshold, không thay giá. Frontend inventory cũng không gửi threshold khi Staff.
- StoreController giữ CRUD chi nhánh cho Admin; operation/location của Manager có store guard.
- Refund approve/reject kiểm tra Manager/Admin và store của đơn. Không mở quyền duyệt hoàn cho Staff để chữa lỗi tạo yêu cầu hoàn.
- ReportController chặn Staff ở revenue/export; ReportService ép scope và từ chối quán khác.
- Review reply/hide dùng CurrentActor và kiểm tra quán; Staff không được hide.
- Loyalty config chỉ Admin; /me chỉ Customer.
- Audit query của Manager ép actorRole=STAFF và store mình, đúng ma trận.
- Gateway kiểm tra JWT STAFF/STORE_MANAGER phải có storeId hợp lệ. Thiếu storeId có thể gây từ chối xác thực, không nên mặc định là role sai. Chưa kiểm tra dữ liệu tài khoản đang gặp lỗi.

## 7. Điều chỉnh tài liệu/contract cần chốt

1. **List Staff của Manager:** giữ GET users toàn hệ thống cho Admin. Chốt API scoped riêng hoặc quy ước query rõ ràng và backend luôn ép scope; BE-19 đã ghi đây là quyết định cần làm.
2. **Kế thừa quyền schedules:** SRS nói Admin kế thừa Manager nhưng bảng API GET/POST schedules chỉ ghi MGR/STF; phải tách GET tự xem và POST quản lý, xác định Admin trước khi triển khai.
3. **Moderation delete:** SRS/RBAC cho Admin xóa vi phạm, API hiện mới có Customer-owner delete. Cần contract và audit tương ứng.
4. **Proposal voucher:** quyền mục tiêu Manager là đề xuất, không phát hành voucher. Giữ BE-35 backlog nếu chưa làm; không cho CRUD trực tiếp thay thế proposal.
5. **Thu tiền và hoàn tiền:** PAID/COLLECTED của Payment, COMPLETED của Order, APPROVED của Refund là các ý nghĩa khác nhau. Chuẩn hóa mapping, không gộp thành một nút đổi status.
6. **MVP/Phase 2:** Order backend đang có transition SHIPPING; phải phân biệt với nghiệp vụ giao hàng thực tế chưa mở. Không dùng state tồn tại để suy ra quyền gán/tracking shipper đã có.
7. **Snapshot kiến trúc:** kiến trúc còn câu Audit chưa có runtime module, trong khi source/Gateway đã có module và API đọc. Đặc tả API cập nhật hơn có ghi phần base đã có. Đồng bộ tài liệu, không xóa Audit vì câu cũ.

## 8. Đối chiếu backlog và thứ tự xử lý đề nghị

Theo snapshot Sprint 3 ngày 08/11, BE-19, BE-32, BE-34, BE-40, BE-42 cùng nhiều task liên quan chưa DONE; một số task UI DONE ở backlog không chứng minh API/AC hiện hành đã hoàn tất. Không đổi trạng thái/PIC/SP trong lượt audit.

| Thứ tự | Việc cần xử lý | Task liên quan |
|---|---|---|
| 1 | Khóa quyền voucher bằng JWT, chặn role trái phép; kiểm tra CUSTOMER-only checkout | BE-34/BE-35, BE-09, BE-24/BE-25 |
| 2 | Manager dùng operation đúng; bỏ link thông báo bị cấm và mock-success | UI-26/BE-21, UI-28/BE-34, notification UI |
| 3 | Tách COD/Order, bắt buộc lý do, hoàn tiền bền vững và scope | BE-32, BE-26/BE-27, UI-24 và các task tích hợp đã gộp |
| 4 | Nhân sự thật: list scoped, tạo/khóa/đổi quán/xếp ca, vô hiệu phiên cũ khi đổi quyền | BE-19, BE-17, KAFKA-10 |
| 5 | Dashboard/reviews/reports nối API theo role; bỏ fixture khỏi luồng thật | BE-40/BE-42, UI-29/UI-30 và scope đã gộp |
| 6 | Audit UI + producer/consumer; đóng contract thiếu; tiệc/proposal theo đúng backlog | BE-43/KAFKA-10, BE-28, BE-35 |

Không khuyến nghị sửa bằng `allowedRoles` chứa cả ba ở mọi trang hoặc cho Manager dùng mọi API Admin. Mỗi API phải kiểm tra **actor + action + resource/store/owner + trạng thái nghiệp vụ**. UI chỉ phản ánh quyền đó.

## 9. Checklist nghiệm thu đề nghị — chưa thực hiện

- Hai chi nhánh A/B, một Staff và Manager mỗi quán, một Admin và một Customer; tài khoản seed không được coi là quy tắc nghiệp vụ.
- Với từng vai trò: kiểm tra menu, URL trực tiếp, link notification, API qua Gateway và dữ liệu sau reload.
- Staff A được xử lý đơn/kho/reply A; bị chặn mọi mutation B, approve refund, cấu hình loyalty, CRUD voucher/menu/nhân sự.
- Manager A sửa operation A được; sửa dữ liệu gốc/Manager khác/Staff B bị chặn; list Staff không trả tài khoản ngoài quyền.
- Admin dùng nghiệp vụ toàn hệ thống nhưng vẫn không vượt transition/payment/validation; route chuyên dụng Staff không làm mất đường thao tác chung.
- COD được ghi vào Payment đúng một lần; không hoàn thành đơn ngoài ý định; hủy đơn paid tạo refund thật, lý do tồn tại sau reload; Staff không approve.
- Voucher không dùng header tự khai để nâng quyền; request thiếu/sai actor header không ảnh hưởng quyền JWT; Manager không tự duyệt voucher.
- API trả 401/403/404/409/5xx hoặc mất mạng phải có lỗi đúng, không ghi thành công cục bộ; danh sách rỗng không biến thành fixture.
- Staff không nhận link tới màn hình bị cấm; dữ liệu mock không xuất hiện như dữ liệu thật.
- Reports xuất được file thật đúng quán/kỳ; audit mutation có actor/store/action đáng tin, eventId/correlationId và không chứa secret.
- Đổi role/store hoặc khóa tài khoản làm phiên cũ mất quyền theo contract session. Chưa xác nhận bằng runtime trong báo cáo này.

## 10. Nguồn đối chiếu

- `architechture/docs/Ma trận phân quyền.md:5` — phạm vi backend và bảng 40 nghiệp vụ.
- `architechture/docs/SRS.md:143` — Staff, Manager, Admin; `:272` — shipment MVP.
- `architechture/docs/Đặc tả API.md:40` — Identity; `:108` — thanh toán; `:152` — Review/Report; `:192` — Audit.
- `architechture/docs/Kiến trúc hệ thống.md:15` — Gateway, bounded contexts, JWT/store scope.
- `architechture/docs/backlog.md:3`, `architechture/docs/Sprint_3_Status_2026-11-08.md:1` — cập nhật và giới hạn snapshot.
- `architechture/tasks/BE-19.md:29` — nhân sự và contract Manager; UI-27/UI-28 và các task được dẫn trong mục 8.

**Bàn giao:** đây là báo cáo phân tích và đề nghị chuẩn hóa, chưa phải bản sửa hoặc kết quả test. Chỉ file báo cáo thay đổi trong lượt này; không cần rebuild vì không thay mã/cấu hình ứng dụng.
