# ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)
## Hệ thống website bán hàng thức ăn nhanh (mô hình chuỗi gà rán)

| Hạng mục | Nội dung |
|---|---|
| Tên hệ thống | **Clucky** — Hệ thống website bán hàng thức ăn nhanh trực tuyến (chuỗi gà rán). Slogan: *Clucky - Crispy Outside, Happy Inside* |
| Loại dự án | Đồ án / dự án học tập |
| Phiên bản tài liệu | 2.0 — Cập nhật 23/10/2026 (chốt thương hiệu Clucky, tách frontend Next.js/React, chốt 8 microservice) |
| Kiến trúc | Microservices (8 service chính + API Gateway) — Frontend: Next.js cho Customer, React cho trang quản trị (Staff / Store Manager / Admin); Backend Spring Boot (Java), Spring Cloud Gateway |
| Hạ tầng | Docker + Docker Compose trên VPS, PostgreSQL, Redis, Apache Kafka |
| Phạm vi MVP | Website khách hàng + Website quản trị (Admin / Store Manager / Staff). Không có POS tại quầy, không có màn hình bếp (KDS), không tích hợp GrabFood/ShopeeFood |

---

# 1. GIỚI THIỆU

## 1.1. Mục đích tài liệu
Tài liệu này mô tả toàn bộ yêu cầu chức năng và phi chức năng của hệ thống website bán hàng thức ăn nhanh theo mô hình chuỗi cửa hàng gà rán (tương tự mô hình KFC), làm căn cứ cho thiết kế kiến trúc, thiết kế cơ sở dữ liệu, lập trình, kiểm thử và bảo vệ đồ án.

## 1.2. Phạm vi hệ thống
Hệ thống phục vụ một chuỗi cửa hàng thức ăn nhanh gồm nhiều chi nhánh, cho phép:
- Khách hàng xem thực đơn, đặt món/combo trực tuyến, thanh toán chuyển khoản ngân hàng (thật) hoặc COD, theo dõi đơn hàng.
- Nhân viên chi nhánh xử lý đơn hàng tại chi nhánh được phân công.
- Trưởng chi nhánh quản lý nhân sự, vận hành, kho và báo cáo của một chi nhánh.
- Quản trị viên (trụ sở) quản lý toàn bộ chuỗi: chi nhánh, thực đơn gốc, khuyến mãi, thanh toán và cấu hình hệ thống.

**Trong phạm vi (In scope):**
- Hai frontend riêng: website khách hàng bằng Next.js (Customer + Guest) và website quản trị bằng React (Staff, Store Manager, Admin), dùng chung hệ thống API qua API Gateway.
- Cơ chế đặt giao hàng (shipping): thiết kế đầy đủ dữ liệu, API và luồng trạng thái trong MVP nhưng **chưa vận hành giao hàng thật**; kích hoạt ở Phase 2 bằng đội shipper nội bộ của quán.
- Thanh toán chuyển khoản ngân hàng **thật** qua QR VietQR và đối soát tự động bằng webhook biến động số dư (SePay/Casso) — **không làm giả lập (mock/simulation)**.

**Ngoài phạm vi (Out of scope):**
- POS bán hàng tại quầy; màn hình hiển thị bếp (KDS).
- Tích hợp nền tảng giao đồ ăn bên thứ ba (GrabFood, ShopeeFood) và đơn vị vận chuyển bên ngoài.
- Ứng dụng di động native (chỉ web responsive).
- Kubernetes (chỉ dùng Docker Compose).
- Kế toán, kho nguyên liệu theo định lượng (BOM) phức tạp.

## 1.3. Định nghĩa và từ viết tắt
| Thuật ngữ | Ý nghĩa |
|---|---|
| MVP | Minimum Viable Product — phiên bản tối thiểu đầu tiên (Khách + Staff + Manager + Admin) |
| RBAC | Role-Based Access Control — phân quyền theo vai trò |
| JWT | JSON Web Token — token xác thực |
| OTP | One-Time Password — mã xác thực một lần |
| COD | Cash On Delivery — thanh toán tiền mặt khi nhận hàng |
| VietQR | Chuẩn QR thanh toán của NAPAS |
| Webhook | Cơ chế bên thứ ba gọi ngược vào hệ thống khi có sự kiện (ví dụ: tiền về tài khoản) |
| KDS | Kitchen Display System — màn hình bếp (không thuộc phạm vi) |
| HQ | Head Quarter — trụ sở / quản trị cấp chuỗi |

## 1.4. Tài liệu tham chiếu
- 02_Kien_Truc_He_Thong.md — Thiết kế kiến trúc microservices, Kafka, triển khai Docker/VPS.
- 03_Thiet_Ke_Co_So_Du_Lieu.md — Thiết kế cơ sở dữ liệu theo từng service.
- 04_Dac_Ta_API.md — Đặc tả API theo từng service.
- 05_Ma_Tran_Phan_Quyen.md / .xlsx — Ma trận phân quyền chi tiết theo role.
- 06_Brand_Guidelines.md — Quy chuẩn thương hiệu, màu sắc, typography.
- Thư mục diagrams/ — Các sơ đồ Use Case, kiến trúc, ERD, sequence, state, deployment (PNG, SVG và nguồn Mermaid).

## 1.5. Tổng quan tài liệu
Mục 2 mô tả tổng thể hệ thống và các tác nhân. Mục 3 là yêu cầu chức năng chi tiết theo từng nhóm người dùng với mã yêu cầu (FR). Mục 4 là yêu cầu phi chức năng (NFR). Mục 5 mô tả các luồng nghiệp vụ và máy trạng thái chính. Mục 6 là lộ trình MVP / Phase 2.

---

# 2. MÔ TẢ TỔNG THỂ

## 2.1. Bối cảnh sản phẩm
Hệ thống là một nền tảng thương mại điện tử cho chuỗi thức ăn nhanh, vận hành nhiều chi nhánh. Mỗi chi nhánh có trưởng chi nhánh và nhân viên riêng; thực đơn gốc, giá gốc và khuyến mãi toàn chuỗi do trụ sở quản lý, nhưng tình trạng bán (còn/hết) được quản lý theo từng chi nhánh.

## 2.2. Các tác nhân (Actors) và vai trò (Roles)
| Mã role | Vai trò | Phạm vi dữ liệu | Ghi chú |
|---|---|---|---|
| GUEST | Khách vãng lai | Công khai | Chưa đăng nhập; chỉ xem và thêm giỏ tạm |
| CUSTOMER | Khách hàng | Dữ liệu của chính mình | Đặt hàng, thanh toán, tích điểm |
| STAFF | Nhân viên chi nhánh | 1 chi nhánh được gán | Vận hành đơn hàng trong ca |
| STORE_MANAGER | Trưởng chi nhánh | 1 chi nhánh | Quản lý nhân viên, kho, báo cáo, duyệt hủy/hoàn tiền của chi nhánh |
| ADMIN | Quản trị viên / Chủ chuỗi | Toàn hệ thống | Toàn quyền cấu hình, dữ liệu gốc, tài chính |
| SHIPPER | Nhân viên giao hàng | Đơn được gán | **Phase 2** — thiết kế sẵn, MVP chưa kích hoạt |

Thứ bậc quản trị: ADMIN > STORE_MANAGER > STAFF.

## 2.3. Đặc điểm người dùng
- Khách hàng: dùng điện thoại là chính (mobile-first), cần đặt hàng nhanh, ít bước.
- Staff: thao tác liên tục trong ca, cần giao diện quản trị rõ trạng thái, nhận đơn mới ngay lập tức.
- Store Manager: cần báo cáo chi nhánh và công cụ quản lý ca/nhân viên.
- Admin: cần cái nhìn toàn chuỗi và cấu hình tập trung.

## 2.4. Ràng buộc thiết kế
- Frontend Customer: Next.js (App Router, TypeScript) — tối ưu SEO và tốc độ tải trang bán hàng. Frontend quản trị: React SPA (TypeScript, Vite) — Staff, Store Manager, Admin đăng nhập theo RBAC.
- Backend: Spring Boot, mỗi microservice là một ứng dụng độc lập, đóng gói Docker.
- Giao tiếp: REST API qua API Gateway; sự kiện bất đồng bộ qua Kafka.
- Mỗi microservice sở hữu database/schema riêng (dùng chung 1 instance PostgreSQL trên VPS để tiết kiệm tài nguyên trong môi trường đồ án).
- Redis dùng cho giỏ hàng, cache thực đơn, OTP và rate limiting.
- Triển khai: Docker Compose trên 1 VPS (khuyến nghị tối thiểu 4 vCPU / 8 GB RAM), Nginx làm reverse proxy, HTTPS bằng Let's Encrypt.
- Không sử dụng Kubernetes.

## 2.5. Giả định và phụ thuộc
- Hệ thống có kết nối tới dịch vụ đối soát thanh toán SePay hoặc Casso để nhận webhook biến động số dư ngân hàng. Nếu dịch vụ này gián đoạn, Admin/Manager xác nhận thanh toán thủ công bằng đối chiếu sao kê.
- Ảnh món ăn/banner do Admin tải lên, lưu qua Media/File storage của hệ thống.
- Địa chỉ giao hàng do khách tự nhập; hệ thống chưa dùng bản đồ/GPS trong MVP (tính phí ship theo khu vực/khoảng cách cấu hình sẵn).

---

# 3. YÊU CẦU CHỨC NĂNG

Quy ước: Mỗi yêu cầu có mã FR-<NHÓM>-<SỐ>, độ ưu tiên: Cao (MVP bắt buộc), Trung bình (MVP nên có), Phase 2.

## 3.1. Nhóm GUEST — Khách vãng lai
| Mã | Chức năng | Mô tả | Ưu tiên |
|---|---|---|---|
| FR-GST-01 | Xem trang chủ | Banner khuyến mãi, danh mục nổi bật, món bán chạy, combo nổi bật | Cao |
| FR-GST-02 | Xem thực đơn & tìm kiếm | Xem món theo danh mục, tìm theo tên, lọc theo giá/mức cay, sắp xếp | Cao |
| FR-GST-03 | Xem chi nhánh | Danh sách chi nhánh, giờ mở cửa, trạng thái hoạt động | Cao |
| FR-GST-04 | Xem đánh giá | Xem sao và bình luận công khai của món | Trung bình |
| FR-GST-05 | Giỏ hàng tạm | Thêm món vào giỏ (lưu phía client/Redis theo session), sửa số lượng | Cao |
| FR-GST-06 | Đăng ký / đăng nhập | Chuyển đổi thành CUSTOMER để đặt hàng, dùng voucher, tích điểm | Cao |

## 3.2. Nhóm CUSTOMER — Khách hàng
| Mã | Chức năng | Mô tả | Ưu tiên |
|---|---|---|---|
| FR-CUS-01 | Đăng ký tài khoản | Đăng ký bằng email + mật khẩu (xác thực OTP) hoặc đăng nhập Google qua Firebase Authentication — sau khi Google xác thực, user nhập mật khẩu để có thể đăng nhập cả hai cách; không yêu cầu SĐT ở bước đăng ký | Cao |
| FR-CUS-02 | Đăng nhập / đăng xuất | JWT access token + refresh token | Cao |
| FR-CUS-03 | Quên mật khẩu | Đặt lại mật khẩu qua OTP email | Cao |
| FR-CUS-04 | Hồ sơ & sổ địa chỉ | Sửa thông tin cá nhân, thêm/sửa/xóa địa chỉ, đặt địa chỉ mặc định | Cao |
| FR-CUS-05 | Xem thực đơn theo chi nhánh | Chọn chi nhánh phục vụ; menu hiển thị tình trạng còn/hết của chi nhánh đó | Cao |
| FR-CUS-06 | Chi tiết & tùy biến món | Chọn size/số miếng, topping/món phụ, mức cay, ghi chú; giá cập nhật theo tùy chọn | Cao |
| FR-CUS-07 | Combo | Mua combo cố định; tự ghép combo từ món lẻ, hệ thống tự tính giá combo | Cao |
| FR-CUS-08 | Giỏ hàng | Thêm/xóa/sửa món, giỏ được lưu trên Redis và đồng bộ khi đăng nhập | Cao |
| FR-CUS-09 | Món yêu thích | Lưu món/combo để đặt nhanh lần sau | Trung bình |
| FR-CUS-10 | Voucher | Xem voucher khả dụng, nhập mã, hệ thống kiểm tra điều kiện (đơn tối thiểu, hạn dùng, lượt dùng) | Cao |
| FR-CUS-11 | Tích điểm thành viên | Tích điểm theo giá trị đơn, xem hạng, lịch sử điểm, đổi điểm trừ tiền khi checkout | Cao |
| FR-CUS-12 | Checkout | Chọn địa chỉ, hình thức Giao tận nơi / Tự đến lấy, hẹn giờ, ghi chú đơn; xem tạm tính, phí ship, giảm giá, điểm dùng, tổng thanh toán | Cao |
| FR-CUS-13 | Thanh toán chuyển khoản (thật) | Hiển thị QR VietQR động đúng số tiền và nội dung = mã đơn; hệ thống tự chuyển trạng thái khi webhook SePay/Casso báo tiền về khớp mã đơn và số tiền. Không có nút xác nhận giả lập | Cao |
| FR-CUS-14 | Thanh toán COD | Chọn trả tiền mặt khi nhận; đơn đi qua đầy đủ luồng trạng thái | Cao |
| FR-CUS-15 | Theo dõi đơn hàng | Xem trạng thái đơn theo thời gian thực (polling/WebSocket): Chờ xác nhận → Đã xác nhận → Đang chế biến → Sẵn sàng/Đang giao → Hoàn thành; hoặc Đã hủy | Cao |
| FR-CUS-16 | Lịch sử & đặt lại đơn | Xem lịch sử, chi tiết hóa đơn, đặt lại nguyên đơn bằng 1 thao tác | Cao |
| FR-CUS-17 | Hủy đơn | Hủy khi đơn chưa vào trạng thái Đang chế biến, bắt buộc nhập lý do; đơn đã thanh toán chuyển khoản sẽ tạo yêu cầu hoàn tiền chờ Manager/Admin duyệt | Cao |
| FR-CUS-18 | Đánh giá & bình luận | Chấm sao, viết nhận xét cho món sau khi đơn Hoàn thành; sửa/xóa đánh giá của mình | Trung bình |
| FR-CUS-19 | Thông báo | Nhận thông báo trong web và email khi đơn đổi trạng thái, thanh toán thành công, có khuyến mãi mới | Cao |
| FR-CUS-20 | Đặt đơn lớn / tiệc | Gửi form liên hệ đặt số lượng lớn; chi nhánh/Admin tiếp nhận xử lý riêng | Trung bình |
| FR-CUS-21 | Chọn giao hàng (shipping) | Trong checkout: chọn địa chỉ giao, xem phí ship dự kiến và thời gian dự kiến. MVP: cơ chế và dữ liệu có sẵn nhưng chưa có shipper giao thật | Cao (thiết kế) |

## 3.3. Nhóm STAFF — Nhân viên chi nhánh
Phạm vi: chỉ dữ liệu của chi nhánh được gán (storeId gắn trong JWT, kiểm tra ở backend cho mọi API).

| Mã | Chức năng | Mô tả | Ưu tiên |
|---|---|---|---|
| FR-STF-01 | Đăng nhập nhân viên | Tài khoản do Manager/Admin cấp; xem lịch ca của mình | Cao |
| FR-STF-02 | Dashboard ca | Đơn hôm nay của quán, đơn đang chờ xử lý, tổng kết ca | Cao |
| FR-STF-03 | Tiếp nhận & xử lý đơn | Nhận thông báo đơn mới; xác nhận đơn; chuyển trạng thái Đang chế biến → Sẵn sàng → Hoàn thành | Cao |
| FR-STF-04 | Hủy / từ chối đơn tại quán | Hủy với lý do bắt buộc (hết món, quá tải...); đơn đã thanh toán chỉ được tạo yêu cầu hoàn tiền | Cao |
| FR-STF-05 | Xác nhận thu tiền tại quán | Đánh dấu đã thu COD; đối chiếu mã giao dịch chuyển khoản của đơn quán mình và báo sai lệch cho Manager | Cao |
| FR-STF-06 | Cập nhật tình trạng món trong ca | Bật/tắt còn/hết món tại chi nhánh trong ca; không sửa tên/giá/món gốc | Cao |
| FR-STF-07 | Cập nhật kho cơ bản | Cập nhật số lượng còn của quán, nhận cảnh báo sắp hết | Trung bình |
| FR-STF-08 | Xem thông tin khách trong đơn | Tên, SĐT, địa chỉ giao — chỉ trong phạm vi đơn của quán mình | Cao |
| FR-STF-09 | Phản hồi đánh giá | Xem và trả lời đánh giá của quán; không ẩn/xóa được đánh giá | Trung bình |
| FR-STF-10 | Tiếp nhận đơn tiệc tại quán | Xem form đặt tiệc của quán, cập nhật trạng thái đã liên hệ, chuyển Manager báo giá | Trung bình |

## 3.4. Nhóm STORE_MANAGER — Trưởng chi nhánh
Phạm vi: toàn quyền vận hành trong 1 chi nhánh, bao gồm mọi quyền STAFF của chi nhánh đó.

| Mã | Chức năng | Mô tả | Ưu tiên |
|---|---|---|---|
| FR-MGR-01 | Dashboard & báo cáo chi nhánh | Doanh thu ngày/tháng, số đơn, món bán chạy của quán; xuất báo cáo riêng của quán (Excel/PDF) | Cao |
| FR-MGR-02 | Quản lý nhân viên của quán | Tạo/khóa tài khoản Staff thuộc quán mình, gán ca, xếp lịch làm việc, duyệt bàn giao ca | Cao |
| FR-MGR-03 | Giám sát & can thiệp đơn | Xem mọi đơn của quán, can thiệp xử lý, duyệt hủy đơn | Cao |
| FR-MGR-04 | Duyệt hoàn tiền của quán | Duyệt yêu cầu hoàn tiền cho đơn chuyển khoản của quán; Admin có thể kiểm tra lại qua audit log | Cao |
| FR-MGR-05 | Quản lý kho chi nhánh | Nhập hàng, kiểm kê, duyệt cập nhật kho của Staff, cảnh báo tồn thấp | Cao |
| FR-MGR-06 | Cấu hình vận hành quán | Giờ mở cửa, tạm đóng/mở quán, thông tin liên hệ, khu vực giao hàng của quán | Cao |
| FR-MGR-07 | Quản lý menu tại quán | Tắt bán dài hạn một món tại quán; đề xuất sửa giá/món lên Admin duyệt | Trung bình |
| FR-MGR-08 | Đề xuất khuyến mãi của quán | Tạo đề xuất voucher/khuyến mãi riêng cho quán, Admin duyệt mới có hiệu lực | Trung bình |
| FR-MGR-09 | Xử lý đơn tiệc của quán | Báo giá, xác nhận và phân công Staff phụ trách đơn tiệc/đơn lớn | Trung bình |
| FR-MGR-10 | Quản lý đánh giá của quán | Ẩn đánh giá spam/vi phạm của quán (ghi audit log), xem thống kê đánh giá | Trung bình |
| FR-MGR-11 | Nhật ký nhân viên | Xem audit log thao tác của Staff thuộc quán mình | Trung bình |

## 3.5. Nhóm ADMIN — Quản trị viên / Chủ chuỗi
Phạm vi: toàn hệ thống, bao gồm mọi quyền STORE_MANAGER trên mọi chi nhánh.

| Mã | Chức năng | Mô tả | Ưu tiên |
|---|---|---|---|
| FR-ADM-01 | Dashboard toàn chuỗi | Doanh thu, số đơn, biểu đồ toàn hệ thống và theo từng chi nhánh | Cao |
| FR-ADM-02 | Quản lý chi nhánh | Tạo/sửa/đóng chi nhánh; tạo tài khoản và gán Store Manager cho từng quán | Cao |
| FR-ADM-03 | Quản lý dữ liệu gốc | CRUD danh mục, món ăn, combo, topping, giá áp dụng toàn chuỗi; upload ảnh món | Cao |
| FR-ADM-04 | Quản lý tài khoản hệ thống | Quản lý Admin/Manager/Staff/Customer; khóa/mở tài khoản; đặt lại mật khẩu | Cao |
| FR-ADM-05 | Quản lý đơn toàn hệ thống | Xem, can thiệp đơn của mọi quán; xử lý các trường hợp leo thang (escalation) | Cao |
| FR-ADM-06 | Quản lý thanh toán | Cấu hình tài khoản ngân hàng nhận tiền; đối chiếu giao dịch toàn hệ thống; xử lý hoàn tiền leo thang; xem lịch sử webhook | Cao |
| FR-ADM-07 | Quản lý voucher & khuyến mãi | Tạo mã giảm %/số tiền, điều kiện, giới hạn lượt, thời gian; duyệt đề xuất khuyến mãi của chi nhánh | Cao |
| FR-ADM-08 | Quản lý banner & nội dung | Banner trang chủ, chương trình nổi bật | Trung bình |
| FR-ADM-09 | Quản lý tích điểm | Cấu hình tỉ lệ tích điểm / quy đổi điểm, hạng thành viên | Cao |
| FR-ADM-10 | Quản lý khách hàng | Xem toàn bộ khách, lịch sử mua, khóa/mở tài khoản vi phạm | Cao |
| FR-ADM-11 | Quản lý đánh giá | Ẩn/xóa đánh giá vi phạm trên toàn hệ thống | Trung bình |
| FR-ADM-12 | Báo cáo & xuất file | Báo cáo doanh thu theo ngày/chi nhánh/món; xuất Excel/PDF | Cao |
| FR-ADM-13 | Cấu hình hệ thống | Phí ship theo khu vực, phương thức thanh toán, thông tin liên hệ, bật/tắt tính năng | Cao |
| FR-ADM-14 | Audit log toàn hệ thống | Tra cứu toàn bộ thao tác quan trọng (ai, việc gì, lúc nào, trên đối tượng nào) | Cao |

## 3.6. Nhóm SHIPPER — Nhân viên giao hàng (Phase 2)
| Mã | Chức năng | Mô tả | Ưu tiên |
|---|---|---|---|
| FR-SHP-01 | Nhận đơn được gán | Manager gán đơn; shipper xem chi tiết đơn, địa chỉ, SĐT khách | Phase 2 |
| FR-SHP-02 | Cập nhật trạng thái giao | Đã lấy hàng → Đang giao → Đã giao / Giao thất bại (kèm lý do) | Phase 2 |
| FR-SHP-03 | Xác nhận thu COD | Đánh dấu đã thu tiền mặt từ khách, đối chiếu cuối ca | Phase 2 |
| FR-SHP-04 | Lịch sử giao hàng | Xem lịch sử và tổng số đơn đã giao của mình | Phase 2 |

## 3.8. Mail Sender — gửi email transactional

Mail Sender nằm bên trong Notification Service, không tách thành microservice riêng. MVP dùng Gmail SMTP với App Password cấu hình qua biến môi trường:

- `MAIL_SENDER_ENABLED` — bật/tắt gửi email. Mặc định `false`.
- `MAIL_SENDER_HOST` — mặc định `smtp.gmail.com`.
- `MAIL_SENDER_PORT` — mặc định `587`.
- `MAIL_SENDER_USERNAME` — Gmail address gửi email.
- `MAIL_SENDER_APP_PASSWORD` — Gmail App Password, không phải mật khẩu Gmail thường.
- `MAIL_SENDER_FROM_NAME` — tên hiển thị người gửi.

Email transactional MVP gồm OTP đăng ký/quên mật khẩu, xác nhận đơn, thanh toán, đổi trạng thái đơn, hoàn tiền và khuyến mãi. App Password chỉ nằm trong `.env`/secret store; không ghi vào database, log hoặc Git. Gmail SMTP lỗi không được làm rollback nghiệp vụ chính; Notification Service ghi `email_logs` trạng thái `FAILED`, retry hữu hạn và phát cảnh báo. Đây không phải Gmail/IMAP client: Clucky không đọc inbox, không OAuth2 Gmail, không App Password của khách hàng.

## 3.7. Chức năng hệ thống (không gắn với một role)
| Mã | Chức năng | Mô tả | Ưu tiên |
|---|---|---|---|
| FR-SYS-01 | API Gateway & xác thực tập trung | Mọi request qua Gateway; kiểm tra JWT, role và storeId | Cao |
| FR-SYS-02 | Sự kiện Kafka | Phát/tiêu thụ các sự kiện: order.created, order.status-changed, payment.confirmed, payment.failed, promotion.applied, shipping.created | Cao |
| FR-SYS-03 | Redis | Giỏ hàng, cache menu, OTP, rate limiting, lưu trạng thái chờ thanh toán | Cao |
| FR-SYS-04 | Notification Service | Gửi thông báo in-app và email transactional qua Mail Sender (Gmail SMTP App Password) theo sự kiện Kafka; lưu lịch sử gửi, retry và lỗi | Cao |
| FR-SYS-05 | Upload & lưu trữ media | Ảnh món, combo, banner, avatar lưu trên Cloudinary; metadata URL/public_id lưu tại service sở hữu | Cao |
| FR-SYS-06 | Logging & audit | Log tập trung theo từng service; audit log nghiệp vụ cho thao tác quản trị | Cao |
| FR-SYS-07 | Sao lưu dữ liệu | Backup PostgreSQL định kỳ, có kịch bản khôi phục | Trung bình |

---

# 4. YÊU CẦU PHI CHỨC NĂNG (NFR)

| Mã | Nhóm | Yêu cầu |
|---|---|---|
| NFR-01 | Hiệu năng | API xem menu/checkout phản hồi < 500 ms ở điều kiện tải đồ án (cache Redis cho menu). Trang khách tải đầu tiên < 3 giây trên 4G |
| NFR-02 | Khả năng mở rộng | Mỗi microservice scale độc lập bằng cách tăng instance sau Gateway; Kafka tách luồng giao dịch khỏi thông báo/báo cáo |
| NFR-03 | Tính sẵn sàng | Hệ thống chạy bằng Docker Compose với restart policy; service lỗi được tự khởi động lại; thanh toán có cơ chế đối soát thủ công khi webhook lỗi |
| NFR-04 | Bảo mật | Mật khẩu băm BCrypt; JWT ngắn hạn + refresh token; Google login verify Firebase ID token bằng Firebase Admin SDK (chữ ký + `aud` + `iss` + `email_verified`); RBAC kiểm tra ở Gateway và từng service (@PreAuthorize); Staff/Manager bị ép phạm vi storeId ở backend; webhook thanh toán phải kiểm tra chữ ký/IP whitelist của SePay/Casso; chống SQL injection (JPA), XSS, CSRF theo chuẩn Spring Security |
| NFR-05 | Toàn vẹn giao dịch | Tạo đơn dùng mẫu Saga qua sự kiện Kafka + trạng thái thanh toán rõ ràng; không trừ điểm/trừ lượt voucher khi đơn chưa tạo thành công; idempotency key cho webhook thanh toán (một giao dịch ngân hàng chỉ xử lý một lần) |
| NFR-06 | Khả dụng (Usability) | Mobile-first, tiếng Việt toàn bộ giao diện, font Be Vietnam Pro dễ đọc; thao tác đặt hàng tối đa 4 bước chính |
| NFR-07 | Tương thích | Chạy trên Chrome/Edge/Firefox/Safari bản mới, responsive từ 360 px đến desktop |
| NFR-08 | Khả năng bảo trì | Mỗi service có README, OpenAPI/Swagger riêng; code theo chuẩn REST; log có correlation-id xuyên service |
| NFR-09 | Triển khai | Toàn bộ hệ thống dựng bằng 1 lệnh docker compose up -d trên VPS; cấu hình qua biến môi trường (.env), không hard-code secrets. Mail Sender dùng Gmail SMTP App Password từ env, không lưu trong DB/Git |
| NFR-10 | Sao lưu & phục hồi | Backup database hằng ngày, giữ tối thiểu 7 bản; có tài liệu khôi phục |
| NFR-12 | Media storage | File ảnh phải kiểm tra MIME/size, URL dùng HTTPS, upload lỗi không làm hỏng transaction nghiệp vụ; Cloudinary credentials chỉ ở backend. | Cao |
| NFR-11 | Email transactional | Mail Sender gửi qua Gmail SMTP bằng App Password; retry có giới hạn, idempotency theo message/event id, ghi email_logs; khi Gmail lỗi phải ghi FAILED và không làm rollback giao dịch chính |

---

# 5. LUỒNG NGHIỆP VỤ VÀ MÁY TRẠNG THÁI

## 5.1. Luồng đặt hàng và thanh toán chuyển khoản (luồng chính)
1. Khách chọn chi nhánh → chọn món/combo, tùy biến → thêm giỏ (Redis).
2. Checkout: chọn địa chỉ/hình thức nhận, nhập voucher, chọn dùng điểm.
3. Hệ thống (Cart & Order Service) kiểm tra tồn bán tại chi nhánh, Promotion Service tính giảm giá/điểm → tạo đơn trạng thái PENDING_PAYMENT (nếu chuyển khoản) hoặc CONFIRMED (nếu COD), phát sự kiện order.created.
4. Nếu chuyển khoản: Payment Service tạo QR VietQR (số tiền, nội dung = mã đơn), đơn chờ trong thời hạn cấu hình (ví dụ 15 phút).
5. Khách chuyển khoản thật → ngân hàng ghi có → SePay/Casso gọi webhook → Payment Service kiểm tra chữ ký, đối chiếu mã đơn + số tiền (idempotent) → cập nhật PAID, phát sự kiện payment.confirmed.
6. Order Service nhận payment.confirmed → chuyển đơn sang CONFIRMED; Notification Service lưu in-app notification và gửi email transactional qua Mail Sender/Gmail SMTP; Shipping Service tạo bản ghi giao hàng (MVP: trạng thái WAITING, chưa vận hành).
7. Staff chi nhánh xử lý: CONFIRMED → PREPARING → READY → (tự lấy: COMPLETED) / (giao hàng Phase 2: SHIPPING → COMPLETED).
8. Đơn COMPLETED: Promotion Service cộng điểm tích lũy; khách được mở chức năng đánh giá.
9. Trường hợp hết hạn thanh toán / tiền không khớp: đơn chuyển PAYMENT_EXPIRED hoặc PAYMENT_MISMATCH, thông báo cho khách và Manager/Admin xử lý đối chiếu thủ công.

Tham chiếu sơ đồ: Sequence_DatHang_ThanhToan.svg, State_TrangThaiDonHang.svg, Activity_XuLyDonHang.svg trong thư mục diagrams/.

## 5.2. Máy trạng thái đơn hàng (Order Status)
PENDING_PAYMENT → CONFIRMED → PREPARING → READY → SHIPPING → COMPLETED
Nhánh phụ: từ PENDING_PAYMENT/CONFIRMED có thể sang CANCELLED; từ CONFIRMED/PREPARING (chưa nấu) khách/Staff có thể yêu cầu hủy theo điều kiện tại FR-CUS-17 / FR-STF-04. Đơn chuyển khoản đã PAID mà bị hủy sẽ sinh yêu cầu hoàn tiền (Refund Request: PENDING → APPROVED/REJECTED → REFUNDED).

## 5.3. Máy trạng thái thanh toán (Payment Status)
UNPAID → PENDING (chờ chuyển khoản) → PAID / EXPIRED / MISMATCH; COD: UNPAID → COLLECTED (Staff xác nhận thu) ; hoàn tiền: PAID → REFUND_PENDING → REFUNDED.

## 5.4. Máy trạng thái giao hàng (Shipping Status — thiết kế trong MVP)
CREATED (WAITING) → ASSIGNED → PICKED_UP → SHIPPING → DELIVERED / FAILED. Trong MVP hệ thống chỉ tạo bản ghi CREATED và hiển thị thông tin dự kiến cho khách; các trạng thái sau kích hoạt ở Phase 2.

## 5.5. Quy tắc nghiệp vụ chính
- Giá đơn = tổng giá món theo tùy chọn − giảm voucher − điểm quy đổi + phí ship (nếu giao tận nơi).
- Một voucher chỉ áp dụng khi thỏa toàn bộ điều kiện; mỗi đơn tối đa 1 voucher + điểm.
- Món bị tắt bán tại chi nhánh thì không đặt được tại chi nhánh đó, nhưng vẫn đặt được ở chi nhánh khác còn bán.
- Staff/Manager chỉ thao tác được trên đơn thuộc chi nhánh mình (kiểm tra storeId phía server).
- Mọi thao tác hủy đơn, duyệt hoàn tiền, ẩn đánh giá, khóa tài khoản đều ghi audit log.

---

# 6. LỘ TRÌNH PHÁT TRIỂN

## 6.1. MVP (phiên bản đầu tiên)
- Đầy đủ các nhóm GUEST, CUSTOMER, STAFF, STORE_MANAGER, ADMIN theo Mục 3 (trừ FR-SHP).
- 8 microservice chính: Identity, Catalog & Store, Cart & Order, Payment, Promotion & Loyalty, Shipping, Notification (in-app + Mail Sender), Review & Report — cộng API Gateway là thành phần hạ tầng (không tính vào 8 service). Chi tiết tại 02_Kien_Truc_He_Thong.md.
- Shipping: dữ liệu, API, trạng thái và giao diện chọn giao hàng có sẵn; chưa gán shipper, chưa tracking thực tế.
- Thanh toán chuyển khoản thật qua VietQR + webhook SePay/Casso; COD.

## 6.2. Phase 2
- Kích hoạt Shipping Service đầy đủ: role SHIPPER, gán đơn, cập nhật trạng thái giao, đối chiếu COD của shipper.
- WebSocket đẩy trạng thái giao hàng theo thời gian thực cho khách.
- Mở rộng báo cáo nâng cao, gợi ý món (nếu có thời gian).

## 6.3. Tiêu chí chấp nhận (Acceptance Criteria) tiêu biểu
- Khách hoàn tất đặt hàng chuyển khoản và đơn tự chuyển CONFIRMED sau khi tiền về thật, không cần thao tác tay (trừ trường hợp mismatch).
- Staff của chi nhánh A đăng nhập không xem/không gọi được API đơn của chi nhánh B (trả 403).
- Manager xuất được báo cáo doanh thu đúng của quán mình và không xuất được của quán khác.
- Toàn bộ hệ thống khởi động bằng docker compose trên VPS sạch trong 1 lần chạy tài liệu triển khai.

---

# 7. PHỤ LỤC
- Ma trận phân quyền chi tiết: 05_Ma_Tran_Phan_Quyen.md / .xlsx.
- Danh sách API: 04_Dac_Ta_API.md.
- Sơ đồ: thư mục diagrams/ (Use Case tổng quát, kiến trúc microservice, deployment, ERD, sequence đặt hàng–thanh toán, state đơn hàng, activity xử lý đơn, luồng sự kiện Kafka).


## 3.9. Cloudinary — media storage

Clucky dùng Cloudinary cho ảnh món, combo, banner và avatar; không lưu binary trong PostgreSQL. Catalog & Store sở hữu metadata ảnh sản phẩm/combo, Promotion & Loyalty sở hữu metadata banner, Identity sở hữu avatar metadata. Backend phải validate MIME/type/size, tạo signed upload hoặc upload qua backend, lưu `secure_url` và `public_id`, xử lý thay/xóa asset cũ và không để lộ API secret.

Cấu hình qua environment/Config Server: `CLOUDINARY_ENABLED`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER`. API secret không log, không commit và không gửi xuống frontend.
