# Clucky — chỉ mục TASK chính

> **Sizing hiện hành 09/11/2026:** Sprint 3 có 27 TASK/**94 SP**, thang 0/1/2/3/5/8. Đã cập nhật SP và detail của 25 task chưa DONE trên Lark, giữ đúng một tài liệu/task; hai task DONE không đổi điểm. 149 SP bên dưới là snapshot trước sizing; kế hoạch bổ sung spec RBAC chưa được tạo thành task hoặc cộng vào tổng này.

> **Lịch sprint mới nhất ngày 08/11/2026:** chuyển đủ 14 task Sprint 2 chưa DONE sang Sprint 3; Sprint 2 còn 21 task DONE/137 SP, Sprint 3 có 27 task/149 SP. Các số 35/218 và 37/247 bên dưới là snapshot trước điều chuyển/kế hoạch, không phải sprint trực tiếp hiện tại. [Danh sách và phân bổ Sprint 3](../docs/Sprint_3_Status_2026-11-08.md).

**08/11/2026: 124 TASK**, gồm **53 BE, 45 UI, 12 KAFKA, 14 DEP**; không có INT/TEST độc lập hoặc Sub Task.

**Upload trên Lark: mỗi TASK chỉ một tài liệu `<MÃ>-task-detail.md`**, giữ đủ nội dung giao việc và AC/DoD. Không đính kèm thêm bản cũ hoặc ZIP; lịch sử sao lưu riêng. Đã đối chiếu đủ 124/124 task.

**Đã đồng bộ Lark:** 124 title/detail/TASK chính và 37 SP mới; xoá 60 record sau khi chuyển snapshot/evidence/liên kết. [Báo cáo đầy đủ](../docs/Lark_Backlog_Sync_2026-11-08.md). Tập kế hoạch 37 TASK/247 SP khác trường Sprint 2 trực tiếp **35 TASK/218 SP** do giữ lịch nhóm đã cập nhật.

- [Danh sách TASK/PIC/lịch/dependency](../docs/backlog.md).
- [Báo cáo task cần xóa/giữ/đổi mã, ánh xạ AC/DoD](../docs/Backlog_Reclassification_2026-11-07.md).
- ID cũ chỉ là chuyển hướng, không tính task/estimate hoặc giao lại. KAFKA là TASK chính.
- Title ban đầu của 142 TASK đã được viết lại theo cấu trúc hành động + đối tượng/phạm vi + kết quả; đồng bộ với backlog, bảng phân loại và nhãn task đích. Ngày 08/11 gộp tiếp Sprint 2 còn 37 TASK, giữ nguyên các AC/DoD trong task nhận, không mở thêm phạm vi.
- 37 task Sprint 2 đã được viết lại thành detail thống nhất: phạm vi/contract/steps/handoff, AC có fixture–expected–evidence và DoD. Dev tự test/sửa lỗi/retest trong task; nội dung ghép cũ được lưu lịch sử, không phải bộ AC hoạt động song song.
- “Phân loại hiện hành” và scope/AC/DoD bổ sung ưu tiên hơn metadata cũ. Đã đọc lại Lark: 63 DONE, 6 IN-PROGRESS, 55 TO DO; giữ nguyên tiến độ record đích, không xác nhận scope mới đã đạt. 37 DONE trong bảng kế hoạch là snapshot cũ.
- Sprint 2 đã sizing lại đủ 37 TASK: **247 SP kế hoạch**, không cộng gói INT/TEST hoặc SP nguồn. [Cơ sở và phân bổ](../docs/Sprint_2_Story_Points_2026-11-08.md). Giờ công vẫn snapshot; chưa phải estimate remaining hay planning poker của nhóm. Mục HOÃN giữ backlog/Phase 2; không tự nâng quyền hoặc biến quyết định mở thành rule.
- Đã đồng bộ và đọc lại dữ liệu Lark; các ghi chú “chưa đồng bộ” trong nội dung cũ là lịch sử biên soạn. Không chạy test/lint/typecheck/build/browser/Docker/backend/hạ tầng.

- [Báo cáo gộp 08/11: 55 → 37 TASK Sprint 2, mapping và phân bổ theo PIC](../docs/Sprint_2_Consolidation_2026-11-08.md). Phạm vi gộp 08/11 và dependency đầu file ưu tiên hơn metadata cũ; SP nguồn không phải estimate mới.

- [Detail Sprint 2 thống nhất ngày 08/11](../docs/Sprint_2_Task_Details_2026-11-08.md): 540 AC và 627 mục DoD trên 37 task; giữ 247 SP. Đây là tiêu chí chưa chạy, không phải báo cáo PASS.

## KAFKA — TASK chính

| Mã | Đầu ra |
|---|---|
| [KAFKA-01](KAFKA-01.md) | Cấu hình topic, producer và consumer Kafka cho các service, thống nhất JSON event, group, serializer và cách xác nhận xử lý |
| [KAFKA-12](KAFKA-12.md) | Xử lý sự kiện Order, Payment để tạo thông báo và yêu cầu gửi email đúng người, chống trùng và không rollback nghiệp vụ khi email lỗi |
| [KAFKA-02](KAFKA-02.md) | Phát sự kiện tạo, đổi trạng thái, hoàn tất và hủy đơn sau khi Order commit, giữ eventId và correlationId khi gửi lại |
| [KAFKA-03](KAFKA-03.md) | Phát sự kiện xác nhận hoặc thất bại thanh toán và dữ liệu hết hạn, sai lệch, hoàn tiền theo contract cho các service nhận |
| [KAFKA-04](KAFKA-04.md) | Phát sự kiện promotion.approved sau khi Admin duyệt voucher chi nhánh, kèm định danh để truy vết và chống xử lý lặp |
| [KAFKA-05](KAFKA-05.md) | Xử lý sự kiện order.created để tạo một shipment CREATED cho mỗi đơn, không tạo trùng khi Kafka gửi lại |
| [KAFKA-06](KAFKA-06.md) | Xử lý sự kiện order.completed để cộng điểm cho đúng khách, lưu biến động điểm và không cộng lại khi nhận sự kiện trùng |
| [KAFKA-07](KAFKA-07.md) | Xử lý sự kiện Order và Payment để cập nhật thống kê từng quán theo ngày, không cộng doanh thu hai lần khi nhận lại sự kiện |
| [KAFKA-08](KAFKA-08.md) | Triển khai retry, DLQ và xử lý sự kiện không lặp hiệu ứng cho Kafka consumer, hỗ trợ phát lại có kiểm soát khi khôi phục lỗi |
| [KAFKA-09](KAFKA-09.md) | Xử lý payment.failed để hủy đơn và giải phóng voucher, điểm đã giữ, bảo đảm các bước bù trừ không thực hiện trùng |
| [KAFKA-10](KAFKA-10.md) | Phát sự kiện cho mọi thay đổi quản trị đã commit và ghi tập trung vào Audit Service, chống trùng và loại dữ liệu nhạy cảm |
| [KAFKA-11](KAFKA-11.md) | Thống nhất và tích hợp sự kiện khuyến mãi đã duyệt từ Promotion sang Notification, đủ dữ liệu chọn email và người nhận |
