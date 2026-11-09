# Sprint 3 — thống kê sau khi chuyển việc chưa DONE từ Sprint 2

> **Snapshot lịch sử:** ngày 09/11/2026 đã sizing lại và đồng bộ Lark: vẫn 27 TASK nhưng tổng **94 SP**, tối đa 8/task theo thang 0/1/2/3/5/8; giữ nguyên PIC/trạng thái/sprint. Bảng 149 SP dưới đây là số trước sizing, không dùng cho kế hoạch hiện hành. Xem SP mới ở [backlog](backlog.md); bộ spec RBAC bổ sung mới là đề xuất, chưa tạo task hoặc cộng SP.

**Đọc lại Lark: 08/11/2026 18:53 UTC+7.** Số liệu theo trường Sprint, đếm mỗi record một lần trong từng sprint; view có filter riêng có thể hiển thị khác.

[Mở SCRUM BOARD trên Lark](https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK)

## Thay đổi đã thực hiện

- Chuyển toàn bộ **14 task / 81 SP** có SPRINT 2 và Status khác DONE sang SPRINT 3: bỏ SPRINT 2, thêm SPRINT 3, giữ các nhãn sprint khác nếu có.
- Các task đã chuyển: BE-34, BE-37, BE-29, BE-30, BE-32, BE-33, KAFKA-03, KAFKA-05, BE-75, BE-40, BE-42, BE-18, BE-19, DEP-10.
- BE-19 và DEP-10 vốn đã mang cả SPRINT 2 lẫn SPRINT 3: chỉ bỏ SPRINT 2, không cộng trùng khi thống kê Sprint 3.
- Sprint 3: **15 task / 75 SP → 27 task / 149 SP**. Số tăng ròng là 12 task / 74 SP.
- Sprint 2 còn **21 task / 137 SP**, tất cả DONE; không còn task chưa DONE.
- Chỉ ghi trường Sprint. Đọc lại xác nhận title, PIC, trạng thái, SP, ngày bắt đầu/kết thúc, giờ công, dependency, liên kết và Upload không thay đổi. Mỗi task vẫn một tài liệu Upload.

## Tổng quan Sprint 3

| Trạng thái | Task | SP |
|---|---:|---:|
| TO DO | 20 | 114 |
| IN-PROGRESS | 5 | 29 |
| DONE | 2 | 6 |
| **Tổng** | **27** | **149** |

**Chưa DONE: 25 task / 143 SP.** Đây là SP phạm vi task chưa DONE, không phải remaining effort đã đo hoặc cam kết capacity.

BE-05 và BE-07 đã DONE và có sẵn ở cả Sprint 2/Sprint 3; giữ nguyên theo yêu cầu chỉ chuyển việc chưa DONE.

## Phân bổ theo người phụ trách

| PIC | Task | SP | TO DO | IN-PROGRESS | DONE |
|---|---:|---:|---:|---:|---:|
| Cao Tất Thành | 11 | 54 | 7 | 2 | 2 |
| Lê Phú Thịnh | 7 | 45 | 7 | 0 | 0 |
| Mai Sơn Việt | 6 | 40 | 4 | 2 | 0 |
| Trần Nguyễn Hữu Khánh | 3 | 10 | 2 | 1 | 0 |
| Nguyễn Duy Quang Nhật | 0 | 0 | 0 | 0 | 0 |
| Trần Đức Anh | 0 | 0 | 0 | 0 | 0 |
| **Tổng** | **27** | **149** | **20** | **5** | **2** |

## Phạm vi công việc

- Thành: voucher/điểm thành viên, banner, cấu hình và gửi email, retry email, sự kiện duyệt khuyến mãi; gồm hai task entity đã DONE.
- Thịnh: khởi tạo QR, webhook và quản lý thanh toán/hoàn tiền, phí giao hàng/shipment MVP, sự kiện Payment/Shipping và bảo vệ DTO/credential.
- Việt: đánh giá, dashboard/báo cáo, Kafka retry/DLQ, audit event, vận hành email log và Postman collection.
- Khánh: hồ sơ/địa chỉ, quản lý nhân viên/ca làm việc và chuẩn bị demo/Sprint Review.
- Nhật và Đức Anh hiện chưa có task gắn SPRINT 3; không tự giao thêm hoặc điều chuyển PIC.

Theo nhóm: **19 BE / 114 SP; 6 KAFKA / 30 SP; 2 DEP / 5 SP**. Không có UI, INT hoặc TEST độc lập trong Sprint 3 hiện tại.

## Danh sách đầy đủ

| Mã | Nội dung | PIC | Trạng thái | SP | Chuyển từ Sprint 2 trong lượt này |
|---|---|---|---|---:|---|
| BE-05 | Ánh xạ entity và repository Promotion để lưu voucher, lịch sử sử dụng, số dư và biến động điểm thành viên | Cao Tất Thành | DONE | 3 | Có sẵn ở Sprint 3 |
| BE-07 | Ánh xạ entity và repository Notification để lưu thông báo, mẫu email và lịch sử gửi, không lưu thông tin xác thực SMTP | Cao Tất Thành | DONE | 3 | Có sẵn ở Sprint 3 |
| BE-34 | Cung cấp API quản lý và áp dụng voucher toàn chuỗi hoặc từng quán, kiểm tra điều kiện và trả số tiền giảm hợp lệ | Cao Tất Thành | IN-PROGRESS | 5 | Có |
| BE-36 | Cung cấp API quản lý banner và upload, thay ảnh Cloudinary để trang chủ hiển thị banner hợp lệ, giữ ảnh cũ khi lỗi | Cao Tất Thành | TO DO | 8 | Có sẵn ở Sprint 3 |
| BE-37 | Cung cấp API điểm và hạng thành viên, cấu hình tích hoặc đổi điểm và lưu biến động số dư không bị cộng, trừ lặp | Cao Tất Thành | IN-PROGRESS | 8 | Có |
| BE-57 | Cấu hình Mail Sender qua Config Server và biến môi trường, kiểm tra cấu hình và bảo vệ Gmail App Password | Cao Tất Thành | TO DO | 3 | Có sẵn ở Sprint 3 |
| BE-59 | Định nghĩa và kiểm tra email command gồm người nhận, mẫu, biến nội dung và ID phục vụ truy vết, chống xử lý trùng | Cao Tất Thành | TO DO | 2 | Có sẵn ở Sprint 3 |
| BE-60 | Hoàn thiện gửi email nghiệp vụ qua Gmail SMTP: kiểm tra đầu vào, render mẫu OTP, đơn hàng, thanh toán và hoàn tiền, trả rõ kết quả gửi | Cao Tất Thành | TO DO | 8 | Có sẵn ở Sprint 3 |
| BE-62 | Quản lý vòng đời gửi email: lưu trạng thái, chống job trùng, phục hồi worker và gửi lại có giới hạn trước khi chuyển FAILED | Cao Tất Thành | TO DO | 8 | Có sẵn ở Sprint 3 |
| KAFKA-04 | Phát sự kiện promotion.approved sau khi Admin duyệt voucher chi nhánh, kèm định danh để truy vết và chống xử lý lặp | Cao Tất Thành | TO DO | 3 | Có sẵn ở Sprint 3 |
| KAFKA-11 | Thống nhất và tích hợp sự kiện khuyến mãi đã duyệt từ Promotion sang Notification, đủ dữ liệu chọn email và người nhận | Cao Tất Thành | TO DO | 3 | Có sẵn ở Sprint 3 |
| BE-29 | Cung cấp luồng QR chuyển khoản, thời hạn và tra cứu trạng thái thanh toán, kèm contract và tài liệu tích hợp Payment/Shipping | Lê Phú Thịnh | TO DO | 8 | Có |
| BE-30 | Tiếp nhận webhook SePay, xác thực chữ ký và đối chiếu mã đơn, số tiền để ghi nhận thanh toán đúng một lần | Lê Phú Thịnh | TO DO | 8 | Có |
| BE-32 | Hoàn thiện quản lý thanh toán: tra cứu và đối soát giao dịch, xác nhận chuyển khoản hoặc COD, duyệt hoàn tiền và cấu hình ngân hàng | Lê Phú Thịnh | TO DO | 13 | Có |
| BE-33 | Hoàn thiện tính và cấu hình phí giao theo quán, khoảng cách, ngưỡng miễn phí và nhận tại quán, kèm API đọc shipment MVP | Lê Phú Thịnh | TO DO | 5 | Có |
| BE-75 | Chuẩn hóa DTO metadata ảnh và loại credential, payload nhạy cảm khỏi response, log và bundle frontend | Lê Phú Thịnh | TO DO | 3 | Có |
| KAFKA-03 | Phát sự kiện xác nhận hoặc thất bại thanh toán và dữ liệu hết hạn, sai lệch, hoàn tiền theo contract cho các service nhận | Lê Phú Thịnh | TO DO | 5 | Có |
| KAFKA-05 | Xử lý sự kiện order.created để tạo một shipment CREATED cho mỗi đơn, không tạo trùng khi Kafka gửi lại | Lê Phú Thịnh | TO DO | 3 | Có |
| BE-40 | Hoàn thiện đánh giá món đã mua: khách tạo, sửa, xóa; nhân sự phản hồi hoặc ẩn nội dung đúng quyền và cửa hàng | Mai Sơn Việt | IN-PROGRESS | 5 | Có |
| BE-42 | Cung cấp dashboard và báo cáo doanh thu theo quyền, hỗ trợ lọc kỳ, cửa hàng và xuất Excel hoặc PDF khớp số liệu | Mai Sơn Việt | IN-PROGRESS | 8 | Có |
| BE-63 | Hoàn thiện vận hành email: ghi nhận failure/DLQ bền vững, truy vết các lần gửi và cung cấp API tra cứu log đúng quyền | Mai Sơn Việt | TO DO | 8 | Có sẵn ở Sprint 3 |
| DEP-09 | Tổng hợp Postman collection từ từng service, cấu hình gọi qua Gateway và bàn giao request mẫu cho luồng chính cùng trường hợp lỗi | Mai Sơn Việt | TO DO | 3 | Có sẵn ở Sprint 3 |
| KAFKA-08 | Triển khai retry, DLQ và xử lý sự kiện không lặp hiệu ứng cho Kafka consumer, hỗ trợ phát lại có kiểm soát khi khôi phục lỗi | Mai Sơn Việt | TO DO | 8 | Có sẵn ở Sprint 3 |
| KAFKA-10 | Phát sự kiện cho mọi thay đổi quản trị đã commit và ghi tập trung vào Audit Service, chống trùng và loại dữ liệu nhạy cảm | Mai Sơn Việt | TO DO | 8 | Có sẵn ở Sprint 3 |
| BE-18 | Cung cấp API xem, sửa hồ sơ và quản lý sổ địa chỉ, bảo đảm mỗi khách chỉ có một địa chỉ mặc định | Trần Nguyễn Hữu Khánh | IN-PROGRESS | 3 | Có |
| BE-19 | Cung cấp API tạo, khóa nhân viên, gán cửa hàng cho Admin và xếp ca cho Manager đúng phạm vi quản lý | Trần Nguyễn Hữu Khánh | TO DO | 5 | Có |
| DEP-10 | Chuẩn bị kịch bản demo, ảnh minh chứng và slide Sprint Review, phân biệt rõ chức năng đã nghiệm thu với phần còn hạn chế | Trần Nguyễn Hữu Khánh | TO DO | 2 | Có |

## Đối chiếu và giới hạn

- Đã lưu snapshot trước/sau, payload chỉ thay Sprint và số liệu đọc lại; không đổi task DONE để làm đẹp báo cáo.
- Bản sao lưu riêng: `C:\Users\lephu\.codex\tmp\clucky-sprint-move-20261108T115039Z`.
- Báo cáo này nằm trong repository, không thêm attachment trên Lark.
- Không chạy test, lint, typecheck, build, kiểm thử trình duyệt, Docker hoặc backend.

