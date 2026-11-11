# Backlog Clucky

**Sizing hiện hành: 11/11/2026 · 127 task chính · 520 SP.** Đã rà toàn bộ phạm vi sau gộp, gồm 17 task trước đó chưa có điểm. SP khớp task detail và chỉ mục; không cộng điểm mã cũ.

## Quy ước SP

| SP | Phạm vi tương đối | Mốc so sánh |
| ---: | --- | --- |
| 1 | Thay đổi rất nhỏ, ít nhánh, contract rõ | Chưa có task hiện tại đủ nhỏ để dùng mức này |
| 2 | Đầu việc hẹp, tái dùng nền có sẵn | BE-13: OpenAPI; BE-59: Email DTO |
| 3 | Một luồng thông thường, có validation/quyền và nhánh lỗi | BE-18: profile/địa chỉ; KAFKA-05: tạo shipment |
| 5 | Nhiều nhánh hoặc tích hợp trên contract/nền đã bàn giao | BE-36: banner; BE-42: báo cáo/export |
| 8 | Phức tạp: transaction, concurrency, recovery hoặc nhiều thành phần | BE-25: tạo đơn; BE-30: webhook; BE-37: ledger; BE-72: media |

- Tính triển khai, tích hợp, validation/quyền và kiểm chứng thuộc task một lần. Không cộng lại nền/logic của task khác; không giảm điểm vì đã có code hoặc DONE.
- Task gộp có một estimate, gồm phần INT/TEST đã nhận. Điểm 8 không cho phép bỏ AC; phạm vi tăng thì chốt lại và chia đầu ra trước khi nhận sprint.
- Giữ PIC, sprint, dependency và User Story/AC của detail vừa cập nhật. Phase 2/hoãn giữ nguyên. SP không quy đổi thành giờ, remaining, capacity hoặc velocity đã đạt.
- Cột Sprint lấy từ kế hoạch trong detail; không ghi đè Sprint vận hành trên Lark. Trạng thái/ngày/giờ công trong bảng này vẫn là snapshot nguồn.
- **Đã đồng bộ Lark ngày 10/11/2026:** 124 task / 505 SP, title, dependency và một file detail mỗi task. Giữ 25 record ngoài repo / 58 SP; toàn SCRUM BOARD có 149 record / 563 SP. Giữ metadata vận hành của record đang có; metadata record khôi phục lấy từ bản sao lưu. Không chạy kiểm thử ứng dụng.
- **Cập nhật Lark ngày 11/11/2026:** thêm `BE-82`, `BE-83`, `UI-53` vào Sprint 3 cho Trần Nguyễn Hữu Khánh, mỗi task 5 SP; cả ba record ở trạng thái TO DO và đã gắn file detail cùng dependency. Không chạy kiểm thử ứng dụng.

[Task details](../tasks/README.md) · [Mã đã gộp](../tasks/README.md#ma-cu) · [Biên bản đồng bộ Lark 10/11](Lark_Backlog_Sync_2026-11-10.md)

## Tổng hợp theo sprint trong task detail

| Nhóm | Task | SP |
| --- | ---: | ---: |
| Sprint 1 | 63 | 208 |
| Sprint 2 | 17 | 102 |
| Sprint 3 | 28 | 136 |
| Chưa gán sprint | 19 | 74 |
| **Tổng** | **127** | **520** |

Các nhóm công việc dưới đây giữ thứ tự tra cứu cũ; cột Sprint mới là phân nhóm hiện hành trong repository.

## Nền tảng và giao diện

| ID | Task | PIC | Sprint | Trạng thái snapshot | Bắt đầu cũ | Deadline cũ | Phụ thuộc | SP | Giờ nguồn |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: |
| [BE-01](../tasks/BE-01.md) | Ánh xạ entity và repository Identity vào schema tài khoản, địa chỉ, phiên đăng nhập, OTP và lịch nhân sự | Trần Nguyễn Hữu Khánh | 1 | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-03, UI-06 | 3 | 6 |
| [BE-02](../tasks/BE-02.md) | Ánh xạ entity và repository Catalog vào schema cửa hàng, món, combo, tùy chọn và tồn kho theo chi nhánh | Nguyễn Duy Quang Nhật | 1 | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-03, UI-06 | 5 | 8 |
| [BE-03](../tasks/BE-03.md) | Ánh xạ entity và repository Order để lưu đơn hàng, chi tiết hóa đơn, lịch sử trạng thái và yêu cầu đặt tiệc | Trần Đức Anh | 1 | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-03, UI-06 | 3 | 6 |
| [BE-04](../tasks/BE-04.md) | Ánh xạ entity và repository Payment để lưu thanh toán, giao dịch ngân hàng và dữ liệu webhook phục vụ đối soát | Lê Phú Thịnh | 1 | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-03, UI-06 | 3 | 5 |
| [BE-05](../tasks/BE-05.md) | Ánh xạ entity và repository Promotion để lưu voucher, lịch sử sử dụng, số dư và biến động điểm thành viên | Cao Tất Thành | 1 | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | UI-03, UI-06 | 3 | 6 |
| [BE-06](../tasks/BE-06.md) | Ánh xạ entity và repository Shipping để lưu bản ghi giao hàng, cấu hình phí và lịch sử theo schema hiện có | Lê Phú Thịnh | 1 | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-03, UI-06 | 2 | 3 |
| [BE-07](../tasks/BE-07.md) | Ánh xạ entity và repository Notification | Cao Tất Thành | 1 | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | UI-03, UI-06 | 2 | 5 |
| [BE-08](../tasks/BE-08.md) | Ánh xạ entity và repository Review & Report | Mai Sơn Việt | 1 | TO DO | 30/10/2026 08:00 | 31/10/2026 23:59 | UI-03, UI-06 | 3 | 5 |
| [BE-09](../tasks/BE-09.md) | Xác thực JWT và kiểm tra vai trò, chủ sở hữu, cửa hàng tại Gateway và từng service nghiệp vụ | Trần Nguyễn Hữu Khánh | 1 | TO DO | 30/10/2026 08:00 | 31/10/2026 23:59 | BE-01 | 8 | 12 |
| [BE-10](../tasks/BE-10.md) | Chuẩn hóa response, phân trang và xử lý exception để các API trả mã lỗi thống nhất, không lộ lỗi nội bộ | Lê Phú Thịnh | 1 | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-03 | 3 | 5 |
| [KAFKA-01](../tasks/KAFKA-01.md) | Cấu hình topic, producer và consumer Kafka cho các service, thống nhất JSON event, group, serializer và cách xác nhận xử lý | Mai Sơn Việt | 1 | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-06 | 5 | 6 |
| [BE-12](../tasks/BE-12.md) | Cấu hình kết nối Redis, quy tắc đặt key và thời hạn lưu riêng cho giỏ hàng, menu cache, OTP và dữ liệu tạm | Mai Sơn Việt | 1 | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-06 | 2 | 3 |
| [BE-13](../tasks/BE-13.md) | Cấu hình OpenAPI và Swagger cho từng service, mô tả API và xác thực Bearer token theo môi trường | Lê Phú Thịnh | 1 | TO DO | 30/10/2026 08:00 | 31/10/2026 23:59 | UI-03 | 2 | 2 |
| [BE-15](../tasks/BE-15.md) | Cung cấp health/info an toàn và truyền correlation ID xuyên Gateway, service và sự kiện để truy vết request | Lê Phú Thịnh | 1 | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | BE-10 | 3 | 4 |
| [BE-20](../tasks/BE-20.md) | Công khai để tìm cửa hàng, duyệt menu, tìm kiếm và xem món hoặc combo với giá đúng chi nhánh | Nguyễn Duy Quang Nhật | 1 | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | BE-02, BE-10 | 5 | 10 |
| [BE-23](../tasks/BE-23.md) | Giỏ hàng Redis cho khách vãng lai và Customer, hỗ trợ thêm, sửa, xóa món mà không trộn dữ liệu chủ sở hữu | Trần Đức Anh | 1 | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | BE-03, BE-12 | 5 | 8 |
| [BE-50](../tasks/BE-50.md) | Định nghĩa DTO và contract Payment cho khởi tạo thanh toán, QR, trạng thái, số tiền, thời hạn và xử lý lỗi | Lê Phú Thịnh | 1 | TO DO | 30/10/2026 08:00 | 31/10/2026 23:59 | BE-04 | 3 | 3 |
| [BE-51](../tasks/BE-51.md) | Định nghĩa contract Order–Promotion để kiểm tra voucher, điểm và trả kết quả giảm giá cùng mã lỗi thống nhất | Cao Tất Thành | 1 | TO DO | 01/11/2026 08:00 | 01/11/2026 23:59 | BE-05 | 3 | 4 |
| [BE-52](../tasks/BE-52.md) | Định nghĩa DTO và khung API thông báo, thống nhất phân trang, trạng thái đã đọc và đích điều hướng cho hai ứng dụng | Mai Sơn Việt | 1 | TO DO | 30/10/2026 08:00 | 31/10/2026 23:59 | UI-03 | 2 | 3 |
| [BE-57](../tasks/BE-57.md) | Cấu hình Mail Sender qua Config Server và biến môi trường, kiểm tra cấu hình và bảo vệ Gmail App Password | Cao Tất Thành | 3 | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | UI-03 | 2 | 4 |
| [BE-59](../tasks/BE-59.md) | Định nghĩa và kiểm tra email command gồm người nhận, mẫu, biến nội dung và ID phục vụ truy vết, chống xử lý trùng | Cao Tất Thành | 3 | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | UI-03 | 2 | 3 |
| [BE-68](../tasks/BE-68.md) | Cấu hình Cloudinary qua Config Server và biến môi trường cho các service, không đưa API secret ra frontend | Nguyễn Duy Quang Nhật | 1 | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-03 | 2 | 3 |
| [UI-01](../tasks/UI-01.md) | Layout Next.js cho Customer với header, footer, hero và điều hướng responsive theo nhận diện Clucky | Trần Nguyễn Hữu Khánh | 1 | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 6 |
| [UI-02](../tasks/UI-02.md) | Layout React cho nhân sự với sidebar, header, menu theo vai trò và điều hướng khi chưa đăng nhập hoặc thiếu quyền | Nguyễn Duy Quang Nhật | 1 | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 6 |
| [UI-03](../tasks/UI-03.md) | Thiết lập Config Server và config-repo để các service tải cấu hình chung, riêng và theo môi trường từ một nguồn | Trần Nguyễn Hữu Khánh | 1 | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 3 |
| [UI-04](../tasks/UI-04.md) | Thiết lập Eureka Server và cấu hình client để Gateway, các service đăng ký và tìm đúng địa chỉ kết nối | Nguyễn Duy Quang Nhật | 1 | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 2 | 2 |
| [UI-05](../tasks/UI-05.md) | Thiết lập API Gateway, ánh xạ route qua Eureka và tích hợp xác thực để hai frontend gọi backend qua một đầu vào | Trần Đức Anh | 1 | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 3 |
| [UI-06](../tasks/UI-06.md) | Docker Compose cho PostgreSQL, Redis và Kafka, có healthcheck, kết nối host/container và lưu dữ liệu an toàn | Mai Sơn Việt | 1 | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 5 | 6 |
| [UI-07](../tasks/UI-07.md) | Bộ Button, Card, Input, Badge và Modal dùng chung cho Customer, thống nhất trạng thái và thao tác bàn phím | Trần Nguyễn Hữu Khánh | 1 | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 6 |
| [UI-08](../tasks/UI-08.md) | Bộ Table, Badge, Form, Modal và Drawer dùng chung cho nhân sự, thống nhất loading, lỗi và thao tác xác nhận | Nguyễn Duy Quang Nhật | 1 | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 5 | 8 |
| [UI-09](../tasks/UI-09.md) | Đăng nhập, đăng ký Customer, xác thực OTP, quên hoặc đặt lại mật khẩu cho đúng luồng của hai ứng dụng | Trần Nguyễn Hữu Khánh | 1 | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 5 | 10 |
| [UI-10](../tasks/UI-10.md) | Trang chủ Customer hiển thị banner, danh mục và món nổi bật từ dữ liệu, điều hướng đến đúng menu hoặc chi tiết món | Nguyễn Duy Quang Nhật | 1 | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 4 |
| [UI-11](../tasks/UI-11.md) | Trang menu theo quán, hỗ trợ danh mục, tìm kiếm, bộ lọc và đồng bộ lựa chọn với URL | Nguyễn Duy Quang Nhật | 1 | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 6 |
| [UI-12](../tasks/UI-12.md) | Trang chi tiết món, cho chọn tùy chọn, topping, số lượng, xem tạm tính và đánh giá trước khi thêm vào giỏ | Nguyễn Duy Quang Nhật | 1 | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 5 | 8 |
| [UI-13](../tasks/UI-13.md) | Trang chọn chi nhánh, hiển thị địa chỉ, giờ mở và trạng thái nhận đơn rồi chuyển tới menu đúng quán | Nguyễn Duy Quang Nhật | 1 | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 2 | 3 |
| [UI-14](../tasks/UI-14.md) | Dashboard nhân sự với thẻ thống kê, biểu đồ và bộ lọc, hiển thị số liệu backend đúng phạm vi vai trò | Mai Sơn Việt | 1 | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 3 |
| [UI-15](../tasks/UI-15.md) | Quản lý tài khoản nhân sự, hỗ trợ tìm kiếm, tạo, khóa hoặc mở tài khoản và gán quán đúng quyền | Trần Nguyễn Hữu Khánh | 1 | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 5 |
| [UI-16](../tasks/UI-16.md) | Quản lý đánh giá để nhân sự xem, phản hồi hoặc ẩn nội dung trong phạm vi được phép | Mai Sơn Việt | 1 | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 4 |
| [UI-17](../tasks/UI-17.md) | Trang giỏ hàng, hỗ trợ sửa số lượng, ghi chú, xóa món và cập nhật tổng tạm tính trước checkout | Trần Đức Anh | 1 | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 5 |
| [UI-18](../tasks/UI-18.md) | Checkout để chọn nhận hàng, áp dụng voucher hoặc điểm, xem chi tiết tiền và gửi yêu cầu tạo đơn | Trần Đức Anh | 1 | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 5 | 8 |
| [UI-19](../tasks/UI-19.md) | Trang theo dõi đơn, tự cập nhật trạng thái bằng polling và hiển thị QR, thanh toán, thông tin giao hàng theo backend | Trần Đức Anh | 1 | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 5 |
| [UI-20](../tasks/UI-20.md) | Lịch sử, chi tiết đơn và hóa đơn, hỗ trợ đặt lại món theo giá, trạng thái bán hiện hành | Trần Đức Anh | 1 | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 6 |
| [UI-21](../tasks/UI-21.md) | Màn hồ sơ Customer, sổ địa chỉ và đổi mật khẩu với kiểm tra dữ liệu và phản hồi lỗi không làm mất form | Trần Nguyễn Hữu Khánh | 1 | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 8 |
| [UI-22](../tasks/UI-22.md) | Trang ưu đãi để Customer xem voucher khả dụng, điểm và hạng thành viên trước khi đặt hàng | Cao Tất Thành | 1 | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | — | 3 | 5 |
| [UI-23](../tasks/UI-23.md) | Form gửi yêu cầu đặt tiệc, thu thông tin liên hệ và nhu cầu, không hiển thị như đơn đã được xác nhận thanh toán | Trần Đức Anh | 1 | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 2 | 3 |
| [UI-24](../tasks/UI-24.md) | Quản lý đơn cho nhân sự, hỗ trợ lọc, xem chi tiết, đổi trạng thái và duyệt hoặc từ chối hoàn tiền | Trần Đức Anh | 1 | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 5 | 8 |
| [UI-25](../tasks/UI-25.md) | Form quản lý món, combo, tùy chọn và topping, hỗ trợ upload ảnh và giữ dữ liệu khi lưu lỗi | Nguyễn Duy Quang Nhật | 1 | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 5 | 10 |
| [UI-26](../tasks/UI-26.md) | Quản lý chi nhánh, hỗ trợ danh sách, thêm, sửa, xóa, giờ mở và khu vực giao theo quyền | Nguyễn Duy Quang Nhật | 1 | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 6 |
| [UI-27](../tasks/UI-27.md) | Màn thanh toán để tra cứu giao dịch, webhook log, xác nhận thủ công và cấu hình ngân hàng theo quyền | Lê Phú Thịnh | 1 | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 5 | 8 |
| [UI-28](../tasks/UI-28.md) | Quản lý voucher thường; giữ phần đề xuất chi nhánh và banner ở trạng thái backlog, chưa triển khai nghiệp vụ | Cao Tất Thành | 1 | TO DO | 30/10/2026 08:00 | 31/10/2026 23:59 | — | 3 | 8 |
| [UI-29](../tasks/UI-29.md) | Báo cáo, cho chọn kỳ, cửa hàng, xem biểu đồ và xuất Excel hoặc PDF đúng quyền | Mai Sơn Việt | 1 | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 6 |
| [UI-30](../tasks/UI-30.md) | Màn đơn hàng tại quán để Staff xem đơn hôm nay, chuyển trạng thái hợp lệ và xác nhận đã thu COD | Trần Đức Anh | 1 | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 5 |
| [UI-31](../tasks/UI-31.md) | Màn tồn kho tại quán, hiển thị cảnh báo sắp hết và cho nhân sự cập nhật tồn hoặc trạng thái bán | Nguyễn Duy Quang Nhật | 1 | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 4 |
| [UI-32](../tasks/UI-32.md) | Danh sách thông báo trên hai ứng dụng, hiển thị chưa đọc, mở nội dung và đánh dấu đã đọc | Cao Tất Thành | 1 | TO DO | 30/10/2026 08:00 | 31/10/2026 23:59 | — | 3 | 5 |
| [UI-34](../tasks/UI-34.md) | Rà soát và sửa lỗi giao diện hai frontend về thương hiệu, responsive, khả năng tiếp cận và trạng thái dữ liệu, bàn giao kết quả kiểm chứng | Trần Nguyễn Hữu Khánh | 1 | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | — | 5 | 14 |
| [UI-39](../tasks/UI-39.md) | Viết Dockerfile cho Next.js và React để build image production và chạy độc lập với cấu hình môi trường phù hợp | Mai Sơn Việt | 1 | DONE | 28/10/2026 08:00 | 28/10/2026 23:59 | — | 3 | 4 |
| [UI-40](../tasks/UI-40.md) | Kiểm tra Dockerfile và build image các module backend, xác nhận cách cấu hình và khởi chạy container độc lập | Mai Sơn Việt | 1 | DONE | 28/10/2026 08:00 | 28/10/2026 23:59 | — | 3 | 8 |
| [UI-41](../tasks/UI-41.md) | Thiết lập CI frontend để chạy lint, kiểm thử và build trên pull request, báo lỗi rõ khi một bước không đạt | Mai Sơn Việt | 1 | DONE | 28/10/2026 08:00 | 28/10/2026 23:59 | — | 3 | 4 |
| [UI-43](../tasks/UI-43.md) | Component dùng chung cho giỏ và đơn hàng, gồm số lượng trên giỏ, nhãn trạng thái và thẻ thông tin đơn | Trần Đức Anh | 1 | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 2 | 3 |
| [UI-44](../tasks/UI-44.md) | Component QR, trạng thái thanh toán, phí giao và shipment, tích hợp hiển thị theo dữ liệu backend trong phạm vi MVP | Lê Phú Thịnh | 1 | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 3 |
| [UI-45](../tasks/UI-45.md) | Component dùng chung cho nhãn voucher, hạng thành viên và mục thông báo, hiển thị trạng thái nhất quán giữa các màn | Cao Tất Thành | 1 | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | — | 2 | 3 |
| [UI-46](../tasks/UI-46.md) | Sửa responsive và thao tác bàn phím trên giỏ hàng, checkout, lịch sử, chi tiết đơn và màn đơn hàng của nhân sự | Trần Đức Anh | 1 | DONE | 28/10/2026 08:00 | 28/10/2026 23:59 | — | 3 | 4 |
| [UI-47](../tasks/UI-47.md) | Sửa responsive và khả năng tiếp cận của QR, màn quản lý thanh toán và thông tin giao hàng, không che nội dung hoặc nút thao tác | Lê Phú Thịnh | 1 | DONE | 28/10/2026 08:00 | 28/10/2026 23:59 | — | 3 | 4 |
| [UI-48](../tasks/UI-48.md) | Sửa responsive và thao tác bàn phím trên voucher, điểm thành viên và thông báo | Cao Tất Thành | 1 | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | — | 2 | 4 |
| [UI-49](../tasks/UI-49.md) | Và nối luồng đăng nhập Google cho Customer, yêu cầu tài khoản mới nhập mật khẩu trước khi hoàn tất đăng nhập | Lê Phú Thịnh | 1 | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 6 |

## Nghiệp vụ và tích hợp

| ID | Task | PIC | Sprint | Trạng thái snapshot | Bắt đầu cũ | Deadline cũ | Phụ thuộc | SP | Giờ nguồn |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: |
| [BE-17](../tasks/BE-17.md) | Xác thực tài khoản: đăng ký và OTP, đăng nhập, làm mới phiên, đăng xuất và đặt lại mật khẩu trên hai ứng dụng | Trần Nguyễn Hữu Khánh | 2 | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-01, BE-09, BE-60, BE-59 | 8 | 28 |
| [BE-18](../tasks/BE-18.md) | Xem, sửa hồ sơ và quản lý sổ địa chỉ, bảo đảm mỗi khách chỉ có một địa chỉ mặc định | Trần Nguyễn Hữu Khánh | 3 | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-01, BE-09 | 3 | 8 |
| [BE-19](../tasks/BE-19.md) | Tạo, khóa nhân viên, gán cửa hàng cho Admin và xếp ca cho Manager đúng phạm vi quản lý | Trần Nguyễn Hữu Khánh | 3 | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-01, BE-09 | 5 | 12 |
| [BE-21](../tasks/BE-21.md) | Quản lý cửa hàng, danh mục, món, combo và tùy chọn, kiểm tra quyền và lưu dữ liệu nhất quán | Nguyễn Duy Quang Nhật | 2 | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-02, BE-09, BE-10 | 8 | 24 |
| [BE-22](../tasks/BE-22.md) | Cập nhật tồn kho, bật hoặc tắt bán món theo chi nhánh và phản ánh thay đổi lên menu | Nguyễn Duy Quang Nhật | 2 | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-21 | 5 | 8 |
| [BE-24](../tasks/BE-24.md) | Xem trước đơn hàng, tính giá món, voucher, điểm và phí giao từ backend mà chưa tạo đơn hoặc thanh toán | Trần Đức Anh | 2 | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-23, BE-34, BE-33, BE-37 | 5 | 12 |
| [BE-25](../tasks/BE-25.md) | Tạo đơn từ checkout, chốt giá và trạng thái bán, khởi tạo thanh toán và chống tạo trùng khi gửi lại | Trần Đức Anh | 2 | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-24, BE-20, BE-29, BE-09 | 8 | 20 |
| [BE-26](../tasks/BE-26.md) | Hủy hoặc từ chối đơn đúng quyền, đúng trạng thái và tạo yêu cầu hoàn tiền cho đơn đã chuyển khoản | Trần Đức Anh | 2 | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-25 | 5 | 8 |
| [BE-27](../tasks/BE-27.md) | Lịch sử, chi tiết và đặt lại đơn, lọc theo chủ sở hữu hoặc cửa hàng và dùng giá hiện hành khi đặt lại | Trần Đức Anh | 2 | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-25 | 5 | 12 |
| [BE-29](../tasks/BE-29.md) | Cung cấp luồng QR chuyển khoản, thời hạn và tra cứu trạng thái thanh toán | Lê Phú Thịnh | 3 | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-04, BE-50, BE-09, BE-13 | 5 | 18 |
| [BE-30](../tasks/BE-30.md) | Tiếp nhận webhook SePay, xác thực API Key và đối chiếu mã đơn, số tiền để ghi nhận thanh toán đúng một lần | Lê Phú Thịnh | 3 | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-29 | 8 | 14 |
| [BE-32](../tasks/BE-32.md) | Quản lý thanh toán: tra cứu và đối soát giao dịch, xác nhận chuyển khoản hoặc COD, duyệt hoàn tiền và cấu hình ngân hàng | Lê Phú Thịnh | 3 | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-04, BE-09, BE-30, BE-26 | 8 | 32 |
| [BE-33](../tasks/BE-33.md) | Phí giao cố định toàn chuỗi, bán kính từng quán, nhận tại quán và API đọc shipment MVP | Lê Phú Thịnh | 3 | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-06 | 3 | 12 |
| [BE-34](../tasks/BE-34.md) | Quản lý và áp dụng voucher toàn chuỗi hoặc từng quán, kiểm tra điều kiện và trả số tiền giảm hợp lệ | Cao Tất Thành | 3 | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-05, BE-51 | 8 | 12 |
| [BE-37](../tasks/BE-37.md) | Điểm và hạng thành viên, cấu hình tích hoặc đổi điểm và lưu biến động số dư không bị cộng, trừ lặp | Cao Tất Thành | 3 | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-05, BE-51 | 8 | 14 |
| [BE-38](../tasks/BE-38.md) | Danh sách thông báo, đánh dấu từng mục hoặc tất cả đã đọc và nối với giao diện đúng người nhận | Cao Tất Thành | 2 | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-07, BE-52, BE-09 | 3 | 6 |
| [KAFKA-12](../tasks/KAFKA-12.md) | Xử lý sự kiện Order, Payment để tạo thông báo và yêu cầu gửi email đúng người, chống trùng và không rollback nghiệp vụ khi email lỗi | Cao Tất Thành | 2 | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | KAFKA-01, BE-38, BE-62, KAFKA-02, KAFKA-03 | 5 | 12 |
| [BE-40](../tasks/BE-40.md) | Đánh giá món đã mua: khách tạo, sửa, xóa; nhân sự phản hồi hoặc ẩn nội dung đúng quyền và cửa hàng | Mai Sơn Việt | 3 | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-08, BE-09, BE-25 | 5 | 12 |
| [BE-42](../tasks/BE-42.md) | Cung cấp dashboard và báo cáo doanh thu theo quyền, hỗ trợ lọc kỳ, cửa hàng và xuất Excel hoặc PDF khớp số liệu | Mai Sơn Việt | 3 | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-08, BE-09, KAFKA-07 | 5 | 20 |
| [BE-43](../tasks/BE-43.md) | Audit Service độc lập, sở hữu bảng audit_logs và cung cấp API tra cứu nhật ký quản trị theo quyền | Mai Sơn Việt | 2 | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | UI-03, UI-06, BE-09, BE-10 | 5 | 8 |
| [BE-54](../tasks/BE-54.md) | Kết nối menu qua Gateway và triển khai cache theo quán, làm mới dữ liệu khi giá hoặc trạng thái bán thay đổi | Nguyễn Duy Quang Nhật | 2 | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-20, BE-22, BE-12 | 5 | 8 |
| [BE-60](../tasks/BE-60.md) | Gửi email nghiệp vụ qua Gmail SMTP: kiểm tra đầu vào, render mẫu OTP, đơn hàng, thanh toán và hoàn tiền, trả rõ kết quả gửi | Cao Tất Thành | 3 | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-57, BE-59 | 5 | 23 |
| [BE-62](../tasks/BE-62.md) | Quản lý vòng đời gửi email: lưu trạng thái, chống job trùng, phục hồi worker và gửi lại có giới hạn trước khi chuyển FAILED | Cao Tất Thành | 3 | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-07, BE-59, BE-60 | 8 | 18 |
| [BE-63](../tasks/BE-63.md) | Vận hành email: ghi nhận failure/DLQ bền vững, truy vết các lần gửi và cung cấp API tra cứu log đúng quyền | Mai Sơn Việt | 3 | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-62, BE-09, KAFKA-01, BE-15 | 5 | 16 |
| [BE-72](../tasks/BE-72.md) | Upload và thay ảnh món, combo từ giao diện đến Cloudinary: kiểm tra file, lưu metadata, xử lý lỗi và dọn ảnh an toàn | Nguyễn Duy Quang Nhật | 2 | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-21, BE-68, BE-09 | 8 | 40 |
| [BE-75](../tasks/BE-75.md) | Chuẩn hóa DTO metadata ảnh và loại credential, payload nhạy cảm khỏi response, log và bundle frontend | Lê Phú Thịnh | 3 | TO DO | 02/11/2026 08:00 | 04/11/2026 23:59 | BE-10 | 3 | 4 |
| [BE-76](../tasks/BE-76.md) | Đăng nhập Google qua Firebase, xác minh ID token, yêu cầu tài khoản mới hoàn tất mật khẩu và phát JWT Clucky | Lê Phú Thịnh | 2 | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-01, BE-09, BE-17, BE-12 | 8 | 20 |
| [DEP-09](../tasks/DEP-09.md) | Tổng hợp Postman collection từ từng service, cấu hình gọi qua Gateway và bàn giao request mẫu cho luồng chính cùng trường hợp lỗi | Mai Sơn Việt | 3 | TO DO | 04/11/2026 08:00 | 05/11/2026 23:59 | BE-09, BE-17, UI-05, BE-54, BE-20, BE-25, BE-23, BE-24, UI-17, UI-18, BE-29, BE-30, BE-32, UI-19, UI-30, UI-44, BE-38, UI-32, BE-42, UI-14, UI-29 | 3 | 6 |
| [DEP-10](../tasks/DEP-10.md) | Chuẩn bị kịch bản demo, ảnh minh chứng và slide Sprint Review, phân biệt rõ chức năng đã nghiệm thu với phần còn hạn chế | Trần Nguyễn Hữu Khánh | 3 | TO DO | 04/11/2026 08:00 | 05/11/2026 23:59 | BE-25, BE-17, BE-20, BE-23, BE-24, BE-32, UI-09, UI-11, UI-17, UI-18, UI-30, BE-19, BE-42, UI-15, UI-29, BE-21, BE-34, UI-25, UI-26, UI-28, BE-09, BE-22, BE-26, BE-27, BE-33, BE-40, BE-43, BE-63, BE-72 | 2 | 8 |
| [KAFKA-02](../tasks/KAFKA-02.md) | Phát sự kiện tạo, đổi trạng thái, hoàn tất và hủy đơn sau khi Order commit, giữ eventId và correlationId khi gửi lại | Trần Đức Anh | 2 | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-25, KAFKA-01 | 5 | 6 |
| [KAFKA-03](../tasks/KAFKA-03.md) | Phát sự kiện xác nhận hoặc thất bại thanh toán và dữ liệu hết hạn, sai lệch, hoàn tiền theo contract cho các service nhận | Lê Phú Thịnh | 3 | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-30, BE-32, KAFKA-01 | 5 | 6 |
| [KAFKA-05](../tasks/KAFKA-05.md) | Xử lý order.created để tạo một shipment CREATED cho mỗi đơn DELIVERY, không tạo trùng khi Kafka gửi lại | Lê Phú Thịnh | 3 | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | KAFKA-02, BE-06 | 3 | 4 |
| [KAFKA-06](../tasks/KAFKA-06.md) | Xử lý sự kiện order.completed để cộng điểm cho đúng khách, lưu biến động điểm và không cộng lại khi nhận sự kiện trùng | Cao Tất Thành | 2 | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | KAFKA-02, BE-37 | 3 | 6 |
| [KAFKA-07](../tasks/KAFKA-07.md) | Xử lý sự kiện Order và Payment để cập nhật thống kê từng quán theo ngày, không cộng doanh thu hai lần khi nhận lại sự kiện | Mai Sơn Việt | 2 | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | KAFKA-02, KAFKA-03, BE-08 | 8 | 8 |
| [KAFKA-08](../tasks/KAFKA-08.md) | Retry, DLQ và xử lý sự kiện không lặp hiệu ứng cho Kafka consumer, hỗ trợ phát lại có kiểm soát khi khôi phục lỗi | Mai Sơn Việt | 3 | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | KAFKA-01 | 8 | 10 |
| [KAFKA-09](../tasks/KAFKA-09.md) | Xử lý payment.failed để hủy đơn và giải phóng voucher, điểm đã giữ, bảo đảm các bước bù trừ không thực hiện trùng | Trần Đức Anh | 2 | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | KAFKA-03, BE-26, BE-34, BE-37 | 8 | 12 |
| [KAFKA-10](../tasks/KAFKA-10.md) | Phát sự kiện cho mọi thay đổi quản trị đã commit và ghi tập trung vào Audit Service, chống trùng và loại dữ liệu nhạy cảm | Mai Sơn Việt | 3 | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | KAFKA-01, BE-43 | 8 | 6 |


## Triển khai và phạm vi bổ sung

| ID | Task | PIC | Sprint | Trạng thái snapshot | Bắt đầu cũ | Deadline cũ | Phụ thuộc | SP | Giờ nguồn |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: |
| [BE-28](../tasks/BE-28.md) | Gửi và tiếp nhận yêu cầu đặt tiệc, phân quyền xử lý mà không tự coi yêu cầu là đơn đã duyệt hoặc thanh toán | Trần Đức Anh | BACKLOG | TO DO | Chưa xếp | Chưa xếp | BE-03, BE-09 | 5 | 8 |
| [BE-31](../tasks/BE-31.md) | Tích hợp webhook Casso khi được chọn sử dụng, xác thực giao dịch và đối soát thanh toán mà không ghi nhận trùng | Lê Phú Thịnh | BACKLOG | TO DO | Chưa xếp | Chưa xếp | BE-29 | 8 | 12 |
| [BE-35](../tasks/BE-35.md) | Luồng Manager đề xuất voucher cho quán và Admin phê duyệt trước khi voucher được dùng tại checkout | Cao Tất Thành | BACKLOG | TO DO | Chưa xếp | Chưa xếp | BE-34 | 5 | 8 |
| [BE-36](../tasks/BE-36.md) | Quản lý banner và upload ảnh Cloudinary | Cao Tất Thành | 3 | TO DO | Chưa xếp | Chưa xếp | BE-05, BE-72 | 5 | 12 |
| [BE-47](../tasks/BE-47.md) | Gán shipper, cập nhật trạng thái và lưu lịch sử giao hàng sau CREATED khi Phase 2 được duyệt | Lê Phú Thịnh | BACKLOG | TO DO | Chưa xếp | Chưa xếp | BE-33 | 8 | 16 |
| [DEP-01](../tasks/DEP-01.md) | Chuẩn bị VPS với Docker, Compose và cấu hình cổng mạng, chỉ công khai dịch vụ cần thiết để triển khai hệ thống | Mai Sơn Việt | BACKLOG | TO DO | Chưa xếp | Chưa xếp | UI-06 | 3 | 4 |
| [DEP-02](../tasks/DEP-02.md) | Toàn bộ hệ thống bằng Docker Compose, nạp đúng cấu hình và khởi động theo thứ tự phụ thuộc của các dịch vụ | Mai Sơn Việt | BACKLOG | TO DO | Chưa xếp | Chưa xếp | DEP-01 | 5 | 6 |
| [DEP-03](../tasks/DEP-03.md) | Cấu hình Nginx reverse proxy và HTTPS Let's Encrypt để truy cập hai frontend, API qua đúng tên miền và đường dẫn | Mai Sơn Việt | BACKLOG | TO DO | Chưa xếp | Chưa xếp | DEP-02 | 3 | 4 |
| [DEP-04](../tasks/DEP-04.md) | Cấu hình tên miền, CORS và trusted origins để chỉ hai frontend được phép gọi API với thông tin xác thực | Mai Sơn Việt | BACKLOG | TO DO | Chưa xếp | Chưa xếp | DEP-03 | 2 | 3 |
| [DEP-05](../tasks/DEP-05.md) | Cấu hình và xác minh healthcheck, readiness của từng container cùng dependency, không chỉ kiểm tra tiến trình đang chạy | Mai Sơn Việt | BACKLOG | TO DO | Chưa xếp | Chưa xếp | DEP-02 | 3 | 3 |
| [DEP-06](../tasks/DEP-06.md) | Xác minh bản triển khai trên VPS bằng luồng đăng nhập, duyệt menu, tạo đơn COD và chuyển khoản trong phạm vi được phép | Mai Sơn Việt | BACKLOG | TO DO | Chưa xếp | Chưa xếp | DEP-04, DEP-05, BE-25, BE-17, BE-20, BE-23, BE-24, BE-32, UI-09, UI-11, UI-17, UI-18, UI-30, BE-29, BE-30, UI-19, UI-44 | 5 | 6 |
| [DEP-07](../tasks/DEP-07.md) | Thiết lập sao lưu database hằng ngày, giữ bảy bản và thực hiện khôi phục thử để xác nhận bản sao lưu sử dụng được | Mai Sơn Việt | BACKLOG | TO DO | Chưa xếp | Chưa xếp | DEP-02 | 5 | 6 |
| [DEP-08](../tasks/DEP-08.md) | README hướng dẫn cài đặt, cấu hình và chạy dự án, kèm kiến trúc và tài liệu API đúng bản bàn giao | Mai Sơn Việt | BACKLOG | TO DO | Chưa xếp | Chưa xếp | DEP-06, DEP-09 | 3 | 6 |
| [DEP-11](../tasks/DEP-11.md) | Rà soát phạm vi phát hành, lỗi còn mở và khả năng rollback, sau đó gắn tag cho đúng phiên bản được duyệt | Mai Sơn Việt | BACKLOG | TO DO | Chưa xếp | Chưa xếp | DEP-06, DEP-07, DEP-08, DEP-10 | 2 | 4 |
| [DEP-12](../tasks/DEP-12.md) | Bàn giao cấu hình môi trường, quyền truy cập và quy trình rollback cho người vận hành qua kênh an toàn, không lộ secret | Mai Sơn Việt | BACKLOG | TO DO | Chưa xếp | Chưa xếp | DEP-11 | 3 | 6 |
| [DEP-20](../tasks/DEP-20.md) | Xác minh gửi email an toàn trên production và bảo đảm email_logs được sao lưu, khôi phục cùng database | Mai Sơn Việt | BACKLOG | TO DO | Chưa xếp | Chưa xếp | DEP-06, BE-60 | 3 | 4 |
| [DEP-22](../tasks/DEP-22.md) | Xác minh upload, đọc ảnh và sao lưu metadata trên production, bảo đảm cleanup không xóa asset vẫn đang được sử dụng | Mai Sơn Việt | BACKLOG | TO DO | Chưa xếp | Chưa xếp | DEP-06, BE-72 | 3 | 6 |
| [BE-77](../tasks/BE-77.md) | Upload hoặc thay avatar qua Identity, lưu metadata Cloudinary và chỉ cho phép người dùng sửa ảnh của mình | Trần Nguyễn Hữu Khánh | BACKLOG | TO DO | Chưa xếp | Chưa xếp | BE-18, BE-72 | 3 | 8 |
| [BE-82](../tasks/BE-82.md) | Quản lý tài khoản Customer toàn hệ thống cho Admin | Trần Nguyễn Hữu Khánh | 3 | TO DO | 11/11/2026 08:00 | 12/11/2026 23:59 | BE-09, BE-17, BE-43 | 5 | 10 |
| [BE-83](../tasks/BE-83.md) | Cung cấp lịch sử mua hàng Customer cho Admin qua contract giữa service | Trần Nguyễn Hữu Khánh | 3 | TO DO | 11/11/2026 08:00 | 12/11/2026 23:59 | BE-09, BE-25, BE-27 | 5 | 10 |
| [KAFKA-04](../tasks/KAFKA-04.md) | Phát sự kiện promotion.approved sau khi Admin duyệt voucher chi nhánh, kèm định danh để truy vết và chống xử lý lặp | Cao Tất Thành | 3 | TO DO | Chưa xếp | Chưa xếp | BE-35, KAFKA-01 | 2 | 4 |
| [KAFKA-11](../tasks/KAFKA-11.md) | Thống nhất và tích hợp sự kiện khuyến mãi đã duyệt từ Promotion sang Notification, đủ dữ liệu chọn email và người nhận | Cao Tất Thành | 3 | TO DO | Chưa xếp | Chưa xếp | KAFKA-04, KAFKA-12 | 2 | 4 |
| [UI-51](../tasks/UI-51.md) | Hiển thị trạng thái email liên quan đến đơn hoặc thanh toán cho Customer khi có contract được duyệt, không coi email lỗi là đơn lỗi | Trần Đức Anh | BACKLOG | TO DO | Chưa xếp | Chưa xếp | KAFKA-12, BE-27 | 2 | 4 |
| [UI-53](../tasks/UI-53.md) | Màn quản lý Customer cho Admin | Trần Nguyễn Hữu Khánh | 3 | TO DO | 11/11/2026 08:00 | 12/11/2026 23:59 | BE-82, BE-83 | 5 | 10 |
| [UI-50](../tasks/UI-50.md) | Màn tra cứu email log theo bộ lọc, xem chi tiết và gửi lại email lỗi khi API, quyền và chính sách được chốt | Mai Sơn Việt | BACKLOG | TO DO | Chưa xếp | Chưa xếp | BE-63 | 3 | 8 |

## Audit Service riêng cho trang quản trị — cập nhật 02/11/2026

- Tách Audit Service khỏi Review & Report, nâng thiết kế lên 9 service nghiệp vụ. Bảng duy nhất là `audit_service.audit_logs`; BE-08 không còn phụ trách audit. Đây là thay đổi thiết kế/backlog, chưa triển khai service hoặc chuyển dữ liệu DB đang chạy.
- Ghi mọi thay đổi thành công trên trang quản trị của Staff/Manager/Admin: tài khoản/phân quyền, cửa hàng/menu/giá/kho, đơn hàng, thanh toán/hoàn tiền, khuyến mãi/điểm, cấu hình và đánh giá. Backend domain phát sự kiện với actor/role đáng tin cậy, store, action, target, dữ liệu trước–sau đã lọc secret, thời gian, source service, eventId/correlationId; không lấy audit trực tiếp từ frontend.
- BE-43 xây base Audit Service, migration/entity/repository và API đọc `/api/audit-logs` qua Gateway; cấu hình qua Config Server, discovery qua Eureka. KAFKA-10 tích hợp producer ở các domain và consumer tại Audit Service, chống trùng bằng eventId. Không ghi SQL xuyên service, không có API sửa/xóa audit.
- Admin tra cứu toàn hệ thống; Manager chỉ xem thao tác của Staff thuộc quán mình theo RBAC. Backend kiểm tra quyền và `storeId`; không lưu secret trong audit.
- Ghi chú ngày 02/11 là lịch sử thiết kế, không xác nhận runtime. BE-43/KAFKA-10 đã được sizing theo toàn bộ phạm vi trong bảng 10/11; giờ/lịch/trạng thái vẫn là snapshot.


## Ghi nhận phạm vi Payment ngày 04/11/2026 — chưa xếp sprint

Theo quyết định của Lê Phú Thịnh, ghi nhận các đầu việc sau cho sprint sau; chưa cấp task ID, PIC chính thức, SP, deadline hoặc đồng bộ Lark. Không cộng vào số lượng task snapshot hiện tại:

- Tra soát/hỗ trợ khách sửa hoặc thiếu nội dung chuyển khoản `Clucky-...`.
- Xử lý thiếu/thừa tiền, tiền đến sau expiry/hủy đơn và khoản chuyển thêm cho đơn đã thanh toán: reconciliation, compensation/refund và quy trình CSKH theo policy được duyệt sau.
- Mỗi trường hợp cần AC về phân quyền, bằng chứng đối soát và idempotency trước triển khai. Hiện tại không tự sửa số tiền, reopen Order hay xác nhận thành công cho các trường hợp này.
- Không hoãn baseline an toàn: xác thực webhook, chống xử lý lặp cùng transaction id, ghi nhận bền vững tối thiểu không lộ secret, ACK/retry đúng provider và không xác nhận nhầm đơn vẫn thuộc Sprint 2. Giao dịch khách chuyển lần nữa có transaction id mới khác với webhook retry cùng id.
- Phạm vi mới thay đổi phần reconciliation nâng cao trong BE-45/INT-49 và late-payment trong INT-50; cần đồng bộ AC/task detail khi chốt triển khai, không đánh DONE theo AC cũ.

Chi tiết quyết định đã chốt và đề xuất chờ duyệt: [Kế hoạch Sprint 2 của Lê Phú Thịnh, mục 8](Sprint_2_Le_Phu_Thinh_Plan.md#8-làm-rõ-với-pic-ngày-04112026).


## Lịch sử

Số lượng, SP và lần đồng bộ trước 10/11 chỉ là snapshot. Không dùng để mở lại task đã gộp hoặc khẳng định tiến độ mới.

- [Phân loại 07/11](Backlog_Reclassification_2026-11-07.md) · [Snapshot trước phân loại](backlog-before-2026-11-07.md).
- [Gộp task 08/11](Sprint_2_Consolidation_2026-11-08.md) · [Snapshot trước gộp](backlog-before-2026-11-08.md).
- [Sizing Sprint 2 cũ](Sprint_2_Story_Points_2026-11-08.md) · [Trạng thái Sprint 3 cũ](Sprint_3_Status_2026-11-08.md).

