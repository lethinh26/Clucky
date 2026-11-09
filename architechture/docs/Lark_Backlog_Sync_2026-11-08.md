# Đồng bộ backlog lên Lark — 08/11/2026

## Cập nhật tiếp: mỗi TASK chỉ một tài liệu Upload

Theo yêu cầu tiếp theo ngày 08/11/2026, đã thu gọn Upload của đủ **124 TASK**, từ 521 mục đính kèm xuống **124 tài liệu**, mỗi task đúng một file `<MÃ>-task-detail.md`.

- Giữ toàn bộ nội dung giao việc, phạm vi, AC/DoD và lịch sử gộp liên quan trong detail hiện hành; không ghép lại các bản scope/estimate cũ dễ gây mâu thuẫn.
- Bỏ các attachment cũ và ZIP khỏi Upload. Bản nguồn vẫn được sao lưu riêng, không đặt thêm tài liệu lịch sử trên task.
- Chỉ sửa trường Upload; đọc lại xác nhận mọi trường khác, gồm PIC, SP, trạng thái, sprint và dependency, không đổi.
- Tải lại đủ 124 tài liệu duy nhất, đối chiếu SHA-256 đúng nội dung đã chuẩn bị. Không chạy kiểm thử ứng dụng.
- Snapshot trước/sau và kết quả đối chiếu lưu tại `C:\Users\lephu\.codex\tmp\clucky-lark-sync-20261108T100902Z\single-document-20261108T112705Z`.

## Kết quả lần đồng bộ trước

**Hoàn tất và đọc lại lúc 17:22 UTC+7 ngày 08/11/2026.** Đây là kết quả thực tế, thay thế các ghi chú “chưa đồng bộ Lark” trong tài liệu biên soạn trước lần đồng bộ này.

[Mở Lark Base](https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK) · [Backlog kế hoạch](backlog.md) · [Chỉ mục TASK](../tasks/README.md)

## Kết quả thực tế

- 184 → **124 TASK chính**: 53 BE, 45 UI, 12 KAFKA, 14 DEP. Không còn mã INT/TEST hoặc parent/subtask trong SCRUM BOARD.
- Cập nhật đủ 124 title rõ đầu ra và 124 detail hiện hành; tên file hiện tại là `<MÃ>-task-detail.md`, mỗi task chỉ một attachment. 37 detail đã viết lại chứa phạm vi, contract, AC/DoD, fixture, handoff và yêu cầu dev tự kiểm thử.
- Ghi SP mới cho đúng 37 TASK đã sizing: **247 SP**. Không sửa SP 87 task khác, không quy đổi SP thành giờ, không cộng SP nguồn bị xoá.
- Xoá đủ 60 record đã gộp: **16 BE + 30 INT + 14 TEST**. 30 INT gồm 28 record dư ban đầu và INT-60/INT-72 được gộp tiếp trong đợt 18 → 9.
- Đổi mã tại chỗ 15 record giữ lại, không tạo bản sao: 12 KAFKA, BE-77, UI-50, UI-51. Hai mã trung gian BE-78/UI-52 đã đi vào BE-63/BE-72, không tạo record mới.
- Đồng bộ dependency triển khai theo backlog, bỏ parent; chuyển Requirements/API và attachment nguồn sang các TASK nhận phạm vi.
- Remap 13 liên kết của Request Merge. Trong 8 trường hợp một nguồn có nhiều đích nhưng field chỉ cho một link, trỏ đến đích đầu tiên trong mapping đã duyệt; lưu đầy đủ tất cả đích và URL trong Description. Không đổi schema, PIC, tên lịch sử hoặc Merge Status.
- Giữ nguyên Status, PIC, Sprint, Priority, Platform, Week, Start/End Date, Time Estimate của 124 record đích. Sau gộp còn **63 DONE, 6 IN-PROGRESS, 55 TO DO**. Giảm số DONE/IN-PROGRESS là do bỏ record nguồn, không phải đổi trạng thái.

## Sprint 2: kế hoạch khác dữ liệu đang dùng

**Theo trường Sprint trực tiếp trên Lark: 35 TASK / 218 SP.** Mỗi record có SPRINT 2 được tính một lần, kể cả record cũng mang SPRINT 3. View có filter riêng có thể hiển thị ít hơn.

| Người phụ trách | TASK | SP |
|---|---:|---:|
| Cao Tất Thành | 9 | 43 |
| Lê Phú Thịnh | 8 | 53 |
| Mai Sơn Việt | 4 | 26 |
| Nguyễn Duy Quang Nhật | 4 | 29 |
| Trần Nguyễn Hữu Khánh | 4 | 23 |
| Trần Đức Anh | 6 | 44 |
| **Tổng** | **35** | **218** |

Tập 37 TASK/247 SP trong báo cáo sizing vẫn được cập nhật đủ điểm mới, nhưng không dùng để ghi đè sprint mà nhóm đã đổi trên Lark:

- BE-60: hiện ở SPRINT 3, 8 SP.
- BE-62: hiện ở SPRINT 3, 8 SP.
- BE-63: hiện ở SPRINT 3, 8 SP.
- DEP-09: hiện ở SPRINT 3, 3 SP.
- KAFKA-08: hiện ở SPRINT 3, 8 SP.
- KAFKA-10: hiện ở SPRINT 3, 8 SP.

Ngoài tập kế hoạch 37 task, Lark hiện gắn Sprint 2 cho: BE-51 (3 SP), BE-35 (5 SP), BE-05 (3 SP), BE-07 (3 SP).

Đối chiếu: 247 − 43 SP của 6 task đang ở Sprint 3 + 14 SP của 4 task bổ sung = **218 SP**. Không điều chuyển task/người để ép số lượng về 37.

## Tiến độ và bằng chứng không bị coi là nghiệm thu mới

- Trước đồng bộ Lark có 85 DONE, 7 IN-PROGRESS và 92 TO DO; không lấy snapshot 37 DONE trong repo để ghi đè.
- 60 record nguồn gồm 22 DONE, 1 IN-PROGRESS (TEST-01), 37 TO DO. Trạng thái, PIC, sprint và metadata nguồn được lưu trong ZIP; trạng thái từng nguồn còn được liệt kê ở đầu detail TASK nhận.
- DONE cũ không chứng minh toàn bộ AC/DoD sau gộp đã đạt. Giữ nguyên tiến độ hiện tại, không tự reopen hoặc đánh PASS. Owner cần rà checklist và evidence, đặc biệt các task DONE nhận nguồn chưa DONE dưới đây:

UI-22, UI-28, UI-32, BE-38, KAFKA-12, KAFKA-06, UI-44, UI-27, UI-14, UI-16, UI-29, BE-43, KAFKA-07, UI-11, UI-12, BE-21, BE-22, BE-54, BE-72, UI-09, UI-15, BE-17, UI-17, UI-18, UI-19, UI-20, UI-24, UI-30, BE-24, BE-25, BE-26, BE-27, KAFKA-02, KAFKA-09.

## Sao lưu và đối chiếu

- Sao lưu schema, views, toàn bộ 184 record, hai bảng liên quan và 182 attachment trước sửa. Không lưu App Secret hoặc access token.
- Trong lần đồng bộ đầu đã chuyển attachment nguồn sang các TASK đích và đính kèm ZIP `Clucky-merged-records-2026-11-08.zip` tại 69 TASK nhận scope. Theo yêu cầu tiếp theo, đã gỡ các attachment phụ này khỏi Upload sau khi sao lưu riêng; mỗi task hiện chỉ còn một detail. ZIP lưu snapshot record, mapping và file nguồn của 60 record bị xoá vẫn có trong thư mục backup trên máy.
- Đọc lại đủ 124 record sau cập nhật và sau xoá; đối chiếu field đã sửa, các field được bảo vệ, đủ source attachment và không còn link đến record bị xoá.
- Tải lại 124 detail mới và ZIP, kiểm tra SHA-256 khớp dữ liệu đã upload (125 file). Đây là đối chiếu dữ liệu đồng bộ, không phải chạy test của ứng dụng.
- Sau khi xoá record nguồn, tải lại đủ 60 attachment nguồn từ TASK đích và đối chiếu SHA-256 với backup: vẫn truy cập được, nội dung không đổi.
- API comment cấp Base trả danh sách rỗng trước sửa/xoá. Bản sao lưu là snapshot dữ liệu/API và file đính kèm, không phải bản xuất đầy đủ revision/audit history nội bộ của Lark.
- Thư mục sao lưu riêng trên máy: `C:\Users\lephu\.codex\tmp\clucky-lark-sync-20261108T100902Z`.
- Không chạy test, lint, typecheck, build, kiểm thử trình duyệt, Docker hoặc backend. Không chỉnh header/i18n.

## Record đã xoá sau khi chuyển dữ liệu

| Mã nguồn | Trạng thái trước xoá | TASK nhận scope/evidence | Record ID cũ |
|---|---|---|---|
| BE-16 | DONE | BE-17 | `reczz28Rid5XjX0z` |
| BE-41 | DONE | BE-40 | `reczz28Rid5Xk8C7` |
| BE-44 | TO DO | BE-29 | `reczz28Rid5Xl2sW` |
| BE-45 | TO DO | BE-32 | `reczz28Rid5XiHz7` |
| BE-46 | TO DO | BE-32 | `reczz28Rid5Xl8tZ` |
| BE-48 | TO DO | BE-33 | `reczz28Rid5XiqtY` |
| BE-49 | TO DO | BE-29 | `reczz28Rid5Xje8H` |
| BE-58 | TO DO | BE-60 | `reczz28Rqn97T6Vw` |
| BE-61 | TO DO | BE-60 | `reczz28Rqn97SnLV` |
| BE-64 | TO DO | BE-60 | `reczz28Rqn97V9kf` |
| BE-65 | TO DO | BE-60 | `reczz28Rqn97SQ9Y` |
| BE-66 | TO DO | BE-62 | `reczz28Rqn97ScOt` |
| BE-67 | TO DO | BE-63 | `reczz28Rqn97TYUJ` |
| BE-70 | DONE | BE-72 | `reczz28Rqzs2KXIc` |
| BE-71 | DONE | BE-72 | `reczz28Rqzs2NjMf` |
| BE-74 | DONE | BE-72 | `reczz28Rqzs2Mc3B` |
| INT-02 | TO DO | BE-36 | `reczz28Sgn1g4GGV` |
| INT-05 | DONE | BE-17, UI-09 | `reczz28Rid5XizME` |
| INT-06 | DONE | UI-11, UI-10, UI-12, UI-13, BE-20, BE-54 | `reczz28Rid5XkYJT` |
| INT-07 | DONE | BE-25, BE-23, BE-24, UI-17, UI-18 | `reczz28Rid5XlFdj` |
| INT-08 | DONE | BE-27, BE-26, UI-19, UI-20 | `reczz28Rid5XkJIs` |
| INT-09 | TO DO | BE-29, BE-30, BE-32, UI-19, UI-30, UI-44 | `reczz28Rqn97Ur1I` |
| INT-10 | TO DO | BE-34, BE-37, BE-24, UI-18, UI-22, KAFKA-06 | `reczz28Rqn97UPKw` |
| INT-11 | TO DO | BE-38, UI-32 | `reczz28Rqn97VLvh` |
| INT-12 | TO DO | BE-40, UI-12, UI-16 | `reczz28Rqn97WOQN` |
| INT-13 | TO DO | BE-42, UI-14, UI-29 | `reczz28Rqn97UM0q` |
| INT-14 | DONE | BE-26, BE-25, BE-32, UI-24, UI-30 | `reczz28Rqn97WEk1` |
| INT-15 | DONE | BE-21, BE-22, UI-25, UI-26, UI-31 | `reczz28Rqn97UvhS` |
| INT-49 | TO DO | BE-30, BE-32 | `reczz28Rid5XjJ9G` |
| INT-50 | TO DO | BE-29, BE-30, BE-25, KAFKA-03, KAFKA-12, UI-19 | `reczz28Rqzs2OKXT` |
| INT-51 | TO DO | BE-32, BE-25, UI-30 | `reczz28Rqzs2MbL3` |
| INT-52 | TO DO | BE-32, BE-26, UI-24, KAFKA-03, KAFKA-12 | `reczz28Rqzs2O5fu` |
| INT-53 | DONE | BE-09, BE-17, UI-05 | `reczz28Rqzs2LaoP` |
| INT-54 | DONE | BE-54, BE-20, UI-05 | `reczz28Rqzs2KErV` |
| INT-60 | TO DO | BE-63 | `reczz28Rqzs2MtCN` |
| INT-61 | TO DO | BE-19, UI-15 | `reczz28Rqzs2KXZU` |
| INT-62 | TO DO | BE-34, UI-28 | `reczz28Rqzs2MaZx` |
| INT-63 | TO DO | BE-32, UI-27 | `reczz28Rqzs2NSW7` |
| INT-64 | TO DO | BE-29, UI-19, UI-20, UI-44 | `reczz28Rqzs2NXEo` |
| INT-65 | TO DO | BE-33, BE-24, UI-18, UI-19, UI-44 | `reczz28Rqzs2NTkh` |
| INT-67 | TO DO | BE-09, BE-18, BE-19, BE-21, BE-22, BE-25, BE-26, BE-27, BE-32, BE-33, BE-34, BE-37, BE-38, BE-40, BE-42, BE-43, BE-29, BE-63, BE-72 | `reczz28Rqzs2M6lr` |
| INT-68 | DONE | UI-19, BE-27 | `reczz28Rqzs2M2FW` |
| INT-69 | DONE | UI-09, BE-17 | `reczz28Rqzs2N7Af` |
| INT-72 | DONE | BE-72 | `reczz28Rqzs2Mz76` |
| INT-73 | DONE | BE-72, UI-25 | `reczz28Rqzs2KYcw` |
| INT-74 | DONE | BE-76, UI-49 | `reczz28SgdBIGAvC` |
| TEST-01 | IN-PROGRESS | BE-25, BE-17, BE-20, BE-23, BE-24, BE-32, UI-09, UI-11, UI-17, UI-18, UI-30 | `reczz28Rid5XjtTx` |
| TEST-05 | TO DO | BE-19, BE-42, UI-15, UI-29 | `reczz28Rid5XkZyZ` |
| TEST-06 | DONE | BE-21, BE-34, BE-24, UI-25, UI-26, UI-28 | `reczz28Rid5XlC0j` |
| TEST-07 | TO DO | BE-09, BE-19, BE-21, BE-22, BE-25, BE-26, BE-27, BE-32, BE-33, BE-34, BE-40, BE-42, BE-43, BE-63, BE-72 | `reczz28Rid5XhE0A` |
| TEST-12 | TO DO | BE-33, BE-24, UI-18 | `reczz28Rid5Xjrmv` |
| TEST-13 | TO DO | BE-54 | `reczz28Rid5XjTFd` |
| TEST-14 | TO DO | BE-25 | `reczz28Rid5XiOZ3` |
| TEST-16 | TO DO | KAFKA-08, KAFKA-02, KAFKA-03, KAFKA-05, KAFKA-06, KAFKA-07, KAFKA-09, KAFKA-10, KAFKA-12 | `reczz28Rid5XhJqS` |
| TEST-17 | DONE | UI-34, UI-46, UI-47, UI-48 | `reczz28Rid5XhRgH` |
| TEST-22 | TO DO | KAFKA-12, BE-17, BE-60, BE-62, BE-32, KAFKA-02, KAFKA-03 | `reczz28Rqn97UJfU` |
| TEST-23 | TO DO | KAFKA-12, BE-25, BE-30, BE-32, BE-60, BE-62, BE-63 | `reczz28Rqn97TvLs` |
| TEST-24 | TO DO | BE-57, BE-60, BE-63, BE-75, KAFKA-12 | `reczz28Rqn97VwpU` |
| TEST-25 | DONE | BE-72, UI-25 | `reczz28Rqzs2LFys` |
| TEST-26 | DONE | BE-72 | `reczz28Rqzs2Kwtu` |

## Record đổi mã và giữ nguyên danh tính

| Mã cũ | Mã hiện hành | Record ID giữ nguyên |
|---|---|---|
| BE-11 | KAFKA-01 | `reczz28Rid5Xl8kt` |
| INT-39 | KAFKA-02 | `reczz28Rid5Xk0zO` |
| INT-40 | KAFKA-03 | `reczz28Rid5XhTpS` |
| INT-41 | KAFKA-04 | `reczz28Rid5XjxP1` |
| INT-43 | KAFKA-05 | `reczz28Rid5XjvcA` |
| INT-44 | KAFKA-06 | `reczz28Rid5Xh9Cb` |
| INT-45 | KAFKA-07 | `reczz28Rid5Xkf56` |
| INT-46 | KAFKA-08 | `reczz28Rid5XjLBp` |
| INT-47 | KAFKA-09 | `reczz28Rid5XkQIM` |
| INT-48 | KAFKA-10 | `reczz28Rid5XjWiu` |
| INT-58 | KAFKA-11 | `reczz28Rqzs2MDNB` |
| BE-39 | KAFKA-12 | `reczz28Rid5XkynV` |
| INT-03 | BE-77 | `reczz28Sgn3n4qyS` |
| INT-71 | UI-50 | `reczz28Rqzs2N9oX` |
| INT-70 | UI-51 | `reczz28Rqzs2LXuC` |

124 record trong [backlog](backlog.md) là danh sách giữ lại; bảng TASK/PIC/sprint trong repo là kế hoạch/snapshot, còn tiến độ và lịch làm việc trực tiếp lấy từ Lark. Không nhập các file trong `tasks/history/` hoặc file chuyển hướng thành task mới.
