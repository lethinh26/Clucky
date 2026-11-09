# Backlog Clucky — snapshot trước gộp 08/11/2026

> LƯU TRỮ: 142 task/55 task Sprint 2 là dữ liệu trước gộp. Xem [backlog hiện hành](backlog.md) và [báo cáo 08/11](Sprint_2_Consolidation_2026-11-08.md).

**Phân loại hiện hành: 07/11/2026 · UTC+7. Chỉ cập nhật repository, chưa đồng bộ Lark.**

**Title cập nhật 07/11/2026:** đã viết lại đủ 142 TASK theo việc cần làm, đối tượng và kết quả bàn giao; không đổi ID, scope, AC/DoD, PIC, lịch hoặc trạng thái. Chưa đồng bộ Lark.

142 TASK chính: **70 BE + 46 UI + 12 KAFKA + 14 DEP**. Không còn INT/TEST độc lập hoặc subtask. Gộp 28 INT + 14 TEST; đổi mã 17 công việc, không xóa implementation.

[Báo cáo task cần xóa/giữ/đổi mã và AC/DoD](Backlog_Reclassification_2026-11-07.md) · [Chỉ mục](../tasks/README.md) · [Snapshot trước phân loại](backlog-before-2026-11-07.md) · [Lark — chưa áp dụng phân loại mới](https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&view=vewC0rB72n)

## Quy ước

- Mọi dòng có **Loại = TASK**, không có parent/subtask. KAFKA là nhóm producer/consumer/event/retry/DLQ.
- Dev triển khai, tự test/sửa lỗi/retest theo AC/DoD trực tiếp trong task. Đầu mối phối hợp evidence xuyên service, không lập lại INT/TEST.
- Giữ 37 DONE snapshot, không xác nhận AC mới đã đạt. Trạng thái thực phải đọc lại Lark, không đổi tiến độ vì sửa tài liệu.
- Lịch cũ để truy vết: S1 26/10–01/11; S2 khung 02–08/11, hạn cũ 05/11, Review 06/11. Không phải lịch cam kết mới ngày 07/11; không tự xếp lịch bù.
- SP/giờ là snapshot, **chưa sizing phạm vi sau gộp**. Dòng “Rà lại” cần PIC ước lượng một lần, gồm tự test/sửa lỗi; không cộng nguyên INT/TEST hoặc suy ra giờ tiết kiệm. Không tính tổng remaining/velocity/capacity giả định.
- Dependency dùng TASK hiện hành; handoff nghiệm thu phần gộp nằm tại đầu mối. ID cũ chỉ chuyển hướng, không tính/giao task.
- TEST-13/14 chuyển vào BE-54/25 nhưng giữ nhãn HOÃN, không kéo performance/load vào sprint. Backlog/Phase 2 vẫn hoãn; shipment MVP chỉ CREATED.
- Người dùng/dev tự kiểm thử; lượt này không chạy test/lint/typecheck/build/browser/Docker/backend/hạ tầng.

## Tổng quan

| Phân bổ lịch snapshot | TASK | DONE snapshot | Chưa DONE snapshot |
|---|---:|---:|---:|
| SPRINT 1 | 65 | 37 | 28 |
| SPRINT 2 | 55 | 0 | 55 |
| BACKLOG | 22 | 0 | 22 |
| **Tổng** | **142** | **37** | **105** |

## SPRINT 1

| ID | TASK | PIC | Trạng thái snapshot | Bắt đầu cũ | Deadline cũ | Dependency hiện hành | SP cũ | Giờ cũ | Ước lượng sau gộp |
|---|---|---|---|---|---|---|---:|---:|---|
| [BE-01](../tasks/BE-01.md) | Ánh xạ entity và repository Identity vào schema tài khoản, địa chỉ, phiên đăng nhập, OTP và lịch nhân sự | Trần Nguyễn Hữu Khánh | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-03, UI-06 | 3 | 6 | Giữ snapshot |
| [BE-02](../tasks/BE-02.md) | Ánh xạ entity và repository Catalog vào schema cửa hàng, món, combo, tùy chọn và tồn kho theo chi nhánh | Nguyễn Duy Quang Nhật | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-03, UI-06 | 5 | 8 | Giữ snapshot |
| [BE-03](../tasks/BE-03.md) | Ánh xạ entity và repository Order để lưu đơn hàng, chi tiết hóa đơn, lịch sử trạng thái và yêu cầu đặt tiệc | Trần Đức Anh | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-03, UI-06 | 3 | 6 | Giữ snapshot |
| [BE-04](../tasks/BE-04.md) | Ánh xạ entity và repository Payment để lưu thanh toán, giao dịch ngân hàng và dữ liệu webhook phục vụ đối soát | Lê Phú Thịnh | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-03, UI-06 | 3 | 5 | Giữ snapshot |
| [BE-05](../tasks/BE-05.md) | Ánh xạ entity và repository Promotion để lưu voucher, lịch sử sử dụng, số dư và biến động điểm thành viên | Cao Tất Thành | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | UI-03, UI-06 | 3 | 6 | Giữ snapshot |
| [BE-06](../tasks/BE-06.md) | Ánh xạ entity và repository Shipping để lưu bản ghi giao hàng, cấu hình phí và lịch sử theo schema hiện có | Lê Phú Thịnh | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-03, UI-06 | 2 | 3 | Giữ snapshot |
| [BE-07](../tasks/BE-07.md) | Ánh xạ entity và repository Notification để lưu thông báo, mẫu email và lịch sử gửi, không lưu thông tin xác thực SMTP | Cao Tất Thành | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | UI-03, UI-06 | 3 | 5 | Giữ snapshot |
| [BE-08](../tasks/BE-08.md) | Ánh xạ entity và repository Review & Report để lưu đánh giá, phản hồi và số liệu thống kê theo quán, không chứa audit log | Mai Sơn Việt | TO DO | 30/10/2026 08:00 | 31/10/2026 23:59 | UI-03, UI-06 | 3 | 5 | Giữ snapshot |
| [BE-09](../tasks/BE-09.md) | Triển khai xác thực JWT và kiểm tra vai trò, chủ sở hữu, cửa hàng tại Gateway và từng service nghiệp vụ | Trần Nguyễn Hữu Khánh | TO DO | 30/10/2026 08:00 | 31/10/2026 23:59 | BE-01 | 8 | 12 | Rà lại |
| [BE-10](../tasks/BE-10.md) | Chuẩn hóa response, phân trang và xử lý exception để các API trả mã lỗi thống nhất, không lộ lỗi nội bộ | Lê Phú Thịnh | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-03 | 3 | 5 | Giữ snapshot |
| [KAFKA-01](../tasks/KAFKA-01.md) | Cấu hình topic, producer và consumer Kafka cho các service, thống nhất JSON event, group, serializer và cách xác nhận xử lý | Mai Sơn Việt | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-06 | 5 | 6 | Giữ snapshot |
| [BE-12](../tasks/BE-12.md) | Cấu hình kết nối Redis, quy tắc đặt key và thời hạn lưu riêng cho giỏ hàng, menu cache, OTP và dữ liệu tạm | Mai Sơn Việt | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-06 | 2 | 3 | Giữ snapshot |
| [BE-13](../tasks/BE-13.md) | Cấu hình OpenAPI và Swagger cho từng service, mô tả API và xác thực Bearer token theo môi trường | Lê Phú Thịnh | TO DO | 30/10/2026 08:00 | 31/10/2026 23:59 | UI-03 | 1 | 2 | Giữ snapshot |
| [BE-15](../tasks/BE-15.md) | Cung cấp health/info an toàn và truyền correlation ID xuyên Gateway, service và sự kiện để truy vết request | Lê Phú Thịnh | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | BE-10 | 3 | 4 | Giữ snapshot |
| [BE-20](../tasks/BE-20.md) | Cung cấp API công khai để tìm cửa hàng, duyệt menu, tìm kiếm và xem món hoặc combo với giá đúng chi nhánh | Nguyễn Duy Quang Nhật | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | BE-02, BE-10 | 5 | 10 | Rà lại |
| [BE-23](../tasks/BE-23.md) | Triển khai giỏ hàng Redis cho khách vãng lai và Customer, hỗ trợ thêm, sửa, xóa món mà không trộn dữ liệu chủ sở hữu | Trần Đức Anh | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | BE-03, BE-12 | 5 | 8 | Rà lại |
| [BE-50](../tasks/BE-50.md) | Định nghĩa DTO và contract Payment cho khởi tạo thanh toán, QR, trạng thái, số tiền, thời hạn và xử lý lỗi | Lê Phú Thịnh | TO DO | 30/10/2026 08:00 | 31/10/2026 23:59 | BE-04 | 2 | 3 | Giữ snapshot |
| [BE-51](../tasks/BE-51.md) | Định nghĩa contract Order–Promotion để kiểm tra voucher, điểm và trả kết quả giảm giá cùng mã lỗi thống nhất | Cao Tất Thành | TO DO | 01/11/2026 08:00 | 01/11/2026 23:59 | BE-05 | 3 | 4 | Giữ snapshot |
| [BE-52](../tasks/BE-52.md) | Định nghĩa DTO và khung API thông báo, thống nhất phân trang, trạng thái đã đọc và đích điều hướng cho hai ứng dụng | Mai Sơn Việt | TO DO | 30/10/2026 08:00 | 31/10/2026 23:59 | UI-03 | 2 | 3 | Giữ snapshot |
| [BE-57](../tasks/BE-57.md) | Cấu hình Mail Sender qua Config Server và biến môi trường, kiểm tra cấu hình và bảo vệ Gmail App Password | Cao Tất Thành | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | UI-03 | 3 | 4 | Rà lại |
| [BE-59](../tasks/BE-59.md) | Định nghĩa và kiểm tra email command gồm người nhận, mẫu, biến nội dung và ID phục vụ truy vết, chống xử lý trùng | Cao Tất Thành | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | UI-03 | 2 | 3 | Giữ snapshot |
| [BE-68](../tasks/BE-68.md) | Cấu hình Cloudinary qua Config Server và biến môi trường cho các service, không đưa API secret ra frontend | Nguyễn Duy Quang Nhật | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-03 | 2 | 3 | Giữ snapshot |
| [UI-01](../tasks/UI-01.md) | Xây dựng layout Next.js cho Customer với header, footer, hero và điều hướng responsive theo nhận diện Clucky | Trần Nguyễn Hữu Khánh | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 6 | Giữ snapshot |
| [UI-02](../tasks/UI-02.md) | Xây dựng layout React cho nhân sự với sidebar, header, menu theo vai trò và điều hướng khi chưa đăng nhập hoặc thiếu quyền | Nguyễn Duy Quang Nhật | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 6 | Giữ snapshot |
| [UI-03](../tasks/UI-03.md) | Thiết lập Config Server và config-repo để các service tải cấu hình chung, riêng và theo môi trường từ một nguồn | Trần Nguyễn Hữu Khánh | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 2 | 3 | Giữ snapshot |
| [UI-04](../tasks/UI-04.md) | Thiết lập Eureka Server và cấu hình client để Gateway, các service đăng ký và tìm đúng địa chỉ kết nối | Nguyễn Duy Quang Nhật | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 1 | 2 | Giữ snapshot |
| [UI-05](../tasks/UI-05.md) | Thiết lập API Gateway, ánh xạ route qua Eureka và tích hợp xác thực để hai frontend gọi backend qua một đầu vào | Trần Đức Anh | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 2 | 3 | Rà lại |
| [UI-06](../tasks/UI-06.md) | Hoàn thiện Docker Compose cho PostgreSQL, Redis và Kafka, có healthcheck, kết nối host/container và lưu dữ liệu an toàn | Mai Sơn Việt | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 5 | 6 | Giữ snapshot |
| [UI-07](../tasks/UI-07.md) | Xây dựng bộ Button, Card, Input, Badge và Modal dùng chung cho Customer, thống nhất trạng thái và thao tác bàn phím | Trần Nguyễn Hữu Khánh | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 6 | Giữ snapshot |
| [UI-08](../tasks/UI-08.md) | Xây dựng bộ Table, Badge, Form, Modal và Drawer dùng chung cho nhân sự, thống nhất loading, lỗi và thao tác xác nhận | Nguyễn Duy Quang Nhật | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 5 | 8 | Giữ snapshot |
| [UI-09](../tasks/UI-09.md) | Xây dựng và nối API đăng nhập, đăng ký Customer, xác thực OTP, quên hoặc đặt lại mật khẩu cho đúng luồng của hai ứng dụng | Trần Nguyễn Hữu Khánh | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 5 | 10 | Rà lại |
| [UI-10](../tasks/UI-10.md) | Xây dựng trang chủ Customer hiển thị banner, danh mục và món nổi bật từ dữ liệu, điều hướng đến đúng menu hoặc chi tiết món | Nguyễn Duy Quang Nhật | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 4 | Rà lại |
| [UI-11](../tasks/UI-11.md) | Xây dựng và nối API trang menu theo quán, hỗ trợ danh mục, tìm kiếm, bộ lọc và đồng bộ lựa chọn với URL | Nguyễn Duy Quang Nhật | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 6 | Rà lại |
| [UI-12](../tasks/UI-12.md) | Xây dựng trang chi tiết món, cho chọn tùy chọn, topping, số lượng, xem tạm tính và đánh giá trước khi thêm vào giỏ | Nguyễn Duy Quang Nhật | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 5 | 8 | Rà lại |
| [UI-13](../tasks/UI-13.md) | Xây dựng trang chọn chi nhánh, hiển thị địa chỉ, giờ mở và trạng thái nhận đơn rồi chuyển tới menu đúng quán | Nguyễn Duy Quang Nhật | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 2 | 3 | Rà lại |
| [UI-14](../tasks/UI-14.md) | Xây dựng dashboard nhân sự với thẻ thống kê, biểu đồ và bộ lọc, hiển thị số liệu backend đúng phạm vi vai trò | Mai Sơn Việt | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 2 | 3 | Rà lại |
| [UI-15](../tasks/UI-15.md) | Xây dựng và nối API quản lý tài khoản nhân sự, hỗ trợ tìm kiếm, tạo, khóa hoặc mở tài khoản và gán quán đúng quyền | Trần Nguyễn Hữu Khánh | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 5 | Rà lại |
| [UI-16](../tasks/UI-16.md) | Xây dựng và nối API quản lý đánh giá để nhân sự xem, phản hồi hoặc ẩn nội dung trong phạm vi được phép | Mai Sơn Việt | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 4 | Rà lại |
| [UI-17](../tasks/UI-17.md) | Xây dựng và nối API trang giỏ hàng, hỗ trợ sửa số lượng, ghi chú, xóa món và cập nhật tổng tạm tính trước checkout | Trần Đức Anh | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 5 | Rà lại |
| [UI-18](../tasks/UI-18.md) | Xây dựng và nối API checkout để chọn nhận hàng, áp dụng voucher hoặc điểm, xem chi tiết tiền và gửi yêu cầu tạo đơn | Trần Đức Anh | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 5 | 8 | Rà lại |
| [UI-19](../tasks/UI-19.md) | Xây dựng trang theo dõi đơn, tự cập nhật trạng thái bằng polling và hiển thị QR, thanh toán, thông tin giao hàng theo backend | Trần Đức Anh | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 5 | Rà lại |
| [UI-20](../tasks/UI-20.md) | Xây dựng và nối API lịch sử, chi tiết đơn và hóa đơn, hỗ trợ đặt lại món theo giá, trạng thái bán hiện hành | Trần Đức Anh | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 6 | Rà lại |
| [UI-21](../tasks/UI-21.md) | Xây dựng màn hồ sơ Customer, sổ địa chỉ và đổi mật khẩu với kiểm tra dữ liệu và phản hồi lỗi không làm mất form | Trần Nguyễn Hữu Khánh | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 5 | 8 | Giữ snapshot |
| [UI-22](../tasks/UI-22.md) | Xây dựng và nối API trang ưu đãi để Customer xem voucher khả dụng, điểm và hạng thành viên trước khi đặt hàng | Cao Tất Thành | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | — | 3 | 5 | Rà lại |
| [UI-23](../tasks/UI-23.md) | Xây dựng form gửi yêu cầu đặt tiệc, thu thông tin liên hệ và nhu cầu, không hiển thị như đơn đã được xác nhận thanh toán | Trần Đức Anh | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 2 | 3 | Giữ snapshot |
| [UI-24](../tasks/UI-24.md) | Xây dựng và nối API quản lý đơn cho nhân sự, hỗ trợ lọc, xem chi tiết, đổi trạng thái và duyệt hoặc từ chối hoàn tiền | Trần Đức Anh | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 5 | 8 | Rà lại |
| [UI-25](../tasks/UI-25.md) | Xây dựng và nối API form quản lý món, combo, tùy chọn và topping, hỗ trợ upload ảnh và giữ dữ liệu khi lưu lỗi | Nguyễn Duy Quang Nhật | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 5 | 10 | Rà lại |
| [UI-26](../tasks/UI-26.md) | Xây dựng và nối API quản lý chi nhánh, hỗ trợ danh sách, thêm, sửa, xóa, giờ mở và khu vực giao theo quyền | Nguyễn Duy Quang Nhật | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 6 | Rà lại |
| [UI-27](../tasks/UI-27.md) | Xây dựng và nối API màn thanh toán để tra cứu giao dịch, webhook log, xác nhận thủ công và cấu hình ngân hàng theo quyền | Lê Phú Thịnh | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 5 | 8 | Rà lại |
| [UI-28](../tasks/UI-28.md) | Xây dựng và nối API quản lý voucher thường; giữ phần đề xuất chi nhánh và banner ở trạng thái backlog, chưa triển khai nghiệp vụ | Cao Tất Thành | TO DO | 30/10/2026 08:00 | 31/10/2026 23:59 | — | 5 | 8 | Rà lại |
| [UI-29](../tasks/UI-29.md) | Xây dựng và nối API báo cáo, cho chọn kỳ, cửa hàng, xem biểu đồ và xuất Excel hoặc PDF đúng quyền | Mai Sơn Việt | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 6 | Rà lại |
| [UI-30](../tasks/UI-30.md) | Xây dựng và nối API màn đơn hàng tại quán để Staff xem đơn hôm nay, chuyển trạng thái hợp lệ và xác nhận đã thu COD | Trần Đức Anh | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 5 | Rà lại |
| [UI-31](../tasks/UI-31.md) | Xây dựng và nối API màn tồn kho tại quán, hiển thị cảnh báo sắp hết và cho nhân sự cập nhật tồn hoặc trạng thái bán | Nguyễn Duy Quang Nhật | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 4 | Rà lại |
| [UI-32](../tasks/UI-32.md) | Xây dựng và nối API danh sách thông báo trên hai ứng dụng, hiển thị chưa đọc, mở nội dung và đánh dấu đã đọc | Cao Tất Thành | TO DO | 30/10/2026 08:00 | 31/10/2026 23:59 | — | 3 | 5 | Rà lại |
| [UI-34](../tasks/UI-34.md) | Rà soát và sửa lỗi giao diện hai frontend về thương hiệu, responsive, khả năng tiếp cận và trạng thái dữ liệu, bàn giao kết quả kiểm chứng | Trần Nguyễn Hữu Khánh | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | — | 8 | 14 | Rà lại |
| [UI-39](../tasks/UI-39.md) | Viết Dockerfile cho Next.js và React để build image production và chạy độc lập với cấu hình môi trường phù hợp | Mai Sơn Việt | DONE | 28/10/2026 08:00 | 28/10/2026 23:59 | — | 3 | 4 | Giữ snapshot |
| [UI-40](../tasks/UI-40.md) | Kiểm tra Dockerfile và build image các module backend, xác nhận cách cấu hình và khởi chạy container độc lập | Mai Sơn Việt | DONE | 28/10/2026 08:00 | 28/10/2026 23:59 | — | 5 | 8 | Giữ snapshot |
| [UI-41](../tasks/UI-41.md) | Thiết lập CI frontend để chạy lint, kiểm thử và build trên pull request, báo lỗi rõ khi một bước không đạt | Mai Sơn Việt | DONE | 28/10/2026 08:00 | 28/10/2026 23:59 | — | 3 | 4 | Giữ snapshot |
| [UI-43](../tasks/UI-43.md) | Xây dựng component dùng chung cho giỏ và đơn hàng, gồm số lượng trên giỏ, nhãn trạng thái và thẻ thông tin đơn | Trần Đức Anh | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 2 | 3 | Giữ snapshot |
| [UI-44](../tasks/UI-44.md) | Xây dựng component QR, trạng thái thanh toán, phí giao và shipment, tích hợp hiển thị theo dữ liệu backend trong phạm vi MVP | Lê Phú Thịnh | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 2 | 3 | Rà lại |
| [UI-45](../tasks/UI-45.md) | Xây dựng component dùng chung cho nhãn voucher, hạng thành viên và mục thông báo, hiển thị trạng thái nhất quán giữa các màn | Cao Tất Thành | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | — | 2 | 3 | Giữ snapshot |
| [UI-46](../tasks/UI-46.md) | Sửa responsive và thao tác bàn phím trên giỏ hàng, checkout, lịch sử, chi tiết đơn và màn đơn hàng của nhân sự | Trần Đức Anh | DONE | 28/10/2026 08:00 | 28/10/2026 23:59 | — | 3 | 4 | Rà lại |
| [UI-47](../tasks/UI-47.md) | Sửa responsive và khả năng tiếp cận của QR, màn quản lý thanh toán và thông tin giao hàng, không che nội dung hoặc nút thao tác | Lê Phú Thịnh | DONE | 28/10/2026 08:00 | 28/10/2026 23:59 | — | 3 | 4 | Rà lại |
| [UI-48](../tasks/UI-48.md) | Sửa responsive và thao tác bàn phím trên voucher, điểm thành viên và thông báo, bảo đảm hiển thị với dữ liệu dài và đổi ngôn ngữ | Cao Tất Thành | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | — | 3 | 4 | Rà lại |
| [UI-49](../tasks/UI-49.md) | Xây dựng và nối luồng đăng nhập Google cho Customer, yêu cầu tài khoản mới nhập mật khẩu trước khi hoàn tất đăng nhập | Lê Phú Thịnh | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 5 | 6 | Rà lại |

## SPRINT 2

| ID | TASK | PIC | Trạng thái snapshot | Bắt đầu cũ | Deadline cũ | Dependency hiện hành | SP cũ | Giờ cũ | Ước lượng sau gộp |
|---|---|---|---|---|---|---|---:|---:|---|
| [BE-16](../tasks/BE-16.md) | Triển khai đăng ký Customer bằng email, gửi OTP và xác minh tài khoản bằng mã hợp lệ dùng một lần | Trần Nguyễn Hữu Khánh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-01, BE-09, BE-59, BE-64, BE-60 | 8 | 12 | Rà lại |
| [BE-17](../tasks/BE-17.md) | Triển khai đăng nhập, làm mới phiên, đăng xuất và đặt lại mật khẩu qua OTP, đồng bộ xác thực trên hai ứng dụng | Trần Nguyễn Hữu Khánh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-01, BE-09, BE-60, BE-64 | 8 | 16 | Rà lại |
| [BE-18](../tasks/BE-18.md) | Cung cấp API xem, sửa hồ sơ và quản lý sổ địa chỉ, bảo đảm mỗi khách chỉ có một địa chỉ mặc định | Trần Nguyễn Hữu Khánh | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-01, BE-09 | 5 | 8 | Rà lại |
| [BE-19](../tasks/BE-19.md) | Cung cấp API tạo, khóa nhân viên, gán cửa hàng cho Admin và xếp ca cho Manager đúng phạm vi quản lý | Trần Nguyễn Hữu Khánh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-01, BE-09 | 8 | 12 | Rà lại |
| [BE-21](../tasks/BE-21.md) | Cung cấp API quản lý cửa hàng, danh mục, món, combo và tùy chọn, kiểm tra quyền và lưu dữ liệu nhất quán | Nguyễn Duy Quang Nhật | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-02, BE-09, BE-10 | 13 | 24 | Rà lại |
| [BE-22](../tasks/BE-22.md) | Cung cấp API cập nhật tồn kho, bật hoặc tắt bán món theo chi nhánh và phản ánh thay đổi lên menu | Nguyễn Duy Quang Nhật | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-21 | 5 | 8 | Rà lại |
| [BE-24](../tasks/BE-24.md) | Cung cấp API xem trước đơn hàng, tính giá món, voucher, điểm và phí giao từ backend mà chưa tạo đơn hoặc thanh toán | Trần Đức Anh | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-23, BE-34, BE-33, BE-37 | 8 | 12 | Rà lại |
| [BE-25](../tasks/BE-25.md) | Triển khai tạo đơn từ checkout, chốt giá và trạng thái bán, khởi tạo thanh toán và chống tạo trùng khi gửi lại | Trần Đức Anh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-24, BE-20, BE-29, BE-09 | 13 | 20 | Rà lại |
| [BE-26](../tasks/BE-26.md) | Triển khai hủy hoặc từ chối đơn đúng quyền, đúng trạng thái và tạo yêu cầu hoàn tiền cho đơn đã chuyển khoản | Trần Đức Anh | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-25 | 5 | 8 | Rà lại |
| [BE-27](../tasks/BE-27.md) | Cung cấp API lịch sử, chi tiết và đặt lại đơn, lọc theo chủ sở hữu hoặc cửa hàng và dùng giá hiện hành khi đặt lại | Trần Đức Anh | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-25 | 8 | 12 | Rà lại |
| [BE-29](../tasks/BE-29.md) | Tạo thanh toán chuyển khoản và QR VietQR đúng đơn, số tiền, thời hạn; xử lý hết hạn mà không ghi nhận đã nhận tiền | Lê Phú Thịnh | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-04, BE-50 | 5 | 8 | Rà lại |
| [BE-30](../tasks/BE-30.md) | Tiếp nhận webhook SePay, xác thực chữ ký và đối chiếu mã đơn, số tiền để ghi nhận thanh toán đúng một lần | Lê Phú Thịnh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-29 | 8 | 14 | Rà lại |
| [BE-32](../tasks/BE-32.md) | Cung cấp API xác nhận chuyển khoản, thu COD, ghi nhận hoàn tiền và quản lý giao dịch, tài khoản ngân hàng theo quyền | Lê Phú Thịnh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-04, BE-09 | 8 | 14 | Rà lại |
| [BE-33](../tasks/BE-33.md) | Cung cấp API tính và cấu hình phí giao, đọc thông tin shipment ở trạng thái CREATED trong phạm vi MVP | Lê Phú Thịnh | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-06 | 5 | 8 | Rà lại |
| [BE-34](../tasks/BE-34.md) | Cung cấp API quản lý và áp dụng voucher toàn chuỗi hoặc từng quán, kiểm tra điều kiện và trả số tiền giảm hợp lệ | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-05, BE-51 | 8 | 12 | Rà lại |
| [BE-37](../tasks/BE-37.md) | Cung cấp API điểm và hạng thành viên, cấu hình tích hoặc đổi điểm và lưu biến động số dư không bị cộng, trừ lặp | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-05, BE-51 | 8 | 14 | Rà lại |
| [BE-38](../tasks/BE-38.md) | Cung cấp API danh sách thông báo, đánh dấu từng mục hoặc tất cả đã đọc và nối với giao diện đúng người nhận | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-07, BE-52, BE-09 | 3 | 6 | Rà lại |
| [KAFKA-12](../tasks/KAFKA-12.md) | Xử lý sự kiện Order, Payment để tạo thông báo và yêu cầu gửi email đúng người, chống trùng và không rollback nghiệp vụ khi email lỗi | Cao Tất Thành | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | KAFKA-01, BE-38, BE-62, BE-66, KAFKA-02, KAFKA-03 | 8 | 12 | Rà lại |
| [BE-40](../tasks/BE-40.md) | Cung cấp API tạo, sửa, xóa đánh giá món đã mua trong đơn hoàn tất và hiển thị đánh giá công khai hợp lệ | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-08, BE-09, BE-25 | 5 | 8 | Rà lại |
| [BE-41](../tasks/BE-41.md) | Cung cấp API phản hồi và ẩn đánh giá theo quyền, phạm vi quán, đồng thời ghi nhận thao tác quản trị | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-40 | 3 | 4 | Rà lại |
| [BE-42](../tasks/BE-42.md) | Cung cấp dashboard và báo cáo doanh thu theo quyền, hỗ trợ lọc kỳ, cửa hàng và xuất Excel hoặc PDF khớp số liệu | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-08, BE-09, KAFKA-07 | 13 | 20 | Rà lại |
| [BE-43](../tasks/BE-43.md) | Xây dựng Audit Service độc lập, sở hữu bảng audit_logs và cung cấp API tra cứu nhật ký quản trị theo quyền | Mai Sơn Việt | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | UI-03, UI-06, BE-09, BE-10 | 5 | 8 | Rà lại |
| [BE-44](../tasks/BE-44.md) | Cung cấp API trạng thái thanh toán, QR và thời hạn để giao diện cập nhật theo đơn mà không lộ dữ liệu ngoài quyền | Lê Phú Thịnh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-29, BE-09 | 5 | 6 | Rà lại |
| [BE-45](../tasks/BE-45.md) | Cung cấp chi tiết giao dịch ngân hàng, giải thích sai lệch đối soát và chuyển xử lý hợp lệ sang xác nhận thủ công | Lê Phú Thịnh | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-30 | 5 | 8 | Rà lại |
| [BE-46](../tasks/BE-46.md) | Triển khai duyệt hoặc từ chối yêu cầu hoàn tiền và ghi nhận REFUNDED đúng căn cứ, không hoàn trùng hoặc vượt số tiền | Lê Phú Thịnh | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | BE-32, BE-26 | 8 | 10 | Rà lại |
| [BE-48](../tasks/BE-48.md) | Triển khai quy tắc phí giao cơ bản, theo khoảng cách, ngưỡng miễn phí, cấu hình riêng từng quán và nhận hàng tại quán | Lê Phú Thịnh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-33 | 3 | 4 | Rà lại |
| [BE-49](../tasks/BE-49.md) | Bổ sung OpenAPI và payload mẫu Payment, Shipping để mô tả rõ request, response, quyền truy cập và webhook | Lê Phú Thịnh | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-30, BE-33, BE-13 | 3 | 4 | Giữ snapshot |
| [BE-54](../tasks/BE-54.md) | Kết nối menu qua Gateway và triển khai cache theo quán, làm mới dữ liệu khi giá hoặc trạng thái bán thay đổi | Nguyễn Duy Quang Nhật | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-20, BE-22, BE-12 | 5 | 8 | Rà lại |
| [BE-58](../tasks/BE-58.md) | Tạo điểm gọi Mail Sender để gửi một email qua Gmail adapter và trả rõ kết quả, lỗi hoặc trạng thái chưa xác định | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-57, BE-59 | 2 | 3 | Rà lại |
| [BE-60](../tasks/BE-60.md) | Triển khai gửi email qua Gmail SMTP với STARTTLS, App Password và timeout hữu hạn, trả rõ kết quả cho luồng gửi lại | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-57, BE-58 | 5 | 5 | Rà lại |
| [BE-61](../tasks/BE-61.md) | Triển khai render tiêu đề và nội dung email từ template, kiểm tra biến bắt buộc và chặn gửi mẫu lỗi | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-59 | 3 | 6 | Giữ snapshot |
| [BE-62](../tasks/BE-62.md) | Lưu trạng thái và lịch sử gửi email, chống tạo job trùng và bảo đảm nhiều worker không cùng xử lý một lần gửi | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-07, BE-59 | 5 | 8 | Rà lại |
| [BE-63](../tasks/BE-63.md) | Cung cấp API tra cứu chi tiết email log và lọc theo người nhận, trạng thái, mẫu, thời gian trong phạm vi quyền | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-62, BE-09 | 5 | 6 | Rà lại |
| [BE-64](../tasks/BE-64.md) | Soạn mẫu email OTP xác thực đăng ký và đặt lại mật khẩu, dùng đúng mã, mục đích và thời hạn do Identity cấp | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-61 | 2 | 3 | Rà lại |
| [BE-65](../tasks/BE-65.md) | Soạn mẫu email đơn hàng, thanh toán và hoàn tiền, phản ánh đúng trạng thái và số tiền trong sự kiện nghiệp vụ | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-61, BE-59 | 3 | 6 | Rà lại |
| [BE-66](../tasks/BE-66.md) | Triển khai gửi lại email lỗi tạm thời với khoảng chờ và giới hạn số lần, chuyển FAILED khi không thể gửi tiếp | Cao Tất Thành | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-60, BE-62 | 8 | 10 | Rà lại |
| [BE-67](../tasks/BE-67.md) | Ghi nhận email lỗi vĩnh viễn hoặc hết lượt gửi lại vào failure event/DLQ bền vững, kèm log đã che dữ liệu nhạy cảm | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-66, KAFKA-01 | 5 | 6 | Rà lại |
| [BE-70](../tasks/BE-70.md) | Triển khai adapter Cloudinary để upload hoặc thay ảnh món, combo qua backend và giữ metadata ảnh nhất quán khi lỗi | Nguyễn Duy Quang Nhật | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-68, BE-71 | 8 | 10 | Rà lại |
| [BE-71](../tasks/BE-71.md) | Định nghĩa và thực thi upload ảnh qua backend hoặc signed flow đã duyệt, kiểm tra quyền, loại nội dung và kích thước | Nguyễn Duy Quang Nhật | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-68, BE-09 | 5 | 6 | Rà lại |
| [BE-72](../tasks/BE-72.md) | Cung cấp API lưu, thay và đọc lại ảnh món hoặc combo, tích hợp giao diện quản trị và giữ ảnh đang dùng khi lưu lỗi | Nguyễn Duy Quang Nhật | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-70, BE-21 | 3 | 6 | Rà lại |
| [BE-74](../tasks/BE-74.md) | Xử lý lỗi upload và chống thao tác lặp, dọn ảnh Cloudinary cũ sau khi metadata commit và phục hồi cleanup thất bại | Nguyễn Duy Quang Nhật | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-70, BE-72 | 8 | 12 | Rà lại |
| [BE-75](../tasks/BE-75.md) | Chuẩn hóa DTO metadata ảnh và loại credential, payload nhạy cảm khỏi response, log và bundle frontend | Lê Phú Thịnh | TO DO | 02/11/2026 08:00 | 04/11/2026 23:59 | BE-10 | 3 | 4 | Rà lại |
| [BE-76](../tasks/BE-76.md) | Triển khai đăng nhập Google qua Firebase, xác minh ID token, yêu cầu tài khoản mới hoàn tất mật khẩu và phát JWT Clucky | Lê Phú Thịnh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-01, BE-09, BE-17, BE-12 | 13 | 20 | Rà lại |
| [DEP-09](../tasks/DEP-09.md) | Tổng hợp Postman collection từ từng service, cấu hình gọi qua Gateway và bàn giao request mẫu cho luồng chính cùng trường hợp lỗi | Mai Sơn Việt | TO DO | 04/11/2026 08:00 | 05/11/2026 23:59 | BE-09, BE-17, UI-05, BE-54, BE-20, BE-25, BE-23, BE-24, UI-17, UI-18, BE-29, BE-30, BE-32, BE-44, UI-19, UI-30, UI-44, BE-38, UI-32, BE-42, UI-14, UI-29 | 3 | 6 | Giữ snapshot |
| [DEP-10](../tasks/DEP-10.md) | Chuẩn bị kịch bản demo, ảnh minh chứng và slide Sprint Review, phân biệt rõ chức năng đã nghiệm thu với phần còn hạn chế | Trần Nguyễn Hữu Khánh | TO DO | 04/11/2026 08:00 | 05/11/2026 23:59 | BE-25, BE-16, BE-17, BE-20, BE-23, BE-24, BE-32, UI-09, UI-11, UI-17, UI-18, UI-30, BE-19, BE-42, UI-15, UI-29, BE-21, BE-34, UI-25, UI-26, UI-28, BE-09, BE-22, BE-26, BE-27, BE-33, BE-41, BE-43, BE-46, BE-63, BE-72 | 3 | 8 | Giữ snapshot |
| [KAFKA-02](../tasks/KAFKA-02.md) | Phát sự kiện tạo, đổi trạng thái, hoàn tất và hủy đơn sau khi Order commit, giữ eventId và correlationId khi gửi lại | Trần Đức Anh | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-25, KAFKA-01 | 5 | 6 | Rà lại |
| [KAFKA-03](../tasks/KAFKA-03.md) | Phát sự kiện xác nhận hoặc thất bại thanh toán và dữ liệu hết hạn, sai lệch, hoàn tiền theo contract cho các service nhận | Lê Phú Thịnh | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-30, BE-32, KAFKA-01 | 5 | 6 | Rà lại |
| [KAFKA-05](../tasks/KAFKA-05.md) | Xử lý sự kiện order.created để tạo một shipment CREATED cho mỗi đơn, không tạo trùng khi Kafka gửi lại | Lê Phú Thịnh | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | KAFKA-02, BE-06 | 3 | 4 | Rà lại |
| [KAFKA-06](../tasks/KAFKA-06.md) | Xử lý sự kiện order.completed để cộng điểm cho đúng khách, lưu biến động điểm và không cộng lại khi nhận sự kiện trùng | Cao Tất Thành | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | KAFKA-02, BE-37 | 5 | 6 | Rà lại |
| [KAFKA-07](../tasks/KAFKA-07.md) | Xử lý sự kiện Order và Payment để cập nhật thống kê từng quán theo ngày, không cộng doanh thu hai lần khi nhận lại sự kiện | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | KAFKA-02, KAFKA-03, BE-08 | 8 | 8 | Rà lại |
| [KAFKA-08](../tasks/KAFKA-08.md) | Triển khai retry, DLQ và xử lý sự kiện không lặp hiệu ứng cho Kafka consumer, hỗ trợ phát lại có kiểm soát khi khôi phục lỗi | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | KAFKA-01 | 8 | 10 | Rà lại |
| [KAFKA-09](../tasks/KAFKA-09.md) | Xử lý payment.failed để hủy đơn và giải phóng voucher, điểm đã giữ, bảo đảm các bước bù trừ không thực hiện trùng | Trần Đức Anh | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | KAFKA-03, BE-26, BE-34, BE-37 | 8 | 12 | Rà lại |
| [KAFKA-10](../tasks/KAFKA-10.md) | Phát sự kiện cho mọi thay đổi quản trị đã commit và ghi tập trung vào Audit Service, chống trùng và loại dữ liệu nhạy cảm | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | KAFKA-01, BE-43 | 5 | 6 | Rà lại |
| [BE-78](../tasks/BE-78.md) | Bổ sung log và chỉ số gửi email xuyên service, nối event, message, correlation ID để truy vết lỗi và các lần gửi lại | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-62, BE-67, BE-15 | 3 | 4 | Rà lại |
| [UI-52](../tasks/UI-52.md) | Xây dựng component upload ảnh dùng chung cho món và combo, có xem trước, tiến độ, hủy hoặc thử lại và phản hồi lỗi | Nguyễn Duy Quang Nhật | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-71 | 5 | 6 | Rà lại |

## BACKLOG

| ID | TASK | PIC | Trạng thái snapshot | Bắt đầu cũ | Deadline cũ | Dependency hiện hành | SP cũ | Giờ cũ | Ước lượng sau gộp |
|---|---|---|---|---|---|---|---:|---:|---|
| [BE-28](../tasks/BE-28.md) | Cung cấp API gửi và tiếp nhận yêu cầu đặt tiệc, phân quyền xử lý mà không tự coi yêu cầu là đơn đã duyệt hoặc thanh toán | Trần Đức Anh | TO DO | Chưa xếp | Chưa xếp | BE-03, BE-09 | 5 | 8 | Giữ snapshot |
| [BE-31](../tasks/BE-31.md) | Tích hợp webhook Casso khi được chọn sử dụng, xác thực giao dịch và đối soát thanh toán mà không ghi nhận trùng | Lê Phú Thịnh | TO DO | Chưa xếp | Chưa xếp | BE-29 | 8 | 12 | Giữ snapshot |
| [BE-35](../tasks/BE-35.md) | Triển khai luồng Manager đề xuất voucher cho quán và Admin phê duyệt trước khi voucher được dùng tại checkout | Cao Tất Thành | TO DO | Chưa xếp | Chưa xếp | BE-34 | 5 | 8 | Giữ snapshot |
| [BE-36](../tasks/BE-36.md) | Cung cấp API quản lý banner và upload, thay ảnh Cloudinary để trang chủ hiển thị banner hợp lệ, giữ ảnh cũ khi lỗi | Cao Tất Thành | TO DO | Chưa xếp | Chưa xếp | BE-05, BE-70, BE-74 | 8 | 12 | Rà lại |
| [BE-47](../tasks/BE-47.md) | Triển khai gán shipper, cập nhật trạng thái và lưu lịch sử giao hàng sau CREATED khi Phase 2 được duyệt | Lê Phú Thịnh | TO DO | Chưa xếp | Chưa xếp | BE-33 | 8 | 16 | Giữ snapshot |
| [DEP-01](../tasks/DEP-01.md) | Chuẩn bị VPS với Docker, Compose và cấu hình cổng mạng, chỉ công khai dịch vụ cần thiết để triển khai hệ thống | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | UI-06 | 3 | 4 | Giữ snapshot |
| [DEP-02](../tasks/DEP-02.md) | Triển khai toàn bộ hệ thống bằng Docker Compose, nạp đúng cấu hình và khởi động theo thứ tự phụ thuộc của các dịch vụ | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-01 | 5 | 6 | Giữ snapshot |
| [DEP-03](../tasks/DEP-03.md) | Cấu hình Nginx reverse proxy và HTTPS Let's Encrypt để truy cập hai frontend, API qua đúng tên miền và đường dẫn | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-02 | 3 | 4 | Giữ snapshot |
| [DEP-04](../tasks/DEP-04.md) | Cấu hình tên miền, CORS và trusted origins để chỉ hai frontend được phép gọi API với thông tin xác thực | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-03 | 3 | 3 | Giữ snapshot |
| [DEP-05](../tasks/DEP-05.md) | Cấu hình và xác minh healthcheck, readiness của từng container cùng dependency, không chỉ kiểm tra tiến trình đang chạy | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-02 | 2 | 3 | Giữ snapshot |
| [DEP-06](../tasks/DEP-06.md) | Xác minh bản triển khai trên VPS bằng luồng đăng nhập, duyệt menu, tạo đơn COD và chuyển khoản trong phạm vi được phép | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-04, DEP-05, BE-25, BE-16, BE-17, BE-20, BE-23, BE-24, BE-32, UI-09, UI-11, UI-17, UI-18, UI-30, BE-29, BE-30, BE-44, UI-19, UI-44 | 5 | 6 | Giữ snapshot |
| [DEP-07](../tasks/DEP-07.md) | Thiết lập sao lưu database hằng ngày, giữ bảy bản và thực hiện khôi phục thử để xác nhận bản sao lưu sử dụng được | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-02 | 5 | 6 | Giữ snapshot |
| [DEP-08](../tasks/DEP-08.md) | Hoàn thiện README hướng dẫn cài đặt, cấu hình và chạy dự án, kèm kiến trúc và tài liệu API đúng bản bàn giao | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-06, DEP-09 | 3 | 6 | Giữ snapshot |
| [DEP-11](../tasks/DEP-11.md) | Rà soát phạm vi phát hành, lỗi còn mở và khả năng rollback, sau đó gắn tag cho đúng phiên bản được duyệt | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-06, DEP-07, DEP-08, DEP-10 | 3 | 4 | Giữ snapshot |
| [DEP-12](../tasks/DEP-12.md) | Bàn giao cấu hình môi trường, quyền truy cập và quy trình rollback cho người vận hành qua kênh an toàn, không lộ secret | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-11 | 5 | 6 | Giữ snapshot |
| [DEP-20](../tasks/DEP-20.md) | Xác minh gửi email an toàn trên production và bảo đảm email_logs được sao lưu, khôi phục cùng database | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-06, BE-60 | 5 | 4 | Giữ snapshot |
| [DEP-22](../tasks/DEP-22.md) | Xác minh upload, đọc ảnh và sao lưu metadata trên production, bảo đảm cleanup không xóa asset vẫn đang được sử dụng | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-06, BE-74 | 5 | 6 | Giữ snapshot |
| [BE-77](../tasks/BE-77.md) | Triển khai upload hoặc thay avatar qua Identity, lưu metadata Cloudinary và chỉ cho phép người dùng sửa ảnh của mình | Trần Nguyễn Hữu Khánh | TO DO | Chưa xếp | Chưa xếp | BE-18, BE-70, BE-74 | 5 | 8 | Giữ snapshot |
| [KAFKA-04](../tasks/KAFKA-04.md) | Phát sự kiện promotion.approved sau khi Admin duyệt voucher chi nhánh, kèm định danh để truy vết và chống xử lý lặp | Cao Tất Thành | TO DO | Chưa xếp | Chưa xếp | BE-35, KAFKA-01 | 3 | 4 | Giữ snapshot |
| [KAFKA-11](../tasks/KAFKA-11.md) | Thống nhất và tích hợp sự kiện khuyến mãi đã duyệt từ Promotion sang Notification, đủ dữ liệu chọn email và người nhận | Cao Tất Thành | TO DO | Chưa xếp | Chưa xếp | KAFKA-04, KAFKA-12 | 3 | 4 | Giữ snapshot |
| [UI-51](../tasks/UI-51.md) | Hiển thị trạng thái email liên quan đến đơn hoặc thanh toán cho Customer khi có contract được duyệt, không coi email lỗi là đơn lỗi | Trần Đức Anh | TO DO | Chưa xếp | Chưa xếp | KAFKA-12, BE-27 | 3 | 4 | Giữ snapshot |
| [UI-50](../tasks/UI-50.md) | Xây dựng màn tra cứu email log theo bộ lọc, xem chi tiết và gửi lại email lỗi khi API, quyền và chính sách được chốt | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | BE-63 | 5 | 8 | Giữ snapshot |

## Audit Service riêng cho trang quản trị — cập nhật 02/11/2026

- Tách Audit Service khỏi Review & Report, nâng thiết kế lên 9 service nghiệp vụ. Bảng duy nhất là `audit_service.audit_logs`; BE-08 không còn phụ trách audit. Đây là thay đổi thiết kế/backlog, chưa triển khai service hoặc chuyển dữ liệu DB đang chạy.
- Ghi mọi thay đổi thành công trên trang quản trị của Staff/Manager/Admin: tài khoản/phân quyền, cửa hàng/menu/giá/kho, đơn hàng, thanh toán/hoàn tiền, khuyến mãi/điểm, cấu hình và đánh giá. Backend domain phát sự kiện với actor/role đáng tin cậy, store, action, target, dữ liệu trước–sau đã lọc secret, thời gian, source service, eventId/correlationId; không lấy audit trực tiếp từ frontend.
- BE-43 xây base Audit Service, migration/entity/repository và API đọc `/api/audit-logs` qua Gateway; cấu hình qua Config Server, discovery qua Eureka. KAFKA-10 tích hợp producer ở các domain và consumer tại Audit Service, chống trùng bằng eventId. Không ghi SQL xuyên service, không có API sửa/xóa audit.
- Admin tra cứu toàn hệ thống; Manager chỉ xem thao tác của Staff thuộc quán mình theo RBAC. Backend kiểm tra quyền và `storeId`; không lưu secret trong audit.
- Giữ ID, PIC, lịch và trạng thái task; đổi dependency để BE-43 xây base trước KAFKA-10. SP/giờ đang giữ số kế hoạch cũ, cần ước lượng lại BE-43/KAFKA-10 vì thêm service và mở rộng coverage producer. Cập nhật này chỉ ở repository, chưa đồng bộ lên Lark.


## Ghi nhận phạm vi Payment ngày 04/11/2026 — chưa xếp sprint

Theo quyết định của Lê Phú Thịnh, ghi nhận các đầu việc sau cho sprint sau; chưa cấp task ID, PIC chính thức, SP, deadline hoặc đồng bộ Lark. Không cộng vào số lượng task snapshot hiện tại:

- Tra soát/hỗ trợ khách sửa hoặc thiếu nội dung chuyển khoản `Clucky-...`.
- Xử lý thiếu/thừa tiền, tiền đến sau expiry/hủy đơn và khoản chuyển thêm cho đơn đã thanh toán: reconciliation, compensation/refund và quy trình CSKH theo policy được duyệt sau.
- Mỗi trường hợp cần AC về phân quyền, bằng chứng đối soát và idempotency trước triển khai. Hiện tại không tự sửa số tiền, reopen Order hay xác nhận thành công cho các trường hợp này.
- Không hoãn baseline an toàn: xác thực webhook, chống xử lý lặp cùng transaction id, ghi nhận bền vững tối thiểu không lộ secret, ACK/retry đúng provider và không xác nhận nhầm đơn vẫn thuộc Sprint 2. Giao dịch khách chuyển lần nữa có transaction id mới khác với webhook retry cùng id.
- Phạm vi mới thay đổi phần reconciliation nâng cao trong BE-45/INT-49 và late-payment trong INT-50; cần đồng bộ AC/task detail khi chốt triển khai, không đánh DONE theo AC cũ.

Chi tiết quyết định đã chốt và đề xuất chờ duyệt: [Kế hoạch Sprint 2 của Lê Phú Thịnh, mục 8](Sprint_2_Le_Phu_Thinh_Plan.md#8-làm-rõ-với-pic-ngày-04112026).


## Lịch sử

Các số 184 task, 43 INT, 14 TEST, 48 ID gộp, estimate/lịch và đồng bộ 30/10–02/11 là snapshot trước phân loại, không phải hiện hành. Xem snapshot đầu trang và lịch sử Git. Báo cáo 07/11 liệt kê 48 ID cũ và 59 quyết định gộp/đổi mã mới.
