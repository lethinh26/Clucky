# Backlog Clucky

> **Sizing Sprint 3 ngày 09/11/2026 đã đồng bộ Lark:** 27 TASK/**94 SP** (trước đó 149 SP), chỉ dùng 0/1/2/3/5/8, tối đa 8. Rà lại 25 task chưa DONE, giữ điểm hai task DONE; không đổi PIC/status/sprint/giờ công hoặc scope. Điểm trong 25 dòng tương ứng bên dưới đã cập nhật; các tổng/sprint cũ là lịch sử. Bộ spec RBAC A–E đang ở kế hoạch bổ sung, chưa tạo task hoặc tính vào 94 SP; số điểm mới không chứng minh công việc ít đi hoặc đủ capacity.

> **Loyalty — cập nhật implementation 08/11/2026:** BE-37/BE-51, UI-22/UI-18, BE-24/BE-25, KAFKA-06/KAFKA-09 có [contract, task detail bổ sung và checklist nghiệm thu](../specs/loyalty-end-to-end.md). Chưa chạy AC chức năng, không đổi trạng thái/PIC/SP/sprint và không đồng bộ Lark. Hoàn tiền sau COMPLETED còn chờ xác nhận refund thực tế và chính sách thu hồi điểm; không coi toàn bộ loyalty đã nghiệm thu.

> **Cập nhật sprint tiếp theo ngày 08/11/2026:** đã chuyển 14 task Sprint 2 chưa DONE sang Sprint 3. Sprint 2 hiện còn **21 task/137 SP, đều DONE**; Sprint 3 có **27 task/149 SP**, gồm 25 task chưa DONE/143 SP. Các số sprint ở phần đồng bộ trước và bảng kế hoạch bên dưới là snapshot cũ. [Thống kê Sprint 3 và danh sách đầy đủ](Sprint_3_Status_2026-11-08.md).

**Phân loại hiện hành và đã đồng bộ Lark: 08/11/2026 · UTC+7.** [Kết quả đồng bộ, record đã xoá và chênh lệch sprint](Lark_Backlog_Sync_2026-11-08.md).

**Cập nhật 08/11/2026:** đã đồng bộ 124 title/detail/TASK chính/dependency, cập nhật SP cho 37 task và xoá 60 record đã gộp sau khi chuyển dữ liệu. Giữ nguyên PIC, trạng thái và sprint/lịch thực tế của record đích trên Lark.

**Phân biệt kế hoạch và tiến độ trực tiếp:** các bảng dưới là tập kế hoạch/snapshot, gồm 37 TASK/247 SP đã sizing. Theo trường Sprint thực tế trên Lark sau đồng bộ, Sprint 2 có **35 TASK/218 SP**; không ép các task đã chuyển Sprint 3 về kế hoạch cũ. Trạng thái/PIC/lịch trực tiếp trên Lark ưu tiên hơn metadata trong bảng.

124 TASK chính: **53 BE + 45 UI + 12 KAFKA + 14 DEP**. Sprint 2 còn **37 TASK**. Không còn INT/TEST độc lập hoặc subtask. Gộp 28 INT + 14 TEST; đổi mã 17 công việc, không xóa implementation.

[Báo cáo phân loại 07/11 — lịch sử](Backlog_Reclassification_2026-11-07.md) · [Chỉ mục](../tasks/README.md) · [Snapshot trước phân loại](backlog-before-2026-11-07.md) · [Lark — đã đồng bộ phân loại và detail](https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&view=vewC0rB72n)

**Detail thống nhất 08/11:** [37 task đã viết lại phạm vi, AC/DoD, fixture và handoff](Sprint_2_Task_Details_2026-11-08.md); bản ghép cũ chỉ lưu lịch sử. Không đổi 247 SP/PIC/trạng thái, không sửa UI header.

## Quy ước

- Mọi dòng có **Loại = TASK**, không có parent/subtask. KAFKA là nhóm producer/consumer/event/retry/DLQ.
- Dev triển khai, tự test/sửa lỗi/retest theo AC/DoD trực tiếp trong task. Đầu mối phối hợp evidence xuyên service, không lập lại INT/TEST.
- 37 DONE trong bảng là snapshot cũ. Đã đọc lại Lark: 63 DONE, 6 IN-PROGRESS, 55 TO DO trên 124 record giữ lại; không đổi tiến độ hoặc xác nhận AC mới đã đạt vì sửa tài liệu.
- Lịch cũ để truy vết: S1 26/10–01/11; S2 khung 02–08/11, hạn cũ 05/11, Review 06/11. Không phải lịch cam kết mới ngày 08/11; không tự xếp lịch bù.
- **Sprint 2 đã sizing lại: 37 TASK, 247 SP kế hoạch mới.** Cột SP Sprint 2 dùng điểm 08/11; 328 SP nguồn chỉ còn lịch sử ở báo cáo sizing. Giờ công vẫn snapshot, không quy đổi từ SP; không suy remaining/capacity/công tiết kiệm. Sprint 1 và backlog chưa xếp lịch chưa được sizing lại trong lượt này.
- Dependency dùng TASK hiện hành; handoff nghiệm thu phần gộp nằm tại đầu mối. ID cũ chỉ chuyển hướng, không tính/giao task.
- TEST-13/14 chuyển vào BE-54/25 nhưng giữ nhãn HOÃN, không kéo performance/load vào sprint. Backlog/Phase 2 vẫn hoãn; shipment MVP chỉ CREATED.
- Người dùng/dev tự kiểm thử; lượt này không chạy test/lint/typecheck/build/browser/Docker/backend/hạ tầng.

[Báo cáo gộp Sprint 2 ngày 08/11](Sprint_2_Consolidation_2026-11-08.md) · [Snapshot trước gộp lần này](backlog-before-2026-11-08.md)

[Ước lượng lại đủ 37 task: 247 SP, cơ sở và phân bổ theo PIC](Sprint_2_Story_Points_2026-11-08.md)

## Tổng quan

| Phân bổ lịch snapshot | TASK | DONE snapshot | Chưa DONE snapshot |
|---|---:|---:|---:|
| SPRINT 1 | 65 | 37 | 28 |
| SPRINT 2 | 37 | 0 | 37 |
| BACKLOG | 22 | 0 | 22 |
| **Tổng** | **124** | **37** | **87** |

## SPRINT 1

| ID | TASK | PIC | Trạng thái snapshot | Bắt đầu cũ | Deadline cũ | Dependency hiện hành | SP nguồn (tham chiếu) | Giờ nguồn (tham chiếu) | Ước lượng sau gộp |
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
| [BE-57](../tasks/BE-57.md) | Cấu hình Mail Sender qua Config Server và biến môi trường, kiểm tra cấu hình và bảo vệ Gmail App Password | Cao Tất Thành | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | UI-03 | 1 | 4 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
| [BE-59](../tasks/BE-59.md) | Định nghĩa và kiểm tra email command gồm người nhận, mẫu, biến nội dung và ID phục vụ truy vết, chống xử lý trùng | Cao Tất Thành | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | UI-03 | 1 | 3 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
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

| ID | TASK | PIC | Trạng thái snapshot | Bắt đầu cũ | Deadline cũ | Dependency hiện hành | SP kế hoạch (08/11) | Giờ nguồn (tham chiếu) | Ước lượng sau gộp |
|---|---|---|---|---|---|---|---:|---:|---|
| [BE-17](../tasks/BE-17.md) | Hoàn thiện xác thực tài khoản: đăng ký và OTP, đăng nhập, làm mới phiên, đăng xuất và đặt lại mật khẩu trên hai ứng dụng | Trần Nguyễn Hữu Khánh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-01, BE-09, BE-60, BE-59 | 13 | 28 | SP mới 08/11; giờ công vẫn snapshot |
| [BE-18](../tasks/BE-18.md) | Cung cấp API xem, sửa hồ sơ và quản lý sổ địa chỉ, bảo đảm mỗi khách chỉ có một địa chỉ mặc định | Trần Nguyễn Hữu Khánh | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-01, BE-09 | 2 | 8 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
| [BE-19](../tasks/BE-19.md) | Cung cấp API tạo, khóa nhân viên, gán cửa hàng cho Admin và xếp ca cho Manager đúng phạm vi quản lý | Trần Nguyễn Hữu Khánh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-01, BE-09 | 3 | 12 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
| [BE-21](../tasks/BE-21.md) | Cung cấp API quản lý cửa hàng, danh mục, món, combo và tùy chọn, kiểm tra quyền và lưu dữ liệu nhất quán | Nguyễn Duy Quang Nhật | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-02, BE-09, BE-10 | 8 | 24 | SP mới 08/11; giờ công vẫn snapshot |
| [BE-22](../tasks/BE-22.md) | Cung cấp API cập nhật tồn kho, bật hoặc tắt bán món theo chi nhánh và phản ánh thay đổi lên menu | Nguyễn Duy Quang Nhật | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-21 | 3 | 8 | SP mới 08/11; giờ công vẫn snapshot |
| [BE-24](../tasks/BE-24.md) | Cung cấp API xem trước đơn hàng, tính giá món, voucher, điểm và phí giao từ backend mà chưa tạo đơn hoặc thanh toán | Trần Đức Anh | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-23, BE-34, BE-33, BE-37 | 8 | 12 | SP mới 08/11; giờ công vẫn snapshot |
| [BE-25](../tasks/BE-25.md) | Triển khai tạo đơn từ checkout, chốt giá và trạng thái bán, khởi tạo thanh toán và chống tạo trùng khi gửi lại | Trần Đức Anh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-24, BE-20, BE-29, BE-09 | 13 | 20 | SP mới 08/11; giờ công vẫn snapshot |
| [BE-26](../tasks/BE-26.md) | Triển khai hủy hoặc từ chối đơn đúng quyền, đúng trạng thái và tạo yêu cầu hoàn tiền cho đơn đã chuyển khoản | Trần Đức Anh | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-25 | 5 | 8 | SP mới 08/11; giờ công vẫn snapshot |
| [BE-27](../tasks/BE-27.md) | Cung cấp API lịch sử, chi tiết và đặt lại đơn, lọc theo chủ sở hữu hoặc cửa hàng và dùng giá hiện hành khi đặt lại | Trần Đức Anh | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-25 | 5 | 12 | SP mới 08/11; giờ công vẫn snapshot |
| [BE-29](../tasks/BE-29.md) | Cung cấp luồng QR chuyển khoản, thời hạn và tra cứu trạng thái thanh toán, kèm contract và tài liệu tích hợp Payment/Shipping | Lê Phú Thịnh | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-04, BE-50, BE-09, BE-13 | 5 | 18 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
| [BE-30](../tasks/BE-30.md) | Tiếp nhận webhook SePay, xác thực chữ ký và đối chiếu mã đơn, số tiền để ghi nhận thanh toán đúng một lần | Lê Phú Thịnh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-29 | 5 | 14 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
| [BE-32](../tasks/BE-32.md) | Hoàn thiện quản lý thanh toán: tra cứu và đối soát giao dịch, xác nhận chuyển khoản hoặc COD, duyệt hoàn tiền và cấu hình ngân hàng | Lê Phú Thịnh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-04, BE-09, BE-30, BE-26 | 8 | 32 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
| [BE-33](../tasks/BE-33.md) | Hoàn thiện tính và cấu hình phí giao theo quán, khoảng cách, ngưỡng miễn phí và nhận tại quán, kèm API đọc shipment MVP | Lê Phú Thịnh | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-06 | 3 | 12 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
| [BE-34](../tasks/BE-34.md) | Cung cấp API quản lý và áp dụng voucher toàn chuỗi hoặc từng quán, kiểm tra điều kiện và trả số tiền giảm hợp lệ | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-05, BE-51 | 3 | 12 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
| [BE-37](../tasks/BE-37.md) | Cung cấp API điểm và hạng thành viên, cấu hình tích hoặc đổi điểm và lưu biến động số dư không bị cộng, trừ lặp | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-05, BE-51 | 5 | 14 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
| [BE-38](../tasks/BE-38.md) | Cung cấp API danh sách thông báo, đánh dấu từng mục hoặc tất cả đã đọc và nối với giao diện đúng người nhận | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-07, BE-52, BE-09 | 3 | 6 | SP mới 08/11; giờ công vẫn snapshot |
| [KAFKA-12](../tasks/KAFKA-12.md) | Xử lý sự kiện Order, Payment để tạo thông báo và yêu cầu gửi email đúng người, chống trùng và không rollback nghiệp vụ khi email lỗi | Cao Tất Thành | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | KAFKA-01, BE-38, BE-62, KAFKA-02, KAFKA-03 | 8 | 12 | SP mới 08/11; giờ công vẫn snapshot |
| [BE-40](../tasks/BE-40.md) | Hoàn thiện đánh giá món đã mua: khách tạo, sửa, xóa; nhân sự phản hồi hoặc ẩn nội dung đúng quyền và cửa hàng | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-08, BE-09, BE-25 | 3 | 12 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
| [BE-42](../tasks/BE-42.md) | Cung cấp dashboard và báo cáo doanh thu theo quyền, hỗ trợ lọc kỳ, cửa hàng và xuất Excel hoặc PDF khớp số liệu | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-08, BE-09, KAFKA-07 | 5 | 20 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
| [BE-43](../tasks/BE-43.md) | Xây dựng Audit Service độc lập, sở hữu bảng audit_logs và cung cấp API tra cứu nhật ký quản trị theo quyền | Mai Sơn Việt | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | UI-03, UI-06, BE-09, BE-10 | 5 | 8 | SP mới 08/11; giờ công vẫn snapshot |
| [BE-54](../tasks/BE-54.md) | Kết nối menu qua Gateway và triển khai cache theo quán, làm mới dữ liệu khi giá hoặc trạng thái bán thay đổi | Nguyễn Duy Quang Nhật | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-20, BE-22, BE-12 | 5 | 8 | SP mới 08/11; giờ công vẫn snapshot |
| [BE-60](../tasks/BE-60.md) | Hoàn thiện gửi email nghiệp vụ qua Gmail SMTP: kiểm tra đầu vào, render mẫu OTP, đơn hàng, thanh toán và hoàn tiền, trả rõ kết quả gửi | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-57, BE-59 | 5 | 23 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
| [BE-62](../tasks/BE-62.md) | Quản lý vòng đời gửi email: lưu trạng thái, chống job trùng, phục hồi worker và gửi lại có giới hạn trước khi chuyển FAILED | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-07, BE-59, BE-60 | 5 | 18 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
| [BE-63](../tasks/BE-63.md) | Hoàn thiện vận hành email: ghi nhận failure/DLQ bền vững, truy vết các lần gửi và cung cấp API tra cứu log đúng quyền | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-62, BE-09, KAFKA-01, BE-15 | 5 | 16 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
| [BE-72](../tasks/BE-72.md) | Hoàn thiện upload và thay ảnh món, combo từ giao diện đến Cloudinary: kiểm tra file, lưu metadata, xử lý lỗi và dọn ảnh an toàn | Nguyễn Duy Quang Nhật | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-21, BE-68, BE-09 | 13 | 40 | SP mới 08/11; giờ công vẫn snapshot |
| [BE-75](../tasks/BE-75.md) | Chuẩn hóa DTO metadata ảnh và loại credential, payload nhạy cảm khỏi response, log và bundle frontend | Lê Phú Thịnh | TO DO | 02/11/2026 08:00 | 04/11/2026 23:59 | BE-10 | 2 | 4 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
| [BE-76](../tasks/BE-76.md) | Triển khai đăng nhập Google qua Firebase, xác minh ID token, yêu cầu tài khoản mới hoàn tất mật khẩu và phát JWT Clucky | Lê Phú Thịnh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-01, BE-09, BE-17, BE-12 | 8 | 20 | SP mới 08/11; giờ công vẫn snapshot |
| [DEP-09](../tasks/DEP-09.md) | Tổng hợp Postman collection từ từng service, cấu hình gọi qua Gateway và bàn giao request mẫu cho luồng chính cùng trường hợp lỗi | Mai Sơn Việt | TO DO | 04/11/2026 08:00 | 05/11/2026 23:59 | BE-09, BE-17, UI-05, BE-54, BE-20, BE-25, BE-23, BE-24, UI-17, UI-18, BE-29, BE-30, BE-32, UI-19, UI-30, UI-44, BE-38, UI-32, BE-42, UI-14, UI-29 | 2 | 6 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
| [DEP-10](../tasks/DEP-10.md) | Chuẩn bị kịch bản demo, ảnh minh chứng và slide Sprint Review, phân biệt rõ chức năng đã nghiệm thu với phần còn hạn chế | Trần Nguyễn Hữu Khánh | TO DO | 04/11/2026 08:00 | 05/11/2026 23:59 | BE-25, BE-17, BE-20, BE-23, BE-24, BE-32, UI-09, UI-11, UI-17, UI-18, UI-30, BE-19, BE-42, UI-15, UI-29, BE-21, BE-34, UI-25, UI-26, UI-28, BE-09, BE-22, BE-26, BE-27, BE-33, BE-40, BE-43, BE-63, BE-72 | 1 | 8 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
| [KAFKA-02](../tasks/KAFKA-02.md) | Phát sự kiện tạo, đổi trạng thái, hoàn tất và hủy đơn sau khi Order commit, giữ eventId và correlationId khi gửi lại | Trần Đức Anh | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-25, KAFKA-01 | 5 | 6 | SP mới 08/11; giờ công vẫn snapshot |
| [KAFKA-03](../tasks/KAFKA-03.md) | Phát sự kiện xác nhận hoặc thất bại thanh toán và dữ liệu hết hạn, sai lệch, hoàn tiền theo contract cho các service nhận | Lê Phú Thịnh | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-30, BE-32, KAFKA-01 | 3 | 6 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
| [KAFKA-05](../tasks/KAFKA-05.md) | Xử lý sự kiện order.created để tạo một shipment CREATED cho mỗi đơn, không tạo trùng khi Kafka gửi lại | Lê Phú Thịnh | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | KAFKA-02, BE-06 | 2 | 4 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
| [KAFKA-06](../tasks/KAFKA-06.md) | Xử lý sự kiện order.completed để cộng điểm cho đúng khách, lưu biến động điểm và không cộng lại khi nhận sự kiện trùng | Cao Tất Thành | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | KAFKA-02, BE-37 | 5 | 6 | SP mới 08/11; giờ công vẫn snapshot |
| [KAFKA-07](../tasks/KAFKA-07.md) | Xử lý sự kiện Order và Payment để cập nhật thống kê từng quán theo ngày, không cộng doanh thu hai lần khi nhận lại sự kiện | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | KAFKA-02, KAFKA-03, BE-08 | 8 | 8 | SP mới 08/11; giờ công vẫn snapshot |
| [KAFKA-08](../tasks/KAFKA-08.md) | Triển khai retry, DLQ và xử lý sự kiện không lặp hiệu ứng cho Kafka consumer, hỗ trợ phát lại có kiểm soát khi khôi phục lỗi | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | KAFKA-01 | 5 | 10 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
| [KAFKA-09](../tasks/KAFKA-09.md) | Xử lý payment.failed để hủy đơn và giải phóng voucher, điểm đã giữ, bảo đảm các bước bù trừ không thực hiện trùng | Trần Đức Anh | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | KAFKA-03, BE-26, BE-34, BE-37 | 8 | 12 | SP mới 08/11; giờ công vẫn snapshot |
| [KAFKA-10](../tasks/KAFKA-10.md) | Phát sự kiện cho mọi thay đổi quản trị đã commit và ghi tập trung vào Audit Service, chống trùng và loại dữ liệu nhạy cảm | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | KAFKA-01, BE-43 | 5 | 6 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |


## BACKLOG

| ID | TASK | PIC | Trạng thái snapshot | Bắt đầu cũ | Deadline cũ | Dependency hiện hành | SP nguồn (tham chiếu) | Giờ nguồn (tham chiếu) | Ước lượng sau gộp |
|---|---|---|---|---|---|---|---:|---:|---|
| [BE-28](../tasks/BE-28.md) | Cung cấp API gửi và tiếp nhận yêu cầu đặt tiệc, phân quyền xử lý mà không tự coi yêu cầu là đơn đã duyệt hoặc thanh toán | Trần Đức Anh | TO DO | Chưa xếp | Chưa xếp | BE-03, BE-09 | 5 | 8 | Giữ snapshot |
| [BE-31](../tasks/BE-31.md) | Tích hợp webhook Casso khi được chọn sử dụng, xác thực giao dịch và đối soát thanh toán mà không ghi nhận trùng | Lê Phú Thịnh | TO DO | Chưa xếp | Chưa xếp | BE-29 | 8 | 12 | Giữ snapshot |
| [BE-35](../tasks/BE-35.md) | Triển khai luồng Manager đề xuất voucher cho quán và Admin phê duyệt trước khi voucher được dùng tại checkout | Cao Tất Thành | TO DO | Chưa xếp | Chưa xếp | BE-34 | 5 | 8 | Giữ snapshot |
| [BE-36](../tasks/BE-36.md) | Cung cấp API quản lý banner và upload, thay ảnh Cloudinary để trang chủ hiển thị banner hợp lệ, giữ ảnh cũ khi lỗi | Cao Tất Thành | TO DO | Chưa xếp | Chưa xếp | BE-05, BE-72 | 5 | 12 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
| [BE-47](../tasks/BE-47.md) | Triển khai gán shipper, cập nhật trạng thái và lưu lịch sử giao hàng sau CREATED khi Phase 2 được duyệt | Lê Phú Thịnh | TO DO | Chưa xếp | Chưa xếp | BE-33 | 8 | 16 | Giữ snapshot |
| [DEP-01](../tasks/DEP-01.md) | Chuẩn bị VPS với Docker, Compose và cấu hình cổng mạng, chỉ công khai dịch vụ cần thiết để triển khai hệ thống | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | UI-06 | 3 | 4 | Giữ snapshot |
| [DEP-02](../tasks/DEP-02.md) | Triển khai toàn bộ hệ thống bằng Docker Compose, nạp đúng cấu hình và khởi động theo thứ tự phụ thuộc của các dịch vụ | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-01 | 5 | 6 | Giữ snapshot |
| [DEP-03](../tasks/DEP-03.md) | Cấu hình Nginx reverse proxy và HTTPS Let's Encrypt để truy cập hai frontend, API qua đúng tên miền và đường dẫn | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-02 | 3 | 4 | Giữ snapshot |
| [DEP-04](../tasks/DEP-04.md) | Cấu hình tên miền, CORS và trusted origins để chỉ hai frontend được phép gọi API với thông tin xác thực | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-03 | 3 | 3 | Giữ snapshot |
| [DEP-05](../tasks/DEP-05.md) | Cấu hình và xác minh healthcheck, readiness của từng container cùng dependency, không chỉ kiểm tra tiến trình đang chạy | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-02 | 2 | 3 | Giữ snapshot |
| [DEP-06](../tasks/DEP-06.md) | Xác minh bản triển khai trên VPS bằng luồng đăng nhập, duyệt menu, tạo đơn COD và chuyển khoản trong phạm vi được phép | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-04, DEP-05, BE-25, BE-17, BE-20, BE-23, BE-24, BE-32, UI-09, UI-11, UI-17, UI-18, UI-30, BE-29, BE-30, UI-19, UI-44 | 5 | 6 | Giữ snapshot |
| [DEP-07](../tasks/DEP-07.md) | Thiết lập sao lưu database hằng ngày, giữ bảy bản và thực hiện khôi phục thử để xác nhận bản sao lưu sử dụng được | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-02 | 5 | 6 | Giữ snapshot |
| [DEP-08](../tasks/DEP-08.md) | Hoàn thiện README hướng dẫn cài đặt, cấu hình và chạy dự án, kèm kiến trúc và tài liệu API đúng bản bàn giao | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-06, DEP-09 | 3 | 6 | Giữ snapshot |
| [DEP-11](../tasks/DEP-11.md) | Rà soát phạm vi phát hành, lỗi còn mở và khả năng rollback, sau đó gắn tag cho đúng phiên bản được duyệt | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-06, DEP-07, DEP-08, DEP-10 | 3 | 4 | Giữ snapshot |
| [DEP-12](../tasks/DEP-12.md) | Bàn giao cấu hình môi trường, quyền truy cập và quy trình rollback cho người vận hành qua kênh an toàn, không lộ secret | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-11 | 5 | 6 | Giữ snapshot |
| [DEP-20](../tasks/DEP-20.md) | Xác minh gửi email an toàn trên production và bảo đảm email_logs được sao lưu, khôi phục cùng database | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-06, BE-60 | 5 | 4 | Giữ snapshot |
| [DEP-22](../tasks/DEP-22.md) | Xác minh upload, đọc ảnh và sao lưu metadata trên production, bảo đảm cleanup không xóa asset vẫn đang được sử dụng | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-06, BE-72 | 5 | 6 | Giữ snapshot |
| [BE-77](../tasks/BE-77.md) | Triển khai upload hoặc thay avatar qua Identity, lưu metadata Cloudinary và chỉ cho phép người dùng sửa ảnh của mình | Trần Nguyễn Hữu Khánh | TO DO | Chưa xếp | Chưa xếp | BE-18, BE-72 | 5 | 8 | Giữ snapshot |
| [KAFKA-04](../tasks/KAFKA-04.md) | Phát sự kiện promotion.approved sau khi Admin duyệt voucher chi nhánh, kèm định danh để truy vết và chống xử lý lặp | Cao Tất Thành | TO DO | Chưa xếp | Chưa xếp | BE-35, KAFKA-01 | 2 | 4 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
| [KAFKA-11](../tasks/KAFKA-11.md) | Thống nhất và tích hợp sự kiện khuyến mãi đã duyệt từ Promotion sang Notification, đủ dữ liệu chọn email và người nhận | Cao Tất Thành | TO DO | Chưa xếp | Chưa xếp | KAFKA-04, KAFKA-12 | 2 | 4 | SP Sprint 3 mới 09/11; giờ và lịch nguồn là snapshot |
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

Phân loại 07/11 (142 task) đã được gộp tiếp ngày 08/11: 124 TASK, Sprint 2 37 TASK. Xem [Sprint_2_Consolidation_2026-11-08.md](Sprint_2_Consolidation_2026-11-08.md); không dùng bảng lịch sử để mở lại record nhỏ.
