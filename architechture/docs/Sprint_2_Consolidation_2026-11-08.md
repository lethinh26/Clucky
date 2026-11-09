# Gộp task Sprint 2 — 08/11/2026

> **Đã đồng bộ Lark ngày 08/11/2026:** 124 TASK chính; 60 record nguồn đã xoá sau khi chuyển dữ liệu. Tập sizing 37 TASK/247 SP đã cập nhật đủ; trường Sprint 2 thực tế có 35 TASK/218 SP vì giữ lịch nhóm đã đổi. Các ghi chú “chưa đồng bộ” bên dưới là lịch sử biên soạn. [Báo cáo đồng bộ và bảng đối chiếu](Lark_Backlog_Sync_2026-11-08.md).

> **Detail tiếp tục được biên soạn thống nhất ngày 08/11:** xem [phạm vi, AC/DoD và handoff hiện hành](Sprint_2_Task_Details_2026-11-08.md). Gỡ phần ghép lặp/loại trừ lỗi thời, giữ 37 TASK/247 SP, PIC, dependency và trạng thái. Bản detail trước đó được lưu lịch sử; chưa đồng bộ Lark hoặc chạy kiểm thử.

> **Đã sizing SP sau gộp: 37 TASK, 247 SP kế hoạch mới.** Bảng SP nguồn vẫn giữ lịch sử, không còn là estimate hiện hành. Xem [bảng 37 task và lý do](Sprint_2_Story_Points_2026-11-08.md); chưa đồng bộ Lark.

## Kết quả và giới hạn

- **Sprint 2: 55 → 37 TASK chính**, gộp 18 record kỹ thuật vào 9 task đầu ra. Toàn backlog **142 → 124 TASK**: 53 BE, 45 UI, 12 KAFKA, 14 DEP.
- Chỉ gộp task **cùng PIC, cùng Sprint 2, cùng trạng thái TO DO snapshot**; không điều chuyển người, sửa tiến độ hay lấy phần DONE của Sprint 1 làm việc mới. Không ép cân bằng số task.
- Giữ nguyên **12 KAFKA là TASK chính** (9 ở Sprint 2); không biến producer/consumer/retry thành subtask. Không tạo INT/TEST hoặc mã task mới.
- Toàn bộ scope, contract, AC/DoD, source và lịch sử của record nhận thêm được chép vào task đích, mục mở rộng cuối file. Đây là checklist/phần việc của cùng TASK, không phải subtask để giao lại; nguồn cũ chỉ chuyển hướng.
- **Chỉ sửa repository, chưa sửa/xóa record Lark.** Các số lượng/estimate trong báo cáo ngày 07/11 và kế hoạch cũ là lịch sử khi khác báo cáo này.

## Nhóm đã gộp

| TASK chính giữ lại | Record gộp vào | PIC không đổi | Đầu ra sau gộp | Tổng SP nguồn — không phải SP mới |
|---|---|---|---|---:|
| [BE-17](../tasks/BE-17.md) | BE-16 | Trần Nguyễn Hữu Khánh | Hoàn thiện xác thực tài khoản: đăng ký và OTP, đăng nhập, làm mới phiên, đăng xuất và đặt lại mật khẩu trên hai ứng dụng | 16 |
| [BE-29](../tasks/BE-29.md) | BE-44, BE-49 | Lê Phú Thịnh | Cung cấp luồng QR chuyển khoản, thời hạn và tra cứu trạng thái thanh toán, kèm contract và tài liệu tích hợp Payment/Shipping | 13 |
| [BE-32](../tasks/BE-32.md) | BE-45, BE-46 | Lê Phú Thịnh | Hoàn thiện quản lý thanh toán: tra cứu và đối soát giao dịch, xác nhận chuyển khoản hoặc COD, duyệt hoàn tiền và cấu hình ngân hàng | 21 |
| [BE-33](../tasks/BE-33.md) | BE-48 | Lê Phú Thịnh | Hoàn thiện tính và cấu hình phí giao theo quán, khoảng cách, ngưỡng miễn phí và nhận tại quán, kèm API đọc shipment MVP | 8 |
| [BE-40](../tasks/BE-40.md) | BE-41 | Mai Sơn Việt | Hoàn thiện đánh giá món đã mua: khách tạo, sửa, xóa; nhân sự phản hồi hoặc ẩn nội dung đúng quyền và cửa hàng | 8 |
| [BE-60](../tasks/BE-60.md) | BE-58, BE-61, BE-64, BE-65 | Cao Tất Thành | Hoàn thiện gửi email nghiệp vụ qua Gmail SMTP: kiểm tra đầu vào, render mẫu OTP, đơn hàng, thanh toán và hoàn tiền, trả rõ kết quả gửi | 15 |
| [BE-62](../tasks/BE-62.md) | BE-66 | Cao Tất Thành | Quản lý vòng đời gửi email: lưu trạng thái, chống job trùng, phục hồi worker và gửi lại có giới hạn trước khi chuyển FAILED | 13 |
| [BE-63](../tasks/BE-63.md) | BE-67, BE-78 | Mai Sơn Việt | Hoàn thiện vận hành email: ghi nhận failure/DLQ bền vững, truy vết các lần gửi và cung cấp API tra cứu log đúng quyền | 13 |
| [BE-72](../tasks/BE-72.md) | BE-70, BE-71, BE-74, UI-52 | Nguyễn Duy Quang Nhật | Hoàn thiện upload và thay ảnh món, combo từ giao diện đến Cloudinary: kiểm tra file, lưu metadata, xử lý lỗi và dọn ảnh an toàn | 29 |

## Phân bổ Sprint 2 sau gộp

| Người phụ trách | Task trước | Task sau | Tổng SP nguồn tham chiếu | SP mới sau gộp |
|---|---:|---:|---:|---|
| Cao Tất Thành | 12 | 7 | 60 | 45 SP |
| Lê Phú Thịnh | 13 | 8 | 74 | 53 SP |
| Mai Sơn Việt | 11 | 8 | 63 | 53 SP |
| Nguyễn Duy Quang Nhật | 8 | 4 | 52 | 29 SP |
| Trần Nguyễn Hữu Khánh | 5 | 4 | 32 | 23 SP |
| Trần Đức Anh | 6 | 6 | 47 | 44 SP |
| **Tổng** | **55** | **37** | **328** | **247 SP** |

328 là tổng SP nguồn của 55 record trước gộp, giữ để đối chiếu **không phải** estimate mới của 37 task. Không lấy 328 làm capacity/velocity hoặc kết luận công giảm; không cộng thêm INT/TEST đã gộp ngày 07/11. Tổng nguồn được giữ trong báo cáo này để truy vết. Backlog Sprint 2 hiện dùng SP mới (247) theo bảng sizing 08/11; giờ nguồn chưa thay đổi, lịch cũ không trở thành deadline cam kết mới.

BE-72 có tổng SP nguồn 29, BE-32 có 21, BE-17 có 16: đây là số nguồn trước sizing; điểm hiện hành tương ứng là 13, 13, 13 theo cơ sở riêng từng task trong báo cáo SP, không phải áp trần 13 hoặc cắt AC. Có thể bàn giao từng bước bằng checklist trong cùng TASK; chưa có capacity nên không khẳng định toàn phạm vi còn vừa sprint. Gộp quản lý không làm giảm công thực tế.

## Vì sao không gộp tiếp mọi thứ

- Auth, hồ sơ, quản lý nhân sự và Google login có đầu ra khác nhau; Google còn khác owner. Giữ hồ sơ, nhân sự, Google tách khỏi BE-17.
- Order preview là contract đầu vào cho tạo đơn; hủy đơn, lịch sử và event có đầu ra/handoff riêng. Giữ nguyên nhóm của Đức Anh, không gộp cho đều số lượng.
- Catalog quản trị, tồn kho, cache và upload là đầu ra riêng. BE-75 bảo vệ DTO/secret nhiều domain do Thịnh phụ trách nên không âm thầm chuyển cho Nhật hoặc coi upload đạt là avatar/banner đã đạt.
- BE-60 gửi và render email; BE-62 quản lý trạng thái/retry; BE-63 vận hành/log/failure. Ba đầu ra có interface rõ, trong đó BE-63 khác owner; không tạo một task “email” khổng lồ giao chung.
- BE-49 không còn record tài liệu riêng: phần contract/OpenAPI vào BE-29, nhưng vẫn phải nhận đầu ra webhook BE-30 và Shipping BE-33. Producer/consumer vẫn giữ mã KAFKA theo yêu cầu.
- Config/DTO/contract đang ở **Sprint 1** (ví dụ BE-50/51/52/57/59/68) là prerequisite/lịch sử ngoài 55 task đang gộp. Không tự kéo sang Sprint 2 hay đổi PIC để làm số lượng đẹp. Frontend Sprint 1 và backlog chưa cam kết cũng không đổi phạm vi.

## AC/DoD, dependency và ranh giới

- Mỗi task đích có AC/DoD chung và đầy đủ AC của nguồn; dev tự test ngay trong TASK, ghi source/AC, expected/actual, PASS/FAIL/BLOCKED và evidence đã mask. AC trùng dùng chung evidence; case khác không được bỏ. Chưa chạy không đánh PASS.
- Các câu “không làm BE-xx” cũ chỉ còn hiệu lực ngoài scope đã nhận; phạm vi gộp 08/11 ưu tiên. Contract, validation, security, ownership/storeId, retry/replay/concurrency và xử lý lỗi tránh mất dữ liệu giữ nguyên.
- Dependency triển khai lấy hợp của nguồn, đổi sang ID cuối, bỏ tự phụ thuộc và trùng. Bảng đầu task và backlog là hiện hành; bảng/metadata nằm trong phần nguồn là lịch sử.
- **BE-29:** BE-30/33 là handoff nghiệm thu bộ tài liệu, không phải điều kiện bắt đầu tạo QR. Nếu dùng dependency toàn gói sẽ tạo vòng BE-29 → BE-30 → BE-29. Dev bàn giao QR trước, hoàn thiện tài liệu khi hai đầu ra có thật; không đánh DONE chỉ vì QR chạy.
- Không đổi policy Payment đã hoãn 04/11; không tự reopen/chuyển tiền hoặc triển khai đối soát nâng cao. Shipping MVP chỉ CREATED; avatar/banner, UI email-log, promotion email và Phase 2 giữ backlog cũ. Performance/load hoãn trong BE-54/25 vẫn hoãn.

## Chuyển Lark sau khi đối chiếu — chưa thực hiện

1. Đọc lại record/PIC/tiến độ/attachment hiện tại và giữ snapshot; không ghi đè bằng trạng thái cũ trong repo.
2. Cập nhật title, scope, AC/DoD của 9 task đích; giữ loại TASK, chuyển evidence đầy đủ và remap dependency/parent/link.
3. Chỉ sau khi đọc lại xác nhận dữ liệu đã có ở đích mới bỏ 18 record nhỏ. Có tiến độ/evidence mới chưa chuyển thì dừng xóa record đó.
4. Kết hợp ánh xạ ngày 07/11 để đưa link ID cũ về đích cuối; không tạo bản sao hoặc bỏ lịch sử của record giữ lại.
5. Đối chiếu 37 TASK Sprint 2, 124 TASK toàn backlog; PIC giữ nguyên, không INT/TEST hoạt động, KAFKA vẫn là TASK chính. Chốt sizing/lịch bằng đầu vào owner, không tự suy công giảm từ số record.

Không chạy test, lint, typecheck, build, browser, Docker/backend hoặc hạ tầng trong lần cập nhật tài liệu. Chưa đồng bộ Lark, chưa xác nhận nghiệm thu mới.
