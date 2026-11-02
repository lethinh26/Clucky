# Đối chiếu backlog Lark sau khi áp dụng kế hoạch

Đã áp dụng qua bot Lark theo phê duyệt của người dùng, hoàn tất ngày 30/10/2026 (UTC+7).

## Kết quả

| Hạng mục | Trước | Sau |
|---|---:|---:|
| Record độc lập | 232 | 184 |
| Record nhiều PIC | 54 | 0 |
| DONE | 37 | 37 |
| Sprint 1 | 49 | 65 |
| Sprint 2 | 131 | 94 |
| Sprint 3 | 52 | 0 |
| Chưa gán sprint | 0 | 25 |

- Sprint 1: 26/10–01/11/2026; Sprint 2: 02–08/11/2026.
- Mọi task đã xếp lịch có End Date lúc 23:59 giờ Việt Nam và trong khoảng sprint.
- 25 task backlog có PIC riêng nhưng không có sprint/deadline cam kết.
- PIC được cấu hình chỉ chọn một người; Sprint chỉ còn hai option SPRINT 1/SPRINT 2.
- View Sprint 3 đã bỏ. View BACKLOG đọc được 184 record; hai view sprint lần lượt 65 và 94 record.
- 48 record gộp/trùng đã bỏ sau khi cập nhật nội dung vào task đích; 48 file local cũ là trang chuyển hướng, không phải task đang được giao.
- Giữ record ID, mã Mail-* và trạng thái DONE của các task còn lại.
- BE-01…08 đổi sang entity/repository theo schema hiện có; bỏ phần viết lại Flyway V1.

## Cách đối chiếu

1. Lưu snapshot 232 record, metadata field/view và tải đủ 232 attachment gốc.
2. Tạo manifest và task detail theo kế hoạch đã duyệt, xác nhận dependency không tạo chu trình và không phụ thuộc đầu việc bị hoãn.
3. Cập nhật 184 record; đọc lại Task/PIC/Sprint/Week/Start Date/End Date/Dependencies/API/Upload và trạng thái.
4. Tải đủ 184 attachment mới, so sánh byte với file đã chuẩn bị: 184 khớp, không lỗi.
5. Trước khi bỏ record nguồn, kiểm tra các record đó chưa có chỉnh sửa nghiệp vụ mới; không có record DONE bị loại.
6. Đọc lại toàn bảng, schema PIC/Sprint và dữ liệu từng view sau khi xóa/gộp: khớp manifest.
7. Đồng bộ TASK-PLAN.md, README task, 184 task detail và 48 trang chuyển hướng trong repo; không lưu app secret hoặc tenant token trong các file tạo ra.

## Tệp đối chiếu và khôi phục

- [Manifest hiện hành](../plans/BACKLOG-REPLAN-2026-10-30.json)
- [Kết quả đối chiếu API](backlog-replan-2026-10-30.json)
- [Bản sao trước thay đổi](backlog-before-replan-2026-10-29.zip)
- [Danh sách task hiện hành](../tasks/README.md)

Bản ZIP giữ bảng và attachment trước khi gộp. Khôi phục qua API có thể tạo record ID mới nếu phục hồi record đã xóa; không coi ZIP là bảo đảm khôi phục nguyên lịch sử của hệ thống. Lịch sử 37 task DONE được giữ bằng cách cập nhật trên record cũ, không tạo lại.

Không chạy test/lint/typecheck/build, không bật Docker/backend và không kiểm thử frontend Clucky. Các kết quả ở đây là đối chiếu dữ liệu Lark và file, không phải chứng nhận chức năng ứng dụng.
