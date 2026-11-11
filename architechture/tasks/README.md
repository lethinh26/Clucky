# Task details Clucky — Bản rút gọn

Các task chính được viết theo 5 phần: User Story, Công việc, API/Contract, Tiêu chí hoàn thành và Điểm cần chốt.

- SP thống nhất theo [backlog ngày 10/11/2026](../docs/backlog.md), thang 1–2–3–5–8. Giữ PIC, sprint và dependency trong detail; không xác nhận metadata trực tiếp trên Lark.
- Mỗi task chính chỉ có một file detail. File mã đã gộp/đổi mã và bản mẫu đã xóa; tra [bảng mã cũ](#ma-cu), không giao việc hoặc tính SP riêng.
- Nội dung mô tả công việc và điều kiện nghiệm thu; không xác nhận đã triển khai, đã kiểm thử hoặc đã hoàn thành.

## Yêu cầu bàn giao chung

Áp dụng theo phạm vi từng task, cùng với tiêu chí riêng trong file:

- Kiểm thử luồng thành công, validation/biên, quyền và ownership/store, lỗi dependency; kiểm retry, đồng thời và idempotency khi có. Ghi PASS/FAIL/BLOCKED kèm expected/actual và bằng chứng đã ẩn dữ liệu nhạy cảm.
- Backend thực thi quyền kể cả khi gọi trực tiếp; không tin actor/role/store do client tự khai. Endpoint nội bộ không tự công khai qua Gateway.
- Frontend gọi API qua Gateway; có loading/empty/error/retry, đọc lại dữ liệu sau lưu, vi/en, responsive và keyboard/focus trong phạm vi. Không dùng mock hoặc localStorage thay bằng chứng lưu backend.
- Response dùng DTO, validation và danh mục lỗi chung; không lộ exception, secret, token, OTP hoặc dữ liệu ngoài quyền. Mã lỗi mới cập nhật nguồn danh mục, không sửa file generated.
- Service dùng Config Server/Eureka và sở hữu schema riêng; không join/FK/ghi SQL xuyên service. Thay đổi DB dùng migration mới, giữ dữ liệu và migration đã áp dụng.
- Event giữ eventId/correlationId; replay không nhân side effect. Email lỗi không rollback Order/Payment. Producer ack không thay bằng chứng consumer xử lý thành công.
- Bàn giao commit, môi trường, contract/version, fixture, kết quả và lỗi còn mở có PIC. Dùng chung bằng chứng hợp lệ cho ca trùng; thiếu upstream hoặc quyết định thì ghi BLOCKED.
- Phần hoãn/Phase 2 và đề xuất chưa duyệt giữ nguyên ranh giới; không tự đưa vào sprint. Trạng thái DONE cũ không xác nhận tiêu chí mới đã đạt.

## Danh mục task chính

| Mã | Nội dung | SP |
| --- | --- | ---: |
| [BE-01](BE-01.md) | Ánh xạ entity và repository Identity vào schema tài khoản, địa chỉ, phiên đăng nhập, OTP và lịch nhân sự | 3 |
| [BE-02](BE-02.md) | Ánh xạ entity và repository Catalog vào schema cửa hàng, món, combo, tùy chọn và tồn kho theo chi nhánh | 5 |
| [BE-03](BE-03.md) | Ánh xạ entity và repository Order để lưu đơn hàng, chi tiết hóa đơn, lịch sử trạng thái và yêu cầu đặt tiệc | 3 |
| [BE-04](BE-04.md) | Ánh xạ entity và repository Payment để lưu thanh toán, giao dịch ngân hàng và dữ liệu webhook phục vụ đối soát | 3 |
| [BE-05](BE-05.md) | Ánh xạ entity và repository Promotion để lưu voucher, lịch sử sử dụng, số dư và biến động điểm thành viên | 3 |
| [BE-06](BE-06.md) | Ánh xạ entity và repository Shipping để lưu bản ghi giao hàng, cấu hình phí và lịch sử theo schema hiện có | 2 |
| [BE-07](BE-07.md) | Ánh xạ entity và repository Notification | 2 |
| [BE-08](BE-08.md) | Ánh xạ entity và repository Review & Report | 3 |
| [BE-09](BE-09.md) | Xác thực JWT và kiểm tra vai trò, chủ sở hữu, cửa hàng tại Gateway và từng service nghiệp vụ | 8 |
| [BE-10](BE-10.md) | Chuẩn hóa response, phân trang và xử lý exception để các API trả mã lỗi thống nhất, không lộ lỗi nội bộ | 3 |
| [BE-12](BE-12.md) | Cấu hình kết nối Redis, quy tắc đặt key và thời hạn lưu riêng cho giỏ hàng, menu cache, OTP và dữ liệu tạm | 2 |
| [BE-13](BE-13.md) | Cấu hình OpenAPI và Swagger cho từng service, mô tả API và xác thực Bearer token theo môi trường | 2 |
| [BE-15](BE-15.md) | Cung cấp health/info an toàn và truyền correlation ID xuyên Gateway, service và sự kiện để truy vết request | 3 |
| [BE-17](BE-17.md) | Xác thực tài khoản: đăng ký và OTP, đăng nhập, làm mới phiên, đăng xuất và đặt lại mật khẩu trên hai ứng dụng | 8 |
| [BE-18](BE-18.md) | Xem, sửa hồ sơ và quản lý sổ địa chỉ, bảo đảm mỗi khách chỉ có một địa chỉ mặc định | 3 |
| [BE-19](BE-19.md) | Tạo, khóa nhân viên, gán cửa hàng cho Admin và xếp ca cho Manager đúng phạm vi quản lý | 5 |
| [BE-20](BE-20.md) | Công khai để tìm cửa hàng, duyệt menu, tìm kiếm và xem món hoặc combo với giá đúng chi nhánh | 5 |
| [BE-21](BE-21.md) | Quản lý cửa hàng, danh mục, món, combo và tùy chọn, kiểm tra quyền và lưu dữ liệu nhất quán | 8 |
| [BE-22](BE-22.md) | Cập nhật tồn kho, bật hoặc tắt bán món theo chi nhánh và phản ánh thay đổi lên menu | 5 |
| [BE-23](BE-23.md) | Giỏ hàng Redis cho khách vãng lai và Customer, hỗ trợ thêm, sửa, xóa món mà không trộn dữ liệu chủ sở hữu | 5 |
| [BE-24](BE-24.md) | Xem trước đơn hàng, tính giá món, voucher, điểm và phí giao từ backend mà chưa tạo đơn hoặc thanh toán | 5 |
| [BE-25](BE-25.md) | Tạo đơn từ checkout, chốt giá và trạng thái bán, khởi tạo thanh toán và chống tạo trùng khi gửi lại | 8 |
| [BE-26](BE-26.md) | Hủy hoặc từ chối đơn đúng quyền, đúng trạng thái và tạo yêu cầu hoàn tiền cho đơn đã chuyển khoản | 5 |
| [BE-27](BE-27.md) | Lịch sử, chi tiết và đặt lại đơn, lọc theo chủ sở hữu hoặc cửa hàng và dùng giá hiện hành khi đặt lại | 5 |
| [BE-28](BE-28.md) | Gửi và tiếp nhận yêu cầu đặt tiệc, phân quyền xử lý mà không tự coi yêu cầu là đơn đã duyệt hoặc thanh toán | 5 |
| [BE-29](BE-29.md) | Cung cấp luồng QR chuyển khoản, thời hạn và tra cứu trạng thái thanh toán | 5 |
| [BE-30](BE-30.md) | Tiếp nhận webhook SePay, xác thực API Key và đối chiếu mã đơn, số tiền để ghi nhận thanh toán đúng một lần | 8 |
| [BE-31](BE-31.md) | Tích hợp webhook Casso khi được chọn sử dụng, xác thực giao dịch và đối soát thanh toán mà không ghi nhận trùng | 8 |
| [BE-32](BE-32.md) | Quản lý thanh toán: tra cứu và đối soát giao dịch, xác nhận chuyển khoản hoặc COD, duyệt hoàn tiền và cấu hình ngân hàng | 8 |
| [BE-33](BE-33.md) | Phí giao cố định toàn chuỗi, bán kính từng quán, nhận tại quán và API đọc shipment MVP | 3 |
| [BE-34](BE-34.md) | Quản lý và áp dụng voucher toàn chuỗi hoặc từng quán, kiểm tra điều kiện và trả số tiền giảm hợp lệ | 8 |
| [BE-35](BE-35.md) | Luồng Manager đề xuất voucher cho quán và Admin phê duyệt trước khi voucher được dùng tại checkout | 5 |
| [BE-36](BE-36.md) | Quản lý banner và upload ảnh Cloudinary | 5 |
| [BE-37](BE-37.md) | Điểm và hạng thành viên, cấu hình tích hoặc đổi điểm và lưu biến động số dư không bị cộng, trừ lặp | 8 |
| [BE-38](BE-38.md) | Danh sách thông báo, đánh dấu từng mục hoặc tất cả đã đọc và nối với giao diện đúng người nhận | 3 |
| [BE-40](BE-40.md) | Đánh giá món đã mua: khách tạo, sửa, xóa; nhân sự phản hồi hoặc ẩn nội dung đúng quyền và cửa hàng | 5 |
| [BE-42](BE-42.md) | Cung cấp dashboard và báo cáo doanh thu theo quyền, hỗ trợ lọc kỳ, cửa hàng và xuất Excel hoặc PDF khớp số liệu | 5 |
| [BE-43](BE-43.md) | Audit Service độc lập, sở hữu bảng audit_logs và cung cấp API tra cứu nhật ký quản trị theo quyền | 5 |
| [BE-47](BE-47.md) | Gán shipper, cập nhật trạng thái và lưu lịch sử giao hàng sau CREATED khi Phase 2 được duyệt | 8 |
| [BE-50](BE-50.md) | Định nghĩa DTO và contract Payment cho khởi tạo thanh toán, QR, trạng thái, số tiền, thời hạn và xử lý lỗi | 3 |
| [BE-51](BE-51.md) | Định nghĩa contract Order–Promotion để kiểm tra voucher, điểm và trả kết quả giảm giá cùng mã lỗi thống nhất | 3 |
| [BE-52](BE-52.md) | Định nghĩa DTO và khung API thông báo, thống nhất phân trang, trạng thái đã đọc và đích điều hướng cho hai ứng dụng | 2 |
| [BE-54](BE-54.md) | Kết nối menu qua Gateway và triển khai cache theo quán, làm mới dữ liệu khi giá hoặc trạng thái bán thay đổi | 5 |
| [BE-57](BE-57.md) | Cấu hình Mail Sender qua Config Server và biến môi trường, kiểm tra cấu hình và bảo vệ Gmail App Password | 2 |
| [BE-59](BE-59.md) | Định nghĩa và kiểm tra email command gồm người nhận, mẫu, biến nội dung và ID phục vụ truy vết, chống xử lý trùng | 2 |
| [BE-60](BE-60.md) | Gửi email nghiệp vụ qua Gmail SMTP: kiểm tra đầu vào, render mẫu OTP, đơn hàng, thanh toán và hoàn tiền, trả rõ kết quả gửi | 5 |
| [BE-62](BE-62.md) | Quản lý vòng đời gửi email: lưu trạng thái, chống job trùng, phục hồi worker và gửi lại có giới hạn trước khi chuyển FAILED | 8 |
| [BE-63](BE-63.md) | Vận hành email: ghi nhận failure/DLQ bền vững, truy vết các lần gửi và cung cấp API tra cứu log đúng quyền | 5 |
| [BE-68](BE-68.md) | Cấu hình Cloudinary qua Config Server và biến môi trường cho các service, không đưa API secret ra frontend | 2 |
| [BE-72](BE-72.md) | Upload và thay ảnh món, combo từ giao diện đến Cloudinary: kiểm tra file, lưu metadata, xử lý lỗi và dọn ảnh an toàn | 8 |
| [BE-75](BE-75.md) | Chuẩn hóa DTO metadata ảnh và loại credential, payload nhạy cảm khỏi response, log và bundle frontend | 3 |
| [BE-76](BE-76.md) | Đăng nhập Google qua Firebase, xác minh ID token, yêu cầu tài khoản mới hoàn tất mật khẩu và phát JWT Clucky | 8 |
| [BE-77](BE-77.md) | Upload hoặc thay avatar qua Identity, lưu metadata Cloudinary và chỉ cho phép người dùng sửa ảnh của mình | 3 |
| [BE-82](BE-82.md) | Quản lý tài khoản Customer toàn hệ thống cho Admin | 5 |
| [BE-83](BE-83.md) | Cung cấp lịch sử mua hàng Customer cho Admin qua contract giữa service | 5 |
| [DEP-01](DEP-01.md) | Chuẩn bị VPS với Docker, Compose và cấu hình cổng mạng, chỉ công khai dịch vụ cần thiết để triển khai hệ thống | 3 |
| [DEP-02](DEP-02.md) | Toàn bộ hệ thống bằng Docker Compose, nạp đúng cấu hình và khởi động theo thứ tự phụ thuộc của các dịch vụ | 5 |
| [DEP-03](DEP-03.md) | Cấu hình Nginx reverse proxy và HTTPS Let's Encrypt để truy cập hai frontend, API qua đúng tên miền và đường dẫn | 3 |
| [DEP-04](DEP-04.md) | Cấu hình tên miền, CORS và trusted origins để chỉ hai frontend được phép gọi API với thông tin xác thực | 2 |
| [DEP-05](DEP-05.md) | Cấu hình và xác minh healthcheck, readiness của từng container cùng dependency, không chỉ kiểm tra tiến trình đang chạy | 3 |
| [DEP-06](DEP-06.md) | Xác minh bản triển khai trên VPS bằng luồng đăng nhập, duyệt menu, tạo đơn COD và chuyển khoản trong phạm vi được phép | 5 |
| [DEP-07](DEP-07.md) | Thiết lập sao lưu database hằng ngày, giữ bảy bản và thực hiện khôi phục thử để xác nhận bản sao lưu sử dụng được | 5 |
| [DEP-08](DEP-08.md) | README hướng dẫn cài đặt, cấu hình và chạy dự án, kèm kiến trúc và tài liệu API đúng bản bàn giao | 3 |
| [DEP-09](DEP-09.md) | Tổng hợp Postman collection từ từng service, cấu hình gọi qua Gateway và bàn giao request mẫu cho luồng chính cùng trường hợp lỗi | 3 |
| [DEP-10](DEP-10.md) | Chuẩn bị kịch bản demo, ảnh minh chứng và slide Sprint Review, phân biệt rõ chức năng đã nghiệm thu với phần còn hạn chế | 2 |
| [DEP-11](DEP-11.md) | Rà soát phạm vi phát hành, lỗi còn mở và khả năng rollback, sau đó gắn tag cho đúng phiên bản được duyệt | 2 |
| [DEP-12](DEP-12.md) | Bàn giao cấu hình môi trường, quyền truy cập và quy trình rollback cho người vận hành qua kênh an toàn, không lộ secret | 3 |
| [DEP-20](DEP-20.md) | Xác minh gửi email an toàn trên production và bảo đảm email_logs được sao lưu, khôi phục cùng database | 3 |
| [DEP-22](DEP-22.md) | Xác minh upload, đọc ảnh và sao lưu metadata trên production, bảo đảm cleanup không xóa asset vẫn đang được sử dụng | 3 |
| [KAFKA-01](KAFKA-01.md) | Cấu hình topic, producer và consumer Kafka cho các service, thống nhất JSON event, group, serializer và cách xác nhận xử lý | 5 |
| [KAFKA-02](KAFKA-02.md) | Phát sự kiện tạo, đổi trạng thái, hoàn tất và hủy đơn sau khi Order commit, giữ eventId và correlationId khi gửi lại | 5 |
| [KAFKA-03](KAFKA-03.md) | Phát sự kiện xác nhận hoặc thất bại thanh toán và dữ liệu hết hạn, sai lệch, hoàn tiền theo contract cho các service nhận | 5 |
| [KAFKA-04](KAFKA-04.md) | Phát sự kiện promotion.approved sau khi Admin duyệt voucher chi nhánh, kèm định danh để truy vết và chống xử lý lặp | 2 |
| [KAFKA-05](KAFKA-05.md) | Xử lý order.created để tạo một shipment CREATED cho mỗi đơn DELIVERY, không tạo trùng khi Kafka gửi lại | 3 |
| [KAFKA-06](KAFKA-06.md) | Xử lý sự kiện order.completed để cộng điểm cho đúng khách, lưu biến động điểm và không cộng lại khi nhận sự kiện trùng | 3 |
| [KAFKA-07](KAFKA-07.md) | Xử lý sự kiện Order và Payment để cập nhật thống kê từng quán theo ngày, không cộng doanh thu hai lần khi nhận lại sự kiện | 8 |
| [KAFKA-08](KAFKA-08.md) | Retry, DLQ và xử lý sự kiện không lặp hiệu ứng cho Kafka consumer, hỗ trợ phát lại có kiểm soát khi khôi phục lỗi | 8 |
| [KAFKA-09](KAFKA-09.md) | Xử lý payment.failed để hủy đơn và giải phóng voucher, điểm đã giữ, bảo đảm các bước bù trừ không thực hiện trùng | 8 |
| [KAFKA-10](KAFKA-10.md) | Phát sự kiện cho mọi thay đổi quản trị đã commit và ghi tập trung vào Audit Service, chống trùng và loại dữ liệu nhạy cảm | 8 |
| [KAFKA-11](KAFKA-11.md) | Thống nhất và tích hợp sự kiện khuyến mãi đã duyệt từ Promotion sang Notification, đủ dữ liệu chọn email và người nhận | 2 |
| [KAFKA-12](KAFKA-12.md) | Xử lý sự kiện Order, Payment để tạo thông báo và yêu cầu gửi email đúng người, chống trùng và không rollback nghiệp vụ khi email lỗi | 5 |
| [UI-01](UI-01.md) | Layout Next.js cho Customer với header, footer, hero và điều hướng responsive theo nhận diện Clucky | 3 |
| [UI-02](UI-02.md) | Layout React cho nhân sự với sidebar, header, menu theo vai trò và điều hướng khi chưa đăng nhập hoặc thiếu quyền | 3 |
| [UI-03](UI-03.md) | Thiết lập Config Server và config-repo để các service tải cấu hình chung, riêng và theo môi trường từ một nguồn | 3 |
| [UI-04](UI-04.md) | Thiết lập Eureka Server và cấu hình client để Gateway, các service đăng ký và tìm đúng địa chỉ kết nối | 2 |
| [UI-05](UI-05.md) | Thiết lập API Gateway, ánh xạ route qua Eureka và tích hợp xác thực để hai frontend gọi backend qua một đầu vào | 3 |
| [UI-06](UI-06.md) | Docker Compose cho PostgreSQL, Redis và Kafka, có healthcheck, kết nối host/container và lưu dữ liệu an toàn | 5 |
| [UI-07](UI-07.md) | Bộ Button, Card, Input, Badge và Modal dùng chung cho Customer, thống nhất trạng thái và thao tác bàn phím | 3 |
| [UI-08](UI-08.md) | Bộ Table, Badge, Form, Modal và Drawer dùng chung cho nhân sự, thống nhất loading, lỗi và thao tác xác nhận | 5 |
| [UI-09](UI-09.md) | Đăng nhập, đăng ký Customer, xác thực OTP, quên hoặc đặt lại mật khẩu cho đúng luồng của hai ứng dụng | 5 |
| [UI-10](UI-10.md) | Trang chủ Customer hiển thị banner, danh mục và món nổi bật từ dữ liệu, điều hướng đến đúng menu hoặc chi tiết món | 3 |
| [UI-11](UI-11.md) | Trang menu theo quán, hỗ trợ danh mục, tìm kiếm, bộ lọc và đồng bộ lựa chọn với URL | 3 |
| [UI-12](UI-12.md) | Trang chi tiết món, cho chọn tùy chọn, topping, số lượng, xem tạm tính và đánh giá trước khi thêm vào giỏ | 5 |
| [UI-13](UI-13.md) | Trang chọn chi nhánh, hiển thị địa chỉ, giờ mở và trạng thái nhận đơn rồi chuyển tới menu đúng quán | 2 |
| [UI-14](UI-14.md) | Dashboard nhân sự với thẻ thống kê, biểu đồ và bộ lọc, hiển thị số liệu backend đúng phạm vi vai trò | 3 |
| [UI-15](UI-15.md) | Quản lý tài khoản nhân sự, hỗ trợ tìm kiếm, tạo, khóa hoặc mở tài khoản và gán quán đúng quyền | 3 |
| [UI-16](UI-16.md) | Quản lý đánh giá để nhân sự xem, phản hồi hoặc ẩn nội dung trong phạm vi được phép | 3 |
| [UI-17](UI-17.md) | Trang giỏ hàng, hỗ trợ sửa số lượng, ghi chú, xóa món và cập nhật tổng tạm tính trước checkout | 3 |
| [UI-18](UI-18.md) | Checkout để chọn nhận hàng, áp dụng voucher hoặc điểm, xem chi tiết tiền và gửi yêu cầu tạo đơn | 5 |
| [UI-19](UI-19.md) | Trang theo dõi đơn, tự cập nhật trạng thái bằng polling và hiển thị QR, thanh toán, thông tin giao hàng theo backend | 3 |
| [UI-20](UI-20.md) | Lịch sử, chi tiết đơn và hóa đơn, hỗ trợ đặt lại món theo giá, trạng thái bán hiện hành | 3 |
| [UI-21](UI-21.md) | Màn hồ sơ Customer, sổ địa chỉ và đổi mật khẩu với kiểm tra dữ liệu và phản hồi lỗi không làm mất form | 3 |
| [UI-22](UI-22.md) | Trang ưu đãi để Customer xem voucher khả dụng, điểm và hạng thành viên trước khi đặt hàng | 3 |
| [UI-23](UI-23.md) | Form gửi yêu cầu đặt tiệc, thu thông tin liên hệ và nhu cầu, không hiển thị như đơn đã được xác nhận thanh toán | 2 |
| [UI-24](UI-24.md) | Quản lý đơn cho nhân sự, hỗ trợ lọc, xem chi tiết, đổi trạng thái và duyệt hoặc từ chối hoàn tiền | 5 |
| [UI-25](UI-25.md) | Form quản lý món, combo, tùy chọn và topping, hỗ trợ upload ảnh và giữ dữ liệu khi lưu lỗi | 5 |
| [UI-26](UI-26.md) | Quản lý chi nhánh, hỗ trợ danh sách, thêm, sửa, xóa, giờ mở và khu vực giao theo quyền | 3 |
| [UI-27](UI-27.md) | Màn thanh toán để tra cứu giao dịch, webhook log, xác nhận thủ công và cấu hình ngân hàng theo quyền | 5 |
| [UI-28](UI-28.md) | Quản lý voucher thường; giữ phần đề xuất chi nhánh và banner ở trạng thái backlog, chưa triển khai nghiệp vụ | 3 |
| [UI-29](UI-29.md) | Báo cáo, cho chọn kỳ, cửa hàng, xem biểu đồ và xuất Excel hoặc PDF đúng quyền | 3 |
| [UI-30](UI-30.md) | Màn đơn hàng tại quán để Staff xem đơn hôm nay, chuyển trạng thái hợp lệ và xác nhận đã thu COD | 3 |
| [UI-31](UI-31.md) | Màn tồn kho tại quán, hiển thị cảnh báo sắp hết và cho nhân sự cập nhật tồn hoặc trạng thái bán | 3 |
| [UI-32](UI-32.md) | Danh sách thông báo trên hai ứng dụng, hiển thị chưa đọc, mở nội dung và đánh dấu đã đọc | 3 |
| [UI-34](UI-34.md) | Rà soát và sửa lỗi giao diện hai frontend về thương hiệu, responsive, khả năng tiếp cận và trạng thái dữ liệu, bàn giao kết quả kiểm chứng | 5 |
| [UI-39](UI-39.md) | Viết Dockerfile cho Next.js và React để build image production và chạy độc lập với cấu hình môi trường phù hợp | 3 |
| [UI-40](UI-40.md) | Kiểm tra Dockerfile và build image các module backend, xác nhận cách cấu hình và khởi chạy container độc lập | 3 |
| [UI-41](UI-41.md) | Thiết lập CI frontend để chạy lint, kiểm thử và build trên pull request, báo lỗi rõ khi một bước không đạt | 3 |
| [UI-43](UI-43.md) | Component dùng chung cho giỏ và đơn hàng, gồm số lượng trên giỏ, nhãn trạng thái và thẻ thông tin đơn | 2 |
| [UI-44](UI-44.md) | Component QR, trạng thái thanh toán, phí giao và shipment, tích hợp hiển thị theo dữ liệu backend trong phạm vi MVP | 3 |
| [UI-45](UI-45.md) | Component dùng chung cho nhãn voucher, hạng thành viên và mục thông báo, hiển thị trạng thái nhất quán giữa các màn | 2 |
| [UI-46](UI-46.md) | Sửa responsive và thao tác bàn phím trên giỏ hàng, checkout, lịch sử, chi tiết đơn và màn đơn hàng của nhân sự | 3 |
| [UI-47](UI-47.md) | Sửa responsive và khả năng tiếp cận của QR, màn quản lý thanh toán và thông tin giao hàng, không che nội dung hoặc nút thao tác | 3 |
| [UI-48](UI-48.md) | Sửa responsive và thao tác bàn phím trên voucher, điểm thành viên và thông báo | 2 |
| [UI-49](UI-49.md) | Và nối luồng đăng nhập Google cho Customer, yêu cầu tài khoản mới nhập mật khẩu trước khi hoàn tất đăng nhập | 3 |
| [UI-50](UI-50.md) | Màn tra cứu email log theo bộ lọc, xem chi tiết và gửi lại email lỗi khi API, quyền và chính sách được chốt | 3 |
| [UI-51](UI-51.md) | Hiển thị trạng thái email liên quan đến đơn hoặc thanh toán cho Customer khi có contract được duyệt, không coi email lỗi là đơn lỗi | 2 |
| [UI-53](UI-53.md) | Màn quản lý Customer cho Admin | 5 |

Tổng cộng: **127 task chính / 520 SP**. Đã xóa **125 file mã cũ và 1 bản mẫu**; bảng tra cứu không phát sinh task hay SP.

Đối chiếu SP/dependency/liên kết tài liệu: `node architechture/verification/check-task-docs.mjs`. Không gọi ứng dụng.

<a id="ma-cu"></a>
## Đối chiếu mã đã gộp

Chỉ dùng để đọc tài liệu lịch sử. Mã có nhiều đích nghĩa là phạm vi được chia cho các task đó; không tạo lại file hoặc cộng điểm mã nguồn.

| Mã cũ | Task hiện hành |
| --- | --- |
| <a id="be-11"></a>BE-11 | [KAFKA-01](KAFKA-01.md) |
| <a id="be-14"></a>BE-14 | [BE-10](BE-10.md) |
| <a id="be-16"></a>BE-16 | [BE-17](BE-17.md) |
| <a id="be-39"></a>BE-39 | [KAFKA-12](KAFKA-12.md) |
| <a id="be-41"></a>BE-41 | [BE-40](BE-40.md) |
| <a id="be-44"></a>BE-44 | [BE-29](BE-29.md) |
| <a id="be-45"></a>BE-45 | [BE-32](BE-32.md) |
| <a id="be-46"></a>BE-46 | [BE-32](BE-32.md) |
| <a id="be-48"></a>BE-48 | [BE-33](BE-33.md) |
| <a id="be-49"></a>BE-49 | [BE-29](BE-29.md) |
| <a id="be-53"></a>BE-53 | [BE-17](BE-17.md) |
| <a id="be-55"></a>BE-55 | [BE-25](BE-25.md) |
| <a id="be-56"></a>BE-56 | [BE-07](BE-07.md) |
| <a id="be-58"></a>BE-58 | [BE-60](BE-60.md) |
| <a id="be-61"></a>BE-61 | [BE-60](BE-60.md) |
| <a id="be-64"></a>BE-64 | [BE-60](BE-60.md) |
| <a id="be-65"></a>BE-65 | [BE-60](BE-60.md) |
| <a id="be-66"></a>BE-66 | [BE-62](BE-62.md) |
| <a id="be-67"></a>BE-67 | [BE-63](BE-63.md) |
| <a id="be-69"></a>BE-69 | [BE-01](BE-01.md), [BE-02](BE-02.md), [BE-05](BE-05.md) |
| <a id="be-70"></a>BE-70 | [BE-72](BE-72.md) |
| <a id="be-71"></a>BE-71 | [BE-72](BE-72.md) |
| <a id="be-73"></a>BE-73 | [BE-77](BE-77.md), [BE-36](BE-36.md) |
| <a id="be-74"></a>BE-74 | [BE-72](BE-72.md) |
| <a id="be-78"></a>BE-78 | [BE-63](BE-63.md) |
| <a id="dep-13"></a>DEP-13 | [BE-17](BE-17.md), [UI-09](UI-09.md) |
| <a id="dep-14"></a>DEP-14 | [UI-11](UI-11.md), [UI-10](UI-10.md), [UI-12](UI-12.md), [UI-13](UI-13.md), [BE-20](BE-20.md), [BE-54](BE-54.md) |
| <a id="dep-15"></a>DEP-15 | [BE-09](BE-09.md), [BE-17](BE-17.md), [UI-05](UI-05.md) |
| <a id="dep-16"></a>DEP-16 | [BE-29](BE-29.md), [BE-30](BE-30.md), [BE-32](BE-32.md), [UI-19](UI-19.md), [UI-30](UI-30.md), [UI-44](UI-44.md) |
| <a id="dep-17"></a>DEP-17 | [BE-38](BE-38.md), [UI-32](UI-32.md) |
| <a id="dep-18"></a>DEP-18 | [BE-57](BE-57.md) |
| <a id="dep-19"></a>DEP-19 | [BE-57](BE-57.md) |
| <a id="dep-21"></a>DEP-21 | [BE-68](BE-68.md) |
| <a id="dep-23"></a>DEP-23 | [BE-76](BE-76.md) |
| <a id="int-01"></a>INT-01 | [BE-72](BE-72.md) |
| <a id="int-02"></a>INT-02 | [BE-36](BE-36.md) |
| <a id="int-03"></a>INT-03 | [BE-77](BE-77.md) |
| <a id="int-04"></a>INT-04 | [BE-72](BE-72.md) |
| <a id="int-05"></a>INT-05 | [BE-17](BE-17.md), [UI-09](UI-09.md) |
| <a id="int-06"></a>INT-06 | [UI-11](UI-11.md), [UI-10](UI-10.md), [UI-12](UI-12.md), [UI-13](UI-13.md), [BE-20](BE-20.md), [BE-54](BE-54.md) |
| <a id="int-07"></a>INT-07 | [BE-25](BE-25.md), [BE-23](BE-23.md), [BE-24](BE-24.md), [UI-17](UI-17.md), [UI-18](UI-18.md) |
| <a id="int-08"></a>INT-08 | [BE-27](BE-27.md), [BE-26](BE-26.md), [UI-19](UI-19.md), [UI-20](UI-20.md) |
| <a id="int-09"></a>INT-09 | [BE-29](BE-29.md), [BE-30](BE-30.md), [BE-32](BE-32.md), [UI-19](UI-19.md), [UI-30](UI-30.md), [UI-44](UI-44.md) |
| <a id="int-10"></a>INT-10 | [BE-34](BE-34.md), [BE-37](BE-37.md), [BE-24](BE-24.md), [UI-18](UI-18.md), [UI-22](UI-22.md), [KAFKA-06](KAFKA-06.md) |
| <a id="int-11"></a>INT-11 | [BE-38](BE-38.md), [UI-32](UI-32.md) |
| <a id="int-12"></a>INT-12 | [BE-40](BE-40.md), [UI-12](UI-12.md), [UI-16](UI-16.md) |
| <a id="int-13"></a>INT-13 | [BE-42](BE-42.md), [UI-14](UI-14.md), [UI-29](UI-29.md) |
| <a id="int-14"></a>INT-14 | [BE-26](BE-26.md), [BE-25](BE-25.md), [BE-32](BE-32.md), [UI-24](UI-24.md), [UI-30](UI-30.md) |
| <a id="int-15"></a>INT-15 | [BE-21](BE-21.md), [BE-22](BE-22.md), [UI-25](UI-25.md), [UI-26](UI-26.md), [UI-31](UI-31.md) |
| <a id="int-35"></a>INT-35 | [BE-24](BE-24.md) |
| <a id="int-36"></a>INT-36 | [BE-25](BE-25.md) |
| <a id="int-37"></a>INT-37 | [BE-25](BE-25.md) |
| <a id="int-38"></a>INT-38 | [BE-24](BE-24.md) |
| <a id="int-39"></a>INT-39 | [KAFKA-02](KAFKA-02.md) |
| <a id="int-40"></a>INT-40 | [KAFKA-03](KAFKA-03.md) |
| <a id="int-41"></a>INT-41 | [KAFKA-04](KAFKA-04.md) |
| <a id="int-42"></a>INT-42 | [KAFKA-12](KAFKA-12.md) |
| <a id="int-43"></a>INT-43 | [KAFKA-05](KAFKA-05.md) |
| <a id="int-44"></a>INT-44 | [KAFKA-06](KAFKA-06.md) |
| <a id="int-45"></a>INT-45 | [KAFKA-07](KAFKA-07.md) |
| <a id="int-46"></a>INT-46 | [KAFKA-08](KAFKA-08.md) |
| <a id="int-47"></a>INT-47 | [KAFKA-09](KAFKA-09.md) |
| <a id="int-48"></a>INT-48 | [KAFKA-10](KAFKA-10.md) |
| <a id="int-49"></a>INT-49 | [BE-30](BE-30.md), [BE-32](BE-32.md) |
| <a id="int-50"></a>INT-50 | [BE-29](BE-29.md), [BE-30](BE-30.md), [BE-25](BE-25.md), [KAFKA-03](KAFKA-03.md), [KAFKA-12](KAFKA-12.md), [UI-19](UI-19.md) |
| <a id="int-51"></a>INT-51 | [BE-32](BE-32.md), [BE-25](BE-25.md), [UI-30](UI-30.md) |
| <a id="int-52"></a>INT-52 | [BE-32](BE-32.md), [BE-26](BE-26.md), [UI-24](UI-24.md), [KAFKA-03](KAFKA-03.md), [KAFKA-12](KAFKA-12.md) |
| <a id="int-53"></a>INT-53 | [BE-09](BE-09.md), [BE-17](BE-17.md), [UI-05](UI-05.md) |
| <a id="int-54"></a>INT-54 | [BE-54](BE-54.md), [BE-20](BE-20.md), [UI-05](UI-05.md) |
| <a id="int-55"></a>INT-55 | [BE-17](BE-17.md) |
| <a id="int-56"></a>INT-56 | [KAFKA-02](KAFKA-02.md) |
| <a id="int-57"></a>INT-57 | [KAFKA-03](KAFKA-03.md) |
| <a id="int-58"></a>INT-58 | [KAFKA-11](KAFKA-11.md) |
| <a id="int-59"></a>INT-59 | [KAFKA-12](KAFKA-12.md) |
| <a id="int-60"></a>INT-60 | [BE-63](BE-63.md) |
| <a id="int-61"></a>INT-61 | [BE-19](BE-19.md), [UI-15](UI-15.md) |
| <a id="int-62"></a>INT-62 | [BE-34](BE-34.md), [UI-28](UI-28.md) |
| <a id="int-63"></a>INT-63 | [BE-32](BE-32.md), [UI-27](UI-27.md) |
| <a id="int-64"></a>INT-64 | [BE-29](BE-29.md), [UI-19](UI-19.md), [UI-20](UI-20.md), [UI-44](UI-44.md) |
| <a id="int-65"></a>INT-65 | [BE-33](BE-33.md), [BE-24](BE-24.md), [UI-18](UI-18.md), [UI-19](UI-19.md), [UI-44](UI-44.md) |
| <a id="int-66"></a>INT-66 | [BE-32](BE-32.md), [BE-26](BE-26.md), [UI-24](UI-24.md), [KAFKA-03](KAFKA-03.md), [KAFKA-12](KAFKA-12.md) |
| <a id="int-67"></a>INT-67 | [BE-09](BE-09.md), [BE-18](BE-18.md), [BE-19](BE-19.md), [BE-21](BE-21.md), [BE-22](BE-22.md), [BE-25](BE-25.md), [BE-26](BE-26.md), [BE-27](BE-27.md), [BE-32](BE-32.md), [BE-33](BE-33.md), [BE-34](BE-34.md), [BE-37](BE-37.md), [BE-38](BE-38.md), [BE-40](BE-40.md), [BE-42](BE-42.md), [BE-43](BE-43.md), [BE-29](BE-29.md), [BE-63](BE-63.md), [BE-72](BE-72.md) |
| <a id="int-68"></a>INT-68 | [UI-19](UI-19.md), [BE-27](BE-27.md) |
| <a id="int-69"></a>INT-69 | [UI-09](UI-09.md), [BE-17](BE-17.md) |
| <a id="int-70"></a>INT-70 | [UI-51](UI-51.md) |
| <a id="int-71"></a>INT-71 | [UI-50](UI-50.md) |
| <a id="int-72"></a>INT-72 | [BE-72](BE-72.md) |
| <a id="int-73"></a>INT-73 | [BE-72](BE-72.md), [UI-25](UI-25.md) |
| <a id="int-74"></a>INT-74 | [BE-76](BE-76.md), [UI-49](UI-49.md) |
| <a id="test-01"></a>TEST-01 | [BE-25](BE-25.md), [BE-17](BE-17.md), [BE-20](BE-20.md), [BE-23](BE-23.md), [BE-24](BE-24.md), [BE-32](BE-32.md), [UI-09](UI-09.md), [UI-11](UI-11.md), [UI-17](UI-17.md), [UI-18](UI-18.md), [UI-30](UI-30.md) |
| <a id="test-02"></a>TEST-02 | [BE-29](BE-29.md), [BE-30](BE-30.md), [BE-32](BE-32.md), [UI-19](UI-19.md), [UI-30](UI-30.md), [UI-44](UI-44.md) |
| <a id="test-03"></a>TEST-03 | [BE-32](BE-32.md), [BE-26](BE-26.md), [UI-24](UI-24.md), [KAFKA-03](KAFKA-03.md), [KAFKA-12](KAFKA-12.md) |
| <a id="test-04"></a>TEST-04 | [BE-26](BE-26.md), [BE-25](BE-25.md), [BE-32](BE-32.md), [UI-24](UI-24.md), [UI-30](UI-30.md) |
| <a id="test-05"></a>TEST-05 | [BE-19](BE-19.md), [BE-42](BE-42.md), [UI-15](UI-15.md), [UI-29](UI-29.md) |
| <a id="test-06"></a>TEST-06 | [BE-21](BE-21.md), [BE-34](BE-34.md), [BE-24](BE-24.md), [UI-25](UI-25.md), [UI-26](UI-26.md), [UI-28](UI-28.md) |
| <a id="test-07"></a>TEST-07 | [BE-09](BE-09.md), [BE-19](BE-19.md), [BE-21](BE-21.md), [BE-22](BE-22.md), [BE-25](BE-25.md), [BE-26](BE-26.md), [BE-27](BE-27.md), [BE-32](BE-32.md), [BE-33](BE-33.md), [BE-34](BE-34.md), [BE-40](BE-40.md), [BE-42](BE-42.md), [BE-43](BE-43.md), [BE-63](BE-63.md), [BE-72](BE-72.md) |
| <a id="test-08"></a>TEST-08 | [BE-30](BE-30.md), [BE-32](BE-32.md) |
| <a id="test-09"></a>TEST-09 | [BE-30](BE-30.md), [BE-32](BE-32.md) |
| <a id="test-10"></a>TEST-10 | [BE-29](BE-29.md), [BE-30](BE-30.md), [BE-25](BE-25.md), [KAFKA-03](KAFKA-03.md), [KAFKA-12](KAFKA-12.md), [UI-19](UI-19.md) |
| <a id="test-11"></a>TEST-11 | [BE-32](BE-32.md), [BE-26](BE-26.md), [UI-24](UI-24.md), [KAFKA-03](KAFKA-03.md), [KAFKA-12](KAFKA-12.md) |
| <a id="test-12"></a>TEST-12 | [BE-33](BE-33.md), [BE-24](BE-24.md), [UI-18](UI-18.md) |
| <a id="test-13"></a>TEST-13 | [BE-54](BE-54.md) |
| <a id="test-14"></a>TEST-14 | [BE-25](BE-25.md) |
| <a id="test-15"></a>TEST-15 | [BE-25](BE-25.md), [BE-30](BE-30.md), [BE-32](BE-32.md), [KAFKA-12](KAFKA-12.md) |
| <a id="test-16"></a>TEST-16 | [KAFKA-08](KAFKA-08.md), [KAFKA-02](KAFKA-02.md), [KAFKA-03](KAFKA-03.md), [KAFKA-05](KAFKA-05.md), [KAFKA-06](KAFKA-06.md), [KAFKA-07](KAFKA-07.md), [KAFKA-09](KAFKA-09.md), [KAFKA-10](KAFKA-10.md), [KAFKA-12](KAFKA-12.md) |
| <a id="test-17"></a>TEST-17 | [UI-34](UI-34.md), [UI-46](UI-46.md), [UI-47](UI-47.md), [UI-48](UI-48.md) |
| <a id="test-18"></a>TEST-18 | [BE-25](BE-25.md), [UI-34](UI-34.md) |
| <a id="test-19"></a>TEST-19 | [BE-60](BE-60.md) |
| <a id="test-20"></a>TEST-20 | [BE-62](BE-62.md) |
| <a id="test-21"></a>TEST-21 | [KAFKA-12](KAFKA-12.md) |
| <a id="test-22"></a>TEST-22 | [KAFKA-12](KAFKA-12.md), [BE-17](BE-17.md), [BE-60](BE-60.md), [BE-62](BE-62.md), [BE-32](BE-32.md), [KAFKA-02](KAFKA-02.md), [KAFKA-03](KAFKA-03.md) |
| <a id="test-23"></a>TEST-23 | [KAFKA-12](KAFKA-12.md), [BE-25](BE-25.md), [BE-30](BE-30.md), [BE-32](BE-32.md), [BE-60](BE-60.md), [BE-62](BE-62.md), [BE-63](BE-63.md) |
| <a id="test-24"></a>TEST-24 | [BE-57](BE-57.md), [BE-60](BE-60.md), [BE-63](BE-63.md), [BE-75](BE-75.md), [KAFKA-12](KAFKA-12.md) |
| <a id="test-25"></a>TEST-25 | [BE-72](BE-72.md), [UI-25](UI-25.md) |
| <a id="test-26"></a>TEST-26 | [BE-72](BE-72.md) |
| <a id="test-27"></a>TEST-27 | [BE-72](BE-72.md) |
| <a id="test-28"></a>TEST-28 | [BE-75](BE-75.md) |
| <a id="test-29"></a>TEST-29 | [BE-76](BE-76.md), [UI-49](UI-49.md) |
| <a id="ui-33"></a>UI-33 | [UI-34](UI-34.md) |
| <a id="ui-35"></a>UI-35 | [UI-34](UI-34.md) |
| <a id="ui-36"></a>UI-36 | [UI-34](UI-34.md) |
| <a id="ui-37"></a>UI-37 | [UI-34](UI-34.md) |
| <a id="ui-38"></a>UI-38 | [UI-34](UI-34.md) |
| <a id="ui-42"></a>UI-42 | [UI-34](UI-34.md) |
| <a id="ui-52"></a>UI-52 | [BE-72](BE-72.md) |
