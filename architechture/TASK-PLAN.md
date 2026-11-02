# Kế hoạch Clucky — hoàn tất 05/11, Sprint Review 06/11

**Điều chỉnh đã được duyệt và đồng bộ Lark ngày 01/11/2026.** Đã đọc lại 184 record và tải lại 184 detail mới; trạng thái/PIC/nhóm sprint trên Lark được giữ nguyên. Bảng phân bổ kế hoạch dùng snapshot 30/10, còn 28 thay đổi nhóm hiện tại nằm trong [báo cáo đồng bộ](https://github.com/lethinh26/Clucky/blob/2cc31a09689e718fb49d2d0a80f5813057547c17/architechture/plans/LARK-SYNC-2026-11-01.json).

Sprint 1 giữ **26/10–01/11**. Sprint 2 giữ khung **02–08/11** để truy vết nhưng **hoàn thành triển khai, tích hợp, kiểm chứng, sửa lỗi và demo trước 23:59 thứ Năm 05/11/2026**; **Sprint Review thứ Sáu 06/11/2026**. Không xếp việc thực hiện sang 06–08/11, không lập Sprint 3, backlog/Phase 2 không bị kéo vào hạn này.

Giữ 184 task, 37 DONE, một PIC/task, ID, dependency và truy vết gộp. Không thu thập giờ khả dụng theo yêu cầu; lịch tăng tốc chưa được xác nhận đủ nguồn lực. 28 task Sprint 1 chưa DONE trong snapshot cần được nêu blocker nếu chưa bàn giao, không tự reset hay đổi sprint.

## Ước lượng và trình tự

Xem [backlog hiện hành](../docs/backlog.md) để đọc bảng task, tổng SP/giờ theo sprint/PIC, lịch cũ–mới và rủi ro dependency. SP dùng 1/2/3/5/8/13, không quy đổi thành giờ. Time Estimated là giờ công, không phải khoảng ngày. Remaining của DONE bằng 0; TO DO tạm bằng estimate theo snapshot, cần PIC xác nhận. Sizing DONE là hồi cứu, không phải actual time/velocity.

- 02–03/11: ưu tiên API/contract/producer và bàn giao từng phần.
- 03–04/11: tích hợp cuốn chiếu khi dependency thật sẵn sàng; không nghiệm thu bằng mock.
- 05/11: chốt regression/sửa lỗi/retest/evidence và demo; không cộng buffer giờ công hai lần.
- 06/11: Sprint Review, báo cáo trung thực phần đạt/chưa đạt.

Task 13 SP (BE-21/25/42/76), chuỗi checkout/payment/refund/email và đường TEST → demo là rủi ro cao. Deadline cùng ngày không thay cho thứ tự bàn giao; thay scope/PIC/hạn phải được duyệt riêng. Sizing Sprint 2 là 738 giờ: nếu thực sự còn toàn bộ, không thể khớp 4 ngày với 6 PIC ngay cả xét giới hạn tuyệt đối của lịch; xem cảnh báo đỏ trong backlog. Không mặc định phần việc chưa có evidence đã hoàn tất.

## Phần chuyển làm sau

- Khánh: upload/thay avatar.
- Nhật: đo/tối ưu ngưỡng menu <500 ms; vẫn giữ cache/correctness.
- Đức Anh: backend đặt tiệc và UI trạng thái gửi email trên đơn.
- Thịnh: Casso và lịch sử giao hàng ngoài MVP; giữ SePay và shipment CREATED.
- Thành: proposal/approve voucher chi nhánh và quản trị banner, kèm event/tích hợp liên quan.
- Việt: load test 50 đơn đồng thời và màn quản trị email log/retry.
- 12 record vận hành: DEP-01…08, DEP-11/12/20/22 — VPS/HTTPS/backup/release/handover ở backlog.

## Database và nghiệm thu

BE-01…08 chỉ ánh xạ entity/repository và cấu hình schema hiện có. Không viết lại Flyway V1, không chỉnh migration đã áp dụng. BE-56 nhập BE-07; metadata ảnh BE-69 chuyển thành checklist đối chiếu; BE-76 vẫn giữ migration bổ sung Google login có căn cứ.

Không bỏ ownership/storeId, JWT/OTP security, signature/idempotency payment, consumer idempotency hoặc nguyên tắc lỗi email không rollback nghiệp vụ. Shipping MVP chỉ CREATED; Gmail SMTP sender secret từ environment/Config Server.

Không tự chạy test/lint/typecheck/build/Docker hoặc kiểm thử frontend khi cập nhật backlog. Nhóm tự kiểm chứng khi triển khai; bằng chứng nằm trong task.

## Danh sách task

Xem [README task](tasks/README.md) và [manifest ước lượng/lịch mới](https://github.com/lethinh26/Clucky/blob/2cc31a09689e718fb49d2d0a80f5813057547c17/architechture/plans/BACKLOG-ESTIMATES-2026-11-01.json). Mỗi file task có PIC, trạng thái snapshot, sprint, SP, giờ ước lượng/còn lại, ngày giờ, cơ sở sizing, phạm vi, dependency, checklist, tiêu chí nghiệm thu và truy vết gộp. Manifest mới bổ sung vào snapshot 30/10; không sửa lịch sử cũ.

## Truy vết

[Kế hoạch lịch sử 29/10](https://github.com/lethinh26/Clucky/blob/2cc31a09689e718fb49d2d0a80f5813057547c17/architechture/plans/BACKLOG-REPLAN-PROPOSAL-2026-10-29.md) và [snapshot 30/10](https://github.com/lethinh26/Clucky/blob/2cc31a09689e718fb49d2d0a80f5813057547c17/architechture/plans/BACKLOG-REPLAN-2026-10-30.json). Hai thư mục plans/verification đã được bỏ khỏi Git; các liên kết lịch sử ở đây trỏ tới commit trước khi dọn. ZIP dự phòng cục bộ không thuộc repository. Giữ record ID và mã Mail-* của các task còn lại; không tạo lại task DONE.
