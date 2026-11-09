# Kế hoạch chuẩn hóa tài khoản chi nhánh, phân quyền và vận hành

Ngày: 08/11/2026 — BẢN v1.0, phạm vi đã được người dùng xác nhận; chưa triển khai ứng dụng. Hai luồng trả tiền ngoài phạm vi hiện tại được tạm hoãn tại mục 12.

Nguồn: quyết định mới của người dùng trong chat; báo cáo `architechture/docs/RBAC_Audit_2026-11-08.md`; SRS/RBAC/API/kiến trúc/backlog hiện tại; source Identity, Order, Payment và hai frontend.

**Lượt này chỉ lập kế hoạch và từ vựng. Không sửa ứng dụng, database, tài khoản hoặc cấu hình. Không chạy test, trình duyệt hay rebuild. Không đổi trạng thái/PIC/SP/sprint trên backlog hoặc Lark.** Các tên trạng thái/field mới dưới đây là đề xuất, chưa phải contract đã phê duyệt.

## 1. Định hướng: thay mô hình nghiệp vụ, không viết lại cả hệ thống

Giữ hai frontend, Gateway, Eureka, Config Server, các bounded context, PostgreSQL/Flyway, Kafka và cơ chế xác thực hiện có. Thay phần sai hoặc chưa đủ trong từng service; không gộp database, không thêm service mới chỉ để thực hiện kế hoạch này.

- **Đợt 1 / fix:** sửa lỗi và khóa đúng quyền của luồng đang có. Chức năng thiếu backend phải hiện đúng trạng thái chưa triển khai/không khả dụng, không dùng mock hoặc thông báo thành công giả. Không âm thầm biến đợt fix thành viết Payment/Identity mới.
- **Đợt 2 / hoàn thiện:** tài khoản chi nhánh/recovery, Staff nhập đơn nhanh, Admin quản lý ngân hàng, thu tiền mặt/chuyển khoản/kết hợp, đối soát, refund cơ bản và cảnh báo kho.
- Đợt 2 bao gồm nhập đơn nhanh và thu tiền tại quầy tối thiểu. Chưa làm POS đầy đủ, máy in/két tiền, công nợ hoặc chạy mất mạng. Shipping Phase 2, đơn tiệc, voucher proposal và đối tác giao hàng vẫn ngoài phạm vi.
- Báo cáo audit ngày 08/11 phản ánh yêu cầu cũ tại thời điểm rà soát. Quyết định mới về Staff/dashboard/kho/tài khoản thay thế các đề xuất cũ tương ứng, không sửa lịch sử báo cáo thành như đã biết từ trước.

## 2. Quyết định hiện hành đã chốt

- Mỗi chi nhánh đúng một Manager + một Staff dùng chung, nhiều thiết bị cùng đăng nhập; không check-in/xếp ca/danh tính từng nhân viên. Audit chỉ biết tài khoản/phiên, không khẳng định người thực hiện cụ thể.
- Đồng ý định danh nội bộ và kích hoạt/recovery theo đề xuất. Manager liên kết email khôi phục cặp tài khoản; Admin hỗ trợ reset có OTP email Admin/audit. Không tạo hoặc nâng tài khoản thành Admin qua UI/API.
- Staff có nhập đơn nhanh tại quầy, xử lý đơn, xem tiền vào đúng quán và nút báo hết món thủ công; không dashboard, không sửa số lượng/ngưỡng kho.
- Offline là thanh toán tại quầy, không phải ứng dụng mất mạng. Cho tiền mặt/chuyển khoản/kết hợp; Staff được xác nhận thủ công có lý do, không thêm bước Manager duyệt từng đơn.
- Admin CRUD danh sách tài khoản ngân hàng nhận tiền và gán cho quán. Một tài khoản được dùng nhiều chi nhánh; Manager/Staff không thêm hoặc tự đổi gán. Nội dung chuyển khoản có mã quán 001/002... để phân loại backend.
- Chỉ hủy khi PENDING_PAYMENT hoặc CONFIRMED; PREPARING trở đi không hủy kể cả Admin. Thu tiền và hoàn tất bàn giao là hai sự kiện khác nhau.
- Refund basic chỉ áp dụng đơn chọn chuyển khoản, đã chuyển và hủy trước PREPARING; không hoàn tiền mặt, không khiếu nại sau chế biến/hoàn thành. Ngân hàng khách lỗi có trạng thái chờ cập nhật, notify/email; bằng chứng chuyển hoàn lưu Cloudinary.
- Online chuyển nhiều lần cùng mã được cộng; đủ hoặc dư thì đơn được xác nhận. Tiền nhận một phần rồi expiry không kéo dài/mở lại đơn, giữ sổ tiền đã nhận.
- Manager quản lý tồn và ngưỡng chung/quán mặc định 20; vẫn giữ Staff báo hết món nhanh. Manager chỉnh giờ/liên hệ/tạm đóng/tọa độ/khu vực giao quán mình.
- Admin xóa mềm đánh giá; Manager chỉ ẩn trong quán. Shipping nâng cao và nghiệp vụ khiếu nại chưa làm.

**Đã chốt tạm hoãn:** trả tiền chuyển dư và trả phần tiền đã chuyển khi đơn hết hạn chưa triển khai trong cả hai đợt hiện tại. Vẫn ghi nhận/theo dõi khoản tiền, không mở chi trả; đây là hoãn tính năng, không phải quyết định từ chối hoàn vĩnh viễn. Xem mục 12.

## 3. Ma trận quyền mục tiêu

| Chức năng | Staff dùng chung | Manager quán | Admin |
|---|---|---|---|
| Trang vào | Xử lý đơn/nhập đơn nhanh | Dashboard quán | Dashboard chuỗi |
| Tạo đơn quầy | Quán mình, không giả Customer | Quán mình | Chọn quán rõ ràng |
| Xử lý/hủy đơn | Quán mình; đúng trạng thái/lý do | Quán mình, cùng điều kiện | Mọi quán, cùng điều kiện |
| Thu tại quầy | Tiền mặt/chuyển khoản/kết hợp; xác nhận thủ công có lý do | Quán mình và xem ngoại lệ | Mọi quán |
| Tiền vào | Chỉ giao dịch đã phân loại quán mình | Quán mình | Toàn hệ thống/khoản chưa rõ quán |
| CRUD ngân hàng/gán quán | Không | Không | Có; một tài khoản có thể dùng nhiều quán |
| Refund basic | Không duyệt/đánh dấu hoàn | Đúng điều kiện, quán mình | Cùng điều kiện, mọi quán |
| Trả dư/trả tiền đã chuyển khi đơn hết hạn | Tạm hoãn | Tạm hoãn | Tạm hoãn |
| Số lượng/ngưỡng kho | Không sửa | Quán mình | Mọi quán |
| Báo hết món thủ công | Có, quán mình; không sửa giá/số lượng | Có | Có |
| Menu/giá/voucher gốc | Không | Không CRUD trực tiếp | Có |
| Dashboard/báo cáo | Không | Quán mình | Chuỗi/quán |
| Tài khoản nội bộ | Không tạo hoặc sửa recovery/quyền | Recovery cặp tài khoản quán; không thêm Staff | Tạo cặp qua tạo quán, khóa/reset có audit |
| Tạo/promote Admin | Không | Không | Không qua UI/API |
| Vận hành quán | Không cấu hình | Giờ, liên hệ, tạm đóng, tọa độ/phạm vi giao | Mọi quán |
| Đánh giá | Quyền reply cũ còn, không đưa vào màn chính | Reply/ẩn quán | Reply/ẩn/xóa mềm |
| Audit | Không màn tra cứu riêng | Thao tác tài khoản Staff quán | Toàn hệ thống |

Backend quyết định role/action/store/state, UI phản ánh. Không mở sao kê chuỗi cho Staff chỉ vì dùng chung ngân hàng. Không tin store/role/giá/channel tự khai để vượt quyền.

## 4. Đợt 1 — gói fix, không phát triển tính năng mới

### F1. Chuẩn hóa policy và điểm vào

- Đối chiếu SRS/RBAC/API và spec Staff; ghi rõ những dòng bị yêu cầu mới thay thế: dashboard ca, nhân viên cá nhân, check-in, kho Staff, hủy PREPARING.
- Staff đăng nhập đi thẳng tới orders; sửa cả login, index, nút quay lại 403, link notification và alias cũ, không chỉ ẩn menu.
- Staff bị chặn API cập nhật tồn/ngưỡng và dashboard/revenue, đồng thời bỏ các entry UI tương ứng. Giữ nút Staff báo hết món thủ công, tách khỏi sửa số lượng/ngưỡng.
- Khóa UI/API tạo Admin hoặc promote role lên Admin; không tự thay các Admin đang có.

### F2. Sửa quyền và scope có lỗi

- Voucher lấy actor từ JWT; Admin-only CRUD trong khi proposal chưa triển khai; chặn cả detail/list ngoài quyền, bỏ header actor tự khai.
- Manager sửa vận hành bằng operation API và field được phép; giữ CRUD gốc cho Admin. Phone/deliveryArea chưa có contract thì không cho lưu qua endpoint Admin; hoàn thiện ở đợt 2.
- Checkout online vẫn CUSTOMER-only; đợt 2 thêm API đơn quầy đúng quyền nhân sự, không dùng tài khoản nội bộ giả làm Customer.
- Guard cho action trong Order/Party và ownership; các chức năng Party chưa đủ điều kiện vẫn không mở chỉ vì có controller.
- Không mở GET users toàn hệ thống cho Manager. Chưa có list scoped thật thì màn đó báo chưa khả dụng, không bơm fixture.

### F3. Sửa sai lệch Order/Payment hiện hữu

- Chặn CANCELLED từ PREPARING trở đi ở mọi endpoint, kể cả reject/status và request trực tiếp; thống nhất note/reason, bắt buộc lý do.
- Xử lý cạnh tranh hủy và bắt đầu chế biến theo version/transaction: chỉ một chuyển trạng thái hợp lệ được commit.
- Gỡ đường COD gọi đổi Order thành COMPLETED. Nếu Payment chưa có endpoint thật, vô hiệu hóa thao tác thu tiền với thông báo rõ; không dựng endpoint giả hoặc local success để demo.
- Không xác nhận tiền chỉ vì request đổi trạng thái đơn, không đánh APPROVED thành REFUNDED, không tạo refund chỉ trong state frontend.
- Payment thiếu dịch vụ để chứng minh đã thu thì không cho hoàn tất giả. Giữ dữ liệu hiện hữu; nếu trạng thái lịch sử thiếu căn cứ thì ghi nhận cần xử lý, không tự suy đoán.

### F4. Loại hành vi gây hiểu nhầm và bàn giao

- Không nuốt 403/404/5xx rồi báo thành công; danh sách rỗng không thay bằng mock. Luồng chưa nối thật hiện rõ chưa triển khai.
- Notification chỉ dẫn tới route đúng quyền; API lỗi/không khả dụng không giả thành không có dữ liệu.
- Màn mock giữ source phục vụ đợt 2 nếu cần nhưng không hiển thị như dữ liệu vận hành. Đợt 1 chưa làm lại Reports/Payments/Users đầy đủ.
- Bàn giao bảng endpoint/action/role đã sửa, danh sách tính năng còn khóa và checklist để người dùng tự kiểm thử.

**Điều kiện kết thúc đợt 1:** không còn lỗi vượt quyền/scope đã xác định trong các luồng được mở; không giả thành công; không hủy sau PREPARING; route chính Staff không còn dashboard; phần chưa làm được ghi rõ. Không yêu cầu toàn bộ tính năng đợt 2 phải hoàn thiện mới đóng đợt 1.

## 5. Đợt 2A — tài khoản cố định của chi nhánh và recovery

### 5.1. Cấp tài khoản khi tạo quán

Đã chốt: mỗi quán có đúng một tài khoản STORE_MANAGER và một STAFF dùng chung. Khóa tạm thời vẫn chiếm slot, không tạo tài khoản thứ hai để lách giới hạn. Không có màn tuyển/tạo nhiều tài khoản Staff hoặc quản lý ca theo cá nhân trong mô hình mới.

1. Admin nhập thông tin quán và email recovery của Manager; cấp định danh đăng nhập nội bộ và kích hoạt qua email theo đề xuất được chấp nhận.
2. Catalog lưu chi nhánh ở trạng thái chưa sẵn sàng mở bán; Identity tạo cả hai tài khoản trong một transaction của chính Identity.
3. Provision có idempotency theo chi nhánh/yêu cầu; retry không sinh thêm tài khoản. Chỉ đánh dấu hoàn thành khi có đủ cặp tài khoản; lỗi một bước giữ trạng thái có thể retry, không xóa quán/tài khoản bừa bãi.
4. Ràng buộc duy nhất cho cặp store/role trong dữ liệu tài khoản hiện hành ở Identity. Không thêm FK/join xuyên Catalog–Identity.
5. Không dùng mật khẩu mặc định chung, không gửi plaintext password vào log/sự kiện/email. Đề xuất xác minh email rồi đặt mật khẩu bằng token kích hoạt có hạn, gắn đúng tài khoản.

Source hiện đăng nhập bằng email duy nhất; email recovery dùng chung không thể nhét vào email đăng nhập của cả hai user. Đề xuất định danh đăng nhập nội bộ riêng ổn định, ví dụ `manager.<maquan>` / `staff.<maquan>`; Customer/Admin giữ email hiện có. Hướng này đã được chấp nhận; viết contract cụ thể trước khi triển khai đợt 2.

### 5.2. Khôi phục mật khẩu

- Manager xác minh email recovery trước khi sử dụng. Đổi email cần xác thực lại, OTP tới email hiện tại và email mới; nếu mất email cũ đi đường Admin hỗ trợ được audit, không tự điền email mới ở màn forgot-password.
- Forgot-password chọn đúng tài khoản quản lý hoặc Staff. Server tra email recovery đã xác minh; client không quyết định nơi nhận OTP.
- OTP gắn **target account + purpose + challenge**, không chỉ email: cùng một mailbox không được dùng OTP của Staff để đổi mật khẩu Manager.
- Giới hạn gửi/thử, hết hạn, dùng một lần; phản hồi không tiết lộ tài khoản tồn tại. Đổi mật khẩu thu hồi mọi session của tài khoản đích; reset Staff không tự reset Manager.
- Admin tự quên mật khẩu: form xác nhận → OTP gửi email Admin đã lưu → đặt mật khẩu → thu hồi phiên. Không cho người ngoài chỉ định email đích.
- Admin hỗ trợ reset quán theo hướng được xác nhận: xác thực lại Admin + OTP email Admin + audit target/store; email recovery mới phải được xác minh, Staff không được đổi nơi nhận OTP.

### 5.3. Tài khoản dùng chung và dữ liệu cũ

- Đã xác nhận cho phép nhiều phiên/thiết bị cùng tài khoản. Audit ghi tài khoản, role, quán, session/thời gian; **không xác định được người thật nào thao tác**. Không tự bổ sung PIN cá nhân/chấm công trái mô hình tối giản.
- Chuyển dữ liệu cũ phải lập danh sách cặp tài khoản được giữ theo quán để Admin xác nhận. Không chọn tài khoản có id nhỏ nhất hoặc xóa các user còn được audit/order tham chiếu.
- Tài khoản dư được lưu lịch sử, khóa/đánh dấu không còn là tài khoản vận hành và thu hồi session; giữ được actor và quán lịch sử. Ràng buộc cặp duy nhất chỉ áp sau khi dữ liệu đã được xử lý rõ.
- DB thay đổi dùng migration mới; có backup trước chuyển đổi. Không đổi primary key hay gán lại người thực hiện lịch sử cho tài khoản dùng chung.

## 6. Đợt 2B — Staff workspace, nhập đơn nhanh và Manager settings

### 6.1. Giao diện Staff

- Hai lối chính: “Nhập đơn nhanh” và “Xử lý đơn”; màn phụ “Tiền vào”. Không dashboard doanh thu, CRUD ngân hàng, sửa kho hoặc quản lý nhân sự. Giữ nút báo hết món nhanh.
- Bảng đơn: Chờ tiền / Mới xác nhận / Đang chuẩn bị / Sẵn sàng / Tra cứu đã xong. Số lượng trên tab là chỉ báo thao tác, không báo cáo tài chính.
- Thẻ đơn lớn, rõ mã đơn/thời gian/món/tùy chọn/tình trạng thu tiền. Mục tiêu chạm khoảng 48px trở lên, không chỉ dùng màu để thể hiện trạng thái; có bàn phím, loading/error rõ và chống double click.
- Giữ palette/font repo. Mượn nguyên tắc giao diện quầy rõ ràng, không sao chép branding chuỗi khác.

### 6.2. Nhập đơn nhanh tại quầy

1. Staff chọn món/combo, tùy chọn, số lượng và ghi chú; backend tính lại giá/tổng và kiểm tra tồn/khả dụng.
2. Chọn thu tiền mặt, chuyển khoản hoặc kết hợp; thông tin khách chỉ nhập khi cần, không bắt đăng ký tài khoản để mua tại quầy.
3. Lưu đơn và chuyển sang bảng xử lý; retry không tạo trùng đơn/giữ tồn hai lần. Tái dùng nghiệp vụ giá/tồn/đơn hiện có, không xây một bộ Order khác.
4. Có API quầy riêng cho Staff/Manager/Admin, ép store theo JWT hoặc quán Admin chọn. Giữ checkout online CUSTOMER-only.
5. Nguồn đơn quầy khác nguồn đơn web; không gán customerId bằng id Staff, không tạo Customer giả dùng chung. Order hiện customer_id NOT NULL nên cần migration/DTO khách vãng lai; rà lại loyalty/review/email để không cộng điểm/gửi thông tin nhầm cho Staff.

**Offline là thanh toán tại quầy**, không phải browser mất mạng. Nguồn tạo đơn và hình thức thanh toán là hai thuộc tính riêng: đơn web cũng có thể thanh toán tại quầy theo lựa chọn hợp lệ. Không dùng PICKUP làm bằng chứng đơn được tạo offline.

### 6.3. Thu tiền và hoàn thành đơn

- Luồng nhận tại quán: CONFIRMED → PREPARING → READY → COMPLETED; chỉ PENDING_PAYMENT/CONFIRMED → CANCELLED với lý do. Admin không được hủy từ PREPARING.
- Tiền mặt do Staff ghi nhận; chuyển khoản có phần đã đối soát hoặc phần Staff xác nhận thủ công, theo 7.4. Không bắt toàn bộ tổng tiền phải có trong sao kê khi khách trả kết hợp.
- Nút “Đã thu tiền & bàn giao” tại READY khi giao khách: một thao tác UI, nhưng Payment và Order vẫn ghi nhận riêng. Online trả tiền trước không tự hoàn thành đơn.
- Payment thành công, Order lỗi → hiển thị đã thu/chờ hoàn tất; retry chỉ phần Order, không ghi thu lần hai. Chống thao tác cạnh tranh nhiều máy bằng version/idempotency.
- DELIVERY không coi là đã giao chỉ vì quầy nhận tiền; không triển khai shipper/tracking trong kế hoạch này.

### 6.4. Manager settings và cảnh báo tồn

- Manager sửa giờ, tạm đóng/mở, liên hệ, tọa độ/phạm vi giao quán mình; không sửa ngân hàng nhận tiền, phí ship hệ thống hoặc dữ liệu quán khác.
- Một ngưỡng chung/quán mặc định 20, số nguyên không âm, áp số lượng sản phẩm trong inventory hiện tại; không thêm kho nguyên liệu/công thức hoặc ngưỡng từng món.
- Tồn từ trên xuống bằng/dưới ngưỡng: cảnh báo Manager; không spam mỗi lần đọc. Nhập thêm vượt ngưỡng thì đóng đợt cảnh báo, xuống lại mới báo lại. Thay ngưỡng có đánh giá lại và gộp thông báo.
- Manager cập nhật số lượng/ngưỡng, không thêm bước Staff nhập rồi Manager duyệt. Staff giữ báo hết món thủ công, nhưng không được tăng tồn/sửa giá hoặc bật bán vượt ràng buộc tồn 0.

## 7. Đợt 2C — ngân hàng, đối soát và thu tiền linh hoạt

### 7.1. Admin quản lý ngân hàng nhận tiền

- “Thẻ ngân hàng” được chuẩn hóa thành tài khoản nhận tiền: ngân hàng/mã ngân hàng, số tài khoản, tên chủ tài khoản, trạng thái. Không thu PAN/CVV/PIN/mật khẩu ngân hàng.
- Admin được thêm tài khoản hợp lệ bất kỳ vào danh sách, CRUD/ngưng dùng và gán cho quán; Manager/Staff chỉ xem thông tin cần phục vụ thu tiền. Đề xuất một tài khoản nhận hiện hành/quán; một tài khoản được gán nhiều quán, không ràng buộc độc quyền.
- Tài khoản đã có payment/giao dịch không xóa cứng: ngưng dùng, giữ lịch sử. Payment/QR giữ snapshot ngân hàng lúc tạo; sửa cấu hình không đổi nơi nhận của đơn đang thanh toán một cách âm thầm.
- Đổi gán phải giữ xử lý được giao dịch gửi vào tài khoản cũ cho payment cũ; không ngắt nguồn khi còn khoản chờ đối soát. Không thêm FK/join qua database Catalog; Payment sở hữu cấu hình/gán và xác minh store qua service.
- Thêm số tài khoản vào danh sách không tự cấp quyền lấy sao kê/webhook. Cần nguồn giao dịch được kết nối và được phép truy cập; chưa có feed thật thì không báo đối soát tự động đang hoạt động.

### 7.2. Mã chi nhánh trong nội dung chuyển khoản

- Source hiện Store.id tự tăng bằng GenerationType.IDENTITY. Giữ khóa chính, biểu diễn 1→001, 2→002, không thay database id thành chuỗi.
- Đề xuất nội dung mới `CLUCKY-001-<maDonDuyNhat>`; mã quán và mã đơn tách rõ. Không chỉ ghi 001 vì nhiều đơn cùng quán cần phân biệt.
- Ba chữ số là chiều rộng tối thiểu: id 1000 dùng 1000, không cắt về 000; không tái sử dụng mã quán. Mã/QR cũ giữ tương thích để đối soát đơn hiện hữu, không đổi lịch sử.
- Backend parse mã quán/mã đơn, đối chiếu store của đơn và tài khoản nhận snapshot, lưu storeId đã phân loại để query. Không `LIKE '%001%'` hoặc chỉ filter UI rồi coi là phân quyền.
- Staff/Manager bị ép storeId từ JWT; không đổi mã query để xem quán khác. Nội dung người chuyển ghi không phải bằng chứng xác thực người dùng.
- Mã quán hợp lệ nhưng mã đơn sai: “đã phân loại quán, chưa gán đơn”; Staff quán đó có thể tìm nội dung và xử lý thủ công. Chỉ trả field cần thiết, không raw payload/credential/sao kê quán khác.
- Thiếu/sai mã quán hoặc mã quán xung đột mã đơn/tài khoản nhận: giữ chưa phân loại cho Admin, không tự chia cho Staff/Manager bằng phỏng đoán. Dùng chung tài khoản không đồng nghĩa xem chung toàn bộ dòng tiền.

### 7.3. Nhiều lần chuyển, thiếu/dư và expiry

- Xác thực webhook; bankTxId duy nhất. Cùng id gửi lại không cộng, khác id cùng nội dung là hai giao dịch thật, kể cả khác người gửi.
- Đối soát tự động chuyển khoản: `received` là tổng các khoản phân bổ hợp lệ; `missing=max(orderTotal-received,0)`, `excess=max(received-orderTotal,0)`. Số tiền chính xác, không float.
- Thiếu giữ chờ, hiện số đã nhận/còn thiếu; đủ hoặc dư xác nhận một lần, event idempotent. Tiền dư không tăng giá trị đơn/doanh thu/điểm thưởng.
- Đơn 200.000đ: 70.000+50.000 → nhận 120.000, thiếu 80.000; thêm 100.000 → đủ, dư 20.000. Webhook 100.000 gửi lại không làm tăng tổng.
- Một bankTx không gán hai đơn; chống race mất giao dịch/xác nhận hai lần. Chưa làm một giao dịch chia nhiều đơn.
- Tiền dư được theo dõi riêng; người dùng đã tạm hoãn chức năng trả dư. Không mở API/nút chi trả hoặc tự sinh lượt hoàn; không ghi là đã hoàn hoặc doanh thu. Đơn nhận đủ/dư vẫn xác nhận đúng một lần.
- Tiền tới sau PAID/COMPLETED vẫn ghi nhận mà không xác nhận/earn points lần nữa. Tới sau expiry/hủy không mở lại đơn/đẩy bếp.
- Đã nhận một phần rồi expiry: giữ deadline cũ, không gia hạn; vẫn lưu khoản nhận nhưng tạm hoãn chức năng trả lại khoản này. Online sai nội dung không có CSKH vẫn phải lưu chưa đối soát, không xóa hoặc gửi thông báo nhầm khách.

### 7.4. Staff xác nhận tại quầy, không thêm lớp duyệt

- Cho phép tiền mặt/chuyển khoản/kết hợp. Đơn 200.000đ có thể nhận 120.000 tiền mặt + 80.000 chuyển khoản, không cần 200.000 xuất hiện trong sao kê.
- Staff được xác nhận thủ công có lý do, không bắt chọn bankTx đủ tiền và không xin Manager duyệt từng đơn. Biết giao dịch thì liên kết; chưa có feed hoặc sai nội dung thì ghi là Staff xác nhận, chưa đối soát ngân hàng.
- Phân biệt tiền ngân hàng đã đối soát, tiền mặt Staff ghi nhận, phần chuyển khoản Staff xác nhận chờ đối soát và quyết định chấp nhận thanh toán thủ công. Không tạo bankTx giả hoặc sửa amount của ngân hàng để làm khớp.
- UI gợi ý thiếu/dư nhưng không hard-block chỉ vì sao kê chưa đủ. Xác nhận ngoại lệ phải giữ số từng nguồn như Staff khai, chênh lệch nếu có, lý do, actor/store/thời gian để Manager theo dõi; không tự bù thiếu vào tiền mặt hay gọi là giảm giá.
- Webhook đến sau khoản Staff đã khai phải đối soát, không đếm thành thu lần hai hoặc phát payment success lặp. Chưa đủ căn cứ thì chờ đối soát, không ghép tùy ý theo số tiền gần giống.
- Quyền này chỉ cho nhân sự thanh toán tại quầy được ghi nhận phía server, không cho Customer chọn bypass online. Vẫn kiểm tra role/store/state và audit; browser mất mạng không được tự báo đã thu thành công.
- Tiền khách đưa và tiền thối lại ngay trong lần thu tiền mặt là dữ liệu thu quầy, khác hoàn đơn hoặc trả tiền chuyển khoản dư sau đó.
- Chưa thêm tính năng bán chịu/miễn tiền, phê duyệt từng khoản, hạn mức phức tạp hoặc bắt danh tính từng nhân viên.

## 8. Đợt 2D — refund, bằng chứng và thông báo khách

### 8.1. Chỉ refund cơ bản trước PREPARING

Điều kiện đồng thời: đơn chọn chuyển khoản, có tiền đã chuyển thực tế, và hủy tại PENDING_PAYMENT/CONFIRMED trước khi vào PREPARING. Lưu trạng thái tại thời điểm hủy; không chỉ nhìn CANCELLED hiện tại.

- Không khiếu nại sau chế biến/hoàn thành, không hoàn tiền mặt hoặc tự cho refund đơn thanh toán kết hợp chỉ vì có một phần chuyển khoản.
- Đơn quầy thuần chuyển khoản cũng xét đúng điều kiện trên; nguồn COUNTER/WEB không tự thay điều kiện. Xác nhận thủ công không phải bằng chứng bankTx đã nhận để cấp refund tự động.
- Manager xử lý đúng quán, Admin cùng điều kiện trên mọi quán; Staff không duyệt/đánh dấu hoàn.
- Số tiền hoàn do server tính từ tiền hợp lệ thực nhận chưa hoàn, không lấy tùy ý từ client, không chi trùng. Không biến PAID thành UNPAID sau hoàn.
- Trả dư và trả khoản đã chuyển khi đơn hết hạn đều tạm hoãn, không đưa vào refund basic bằng đường tắt. Phân biệt lý do hết hạn với hủy hợp lệ trước PREPARING để không tự sinh refund qua sự kiện hủy do expiry. Không hoàn total nếu thực nhận mới một phần; không tự bật workflow trả dư cũ.

### 8.2. Trạng thái đề xuất

| Trạng thái | Ý nghĩa và đường ra |
|---|---|
| PENDING | Đang chờ Manager xét yêu cầu, chưa chi tiền |
| REJECTED | Lý do nghiệp vụ không được chấp nhận, bắt buộc lý do, báo khách |
| APPROVED | Đồng ý hoàn, chưa chứng minh đã chi |
| PROCESSING | Đang thực hiện chuyển hoàn; tránh hai thiết bị xử lý cùng yêu cầu |
| WAITING_BANK_DETAILS | Tài khoản/ngân hàng nhận không dùng được; có lý do, yêu cầu khách cập nhật |
| REFUNDED | Người có quyền xác nhận đã chuyển thành công, đủ bằng chứng; không quay lại để chi thêm |

- Khách sửa thông tin ngân hàng chỉ trên yêu cầu của chính mình, trong trạng thái được phép; không được sửa amount/approval. Cập nhật xong quay lại APPROVED để Manager xử lý, không tự thành REFUNDED.
- Lưu snapshot ngân hàng ở mỗi lần xử lý; khách đổi thông tin không sửa bằng chứng của lần trước. Không đổi nơi nhận trong khi chuyển đang PROCESSING mà không dừng lượt xử lý.
- Lỗi timeout/upload/mạng không phải lý do từ chối refund. Nếu không chắc ngân hàng đã chuyển, phải đối soát trước khi thử lại. Idempotency trong hệ thống không bảo đảm một người không chuyển hai lần ngoài app.
- Phạm vi basic không có khiếu nại: Manager kiểm tra điều kiện/số tiền/chống trùng. REJECTED là yêu cầu không hợp lệ, có lý do; lỗi ngân hàng dùng WAITING_BANK_DETAILS. Không thêm tiêu chí cảm tính ngoài điều kiện hủy/hoàn đã chốt.

### 8.3. Bằng chứng Cloudinary

- Manager chuyển tiền bằng công cụ ngân hàng bên ngoài, sau đó upload ảnh và xác nhận; không đề xuất app tự thực hiện bank transfer khi chưa có tích hợp.
- Server gắn asset với refund/store/actor, amount và thời gian xác nhận; kiểm tra định dạng/dung lượng/quyền upload. Không tin publicId/url tùy ý do client gửi.
- Ảnh chỉ chứng minh Manager đã cung cấp bằng chứng, **không phải xác minh tự động từ ngân hàng**. Upload thành công không tự chuyển trạng thái REFUNDED.
- Bằng chứng có dữ liệu ngân hàng nên không dùng ảnh public như ảnh món. Duyệt quyền truy cập của Customer-owner, Manager-quán, Admin trước khi cấp quyền xem; kiểm chứng khả năng delivery hạn chế của cấu hình Cloudinary khi triển khai.
- Upload lỗi thì giữ yêu cầu và form; lưu trạng thái lỗi để xử lý, không báo đã hoàn. Không tự xóa ảnh của yêu cầu đã xác nhận hoặc asset đang được tham chiếu.

### 8.4. “Webhook sang customer”

Customer frontend không phải đích webhook ngân hàng. Đề xuất dùng kiến trúc sẵn có: Payment/Order commit sự kiện → Kafka → Notification lưu in-app và gửi email → customer lấy notification qua Gateway; cập nhật realtime nếu cơ chế hiện có hỗ trợ, không thêm WebSocket chỉ vì tên webhook.

- Ngân hàng khách không hợp lệ: notify/email có lý do phù hợp và link tới yêu cầu cập nhật, không chứa credential hoặc đầy đủ thông tin ngân hàng nhạy cảm.
- Từ chối/đã hoàn cũng thông báo theo sự kiện thật. Thông báo/email lỗi phải retry/dedup, không rollback khoản tiền đã chi hoặc gửi nhiều email trùng vì replay.

## 9. Đợt 2E — nối phần còn lại và đóng tài liệu

- Dashboard/Reports thật cho Manager/Admin; Reviews theo quán, Admin xóa mềm; audit có actor/store, không nhận audit tự khai frontend.
- Không đưa lại bảng xếp ca nhân viên cá nhân trong mô hình shared Staff nếu chưa có danh tính cá nhân. Các task cũ tương ứng được đánh dấu cần thay phạm vi, không tự xóa task hoặc nhận DONE.
- Cập nhật SRS/RBAC/API/database/events/spec Staff/backlog sau khi bản kế hoạch được duyệt. Tài liệu cũ nói Staff check-in và hủy PREPARING phải được thay rõ, không để hai bản đều là chuẩn.

## 10. Thứ tự triển khai và điểm nghiệm thu

| Mốc | Đầu ra | Phụ thuộc chính |
|---|---|---|
| D1 | F1–F4: policy/route/scope/state/error fix; danh sách chức năng còn khóa | Duyệt phạm vi đợt 1; không cần đợi thiết kế màn Staff mới |
| D2A | Cặp tài khoản/recovery/chuyển đổi | Identity/Catalog/Notification; Admin duyệt danh sách tài khoản cũ cần giữ |
| D2B | Nhập đơn nhanh/xử lý đơn, báo hết món, Manager settings/kho | API quầy/khách vãng lai; money actions đợi D2C |
| D2C | Admin CRUD/gán ngân hàng, mã quán, thu kết hợp/thủ công, cộng dồn/đối soát | Payment/Order/events, bank feed thật; chưa mở chi trả dư |
| D2D | Refund basic trước PREPARING, ảnh, cập nhật ngân hàng, notify/email | D2C; loại trừ trả dư/trả tiền đơn hết hạn theo mục 12; không khiếu nại |
| D2E | Reports/reviews/audit tích hợp, migration chốt và docs đồng bộ | Các mốc liên quan được nghiệm thu |

Mỗi mốc gồm API + UI + error/permission/state tương ứng, không làm hết UI rồi mới bổ sung bảo mật. Không hứa ngày công/PIC/SP khi chưa duyệt phạm vi và chưa kiểm kê dữ liệu thực tế.

Khi thực thi, chỉ rebuild service bị ảnh hưởng bằng `./start-docker.ps1 -Services ...`, chờ hoàn tất/health, giữ volumes. Không tự chạy test/lint/typecheck riêng hay browser; người dùng tự kiểm thử hoặc yêu cầu rõ. Build/healthcheck có trong Docker được phép theo hướng dẫn repo.

## 11. Checklist nghiệm thu đề nghị — chưa chạy

- Tạo quán retry vẫn đúng hai tài khoản; lỗi Identity không làm quán được mở bán với cặp tài khoản thiếu. Không endpoint nào tạo/promote ADMIN.
- OTP của Staff không reset Manager dù cùng mailbox; account recovery không cho client đổi email đích; reset/lock thu hồi phiên trên mọi máy.
- Staff không đọc/chỉnh quán B, không dashboard/sửa số lượng kho/nhân sự/voucher; vẫn báo hết món. Manager không CRUD/gán ngân hàng.
- Staff nhập đơn quầy không cần Customer nhưng không giả danh thành Customer; backend tính giá/tồn, retry không trùng. Customer không gọi API quầy.
- Cùng ngân hàng gán 001/002: Staff 001 chỉ thấy khoản đã phân loại 001; chuỗi 001 trong amount/mã khác không vượt scope; mã quán–đơn xung đột không auto-match.
- Admin ngưng dùng/đổi gán ngân hàng vẫn giữ đúng payment/QR lịch sử; chưa có bank feed không báo tự đối soát.
- Thu 120k tiền mặt + 80k chuyển khoản cho đơn 200k được ghi hai nguồn; thủ công khi feed chưa về có lý do, webhook đến sau không tính thu lần hai.
- Cùng đơn: một máy hủy, một máy bắt đầu PREPARING → chỉ một transition hợp lệ. Từ PREPARING không endpoint nào hủy được.
- COD đã thu nhưng hoàn thành Order lỗi → retry không thu lần hai. Đơn online PAID chưa bàn giao không tự COMPLETED.
- Giao dịch 70k+50k+100k cho đơn 200k → PAID, dư 20k; webhook trùng giữ đúng số. Hai webhook đồng thời không mất tiền/không phát xác nhận hai lần.
- Cùng mã đơn nhưng hai người gửi khác nhau vẫn cộng khi cả hai khoản hợp lệ. Một bankTx không bị gán hai đơn.
- Chưa rõ quán/đơn → giữ chưa đối soát, không lộ toàn sao kê cho Staff. Khoản đến sau expiry/hủy không tự mở lại đơn.
- Chỉ refund đúng điều kiện chuyển khoản/đã nhận/hủy trước PREPARING. Không tự cho refund tiền mặt/kết hợp/sau chế biến/hoàn thành; không API/nút/sự kiện chi trả dư hoặc tiền đơn hết hạn trong phạm vi hiện tại. Khoản tạm hoãn vẫn được lưu/hiển thị chưa xử lý, không bị gắn REJECTED/REFUNDED. Ngân hàng lỗi → chờ thông tin; khách khác không sửa tài khoản nhận.
- Ảnh refund không công khai; upload/error/retry không tạo hoàn trùng; bằng chứng gắn đúng actor/request.
- Tồn 21→20 cảnh báo, 20→19 không spam cùng đợt, lên trên ngưỡng rồi xuống lại có cảnh báo mới; đổi ngưỡng có đánh giá lại.
- Reload/mất mạng/403/404/5xx không biến dữ liệu mẫu thành dữ liệu thật hoặc báo thành công.

## 12. Quyết định đã chốt và hai luồng tạm hoãn

- Q1: đã xác nhận một cặp/quán, đa thiết bị, không danh tính/check-in/ca cá nhân.
- Q2: đồng ý định danh đăng nhập nội bộ và quy trình email kích hoạt/recovery đề xuất.
- Q3/Q4: ghi nhận đồng ý recovery Admin; bổ sung nhập đơn nhanh. Offline là thanh toán tại quầy, không chạy mất mạng.
- Q5: Admin quản lý tài khoản ngân hàng, một tài khoản dùng nhiều quán, phân loại theo mã 001/002... trong nội dung.
- Q6: tiền mặt/chuyển khoản/kết hợp, Staff xác nhận linh hoạt có lý do; không bắt mọi khoản có sao kê trước khi thao tác, không thêm Manager duyệt từng đơn.
- Q7/Q8: refund chỉ đơn chọn chuyển khoản, đã chuyển, hủy trước PREPARING; chưa có khiếu nại, không hoàn các trường hợp khác theo quy tắc mới.
- Q9: giữ hạn thanh toán cũ, không tự gia hạn/mở lại đơn hết hạn, vẫn lưu khoản nhận.
- Q10: giữ nút báo hết món thủ công; Manager quản lý số lượng/ngưỡng.

**Xác nhận cuối của người dùng:** đồng ý các nội dung plan; tạm thời chưa xử lý trả tiền chuyển dư và trả phần tiền đã chuyển khi đơn hết hạn. Không còn câu hỏi mở về phạm vi của bản kế hoạch này.

- Hai luồng này nằm ngoài cả đợt 1 và đợt 2 hiện tại; chỉ đưa lại vào kế hoạch khi người dùng yêu cầu riêng. Không đánh dấu đã hoàn thiện hoặc từ chối chi trả vĩnh viễn.
- Vẫn lưu giao dịch, số tiền, đơn/chi nhánh đã xác định và trạng thái chưa xử lý; không xóa, không tự báo đã hoàn, không tính phần dư thành doanh thu.
- Tiếp tục đối soát/cộng dồn và xác nhận đơn khi nhận đủ hoặc dư; tạm hoãn chi trả không làm đơn đủ tiền thất bại. Đơn hết hạn không tự mở lại/gia hạn.
- Không tạo nút/API chi trả hoặc tự phát sự kiện hoàn tiền cho hai nhóm này; không chuyển sang REJECTED chỉ vì tính năng đang hoãn.
- Kế hoạch đã chốt phạm vi, không cần hỏi lại các quyết định trên. Lượt cập nhật này chỉ sửa tài liệu; chưa thực thi đợt 1 hoặc đợt 2.
