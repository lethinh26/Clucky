# [TEST-22] OTP/order/payment/refund email E2E flows

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Cao Tất Thành |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 05/11/2026 08:00 → 05/11/2026 23:59 |
| SP / giờ công dự kiến | 5 SP / 6 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Email OTP/order/payment/status/refund đúng người nhận, template và state thật sau nghiệp vụ.

## 2. Phạm vi

### Bao gồm

- E2E email matrix từ event/auth tới SMTP outcome và nội dung nhận được.
- OTP/order/payment/status/refund email đúng người nhận/template/state; promotion.approved theo backlog INT-58.

### Không bao gồm

promotion.approved thuộc INT-58 backlog; không gửi thử tới khách thật không được phép.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

BE-60/61/65/66 và INT-60 là đầu vào sender/template/retry/trace. MailSenderProperties/config hoặc template file tồn tại chưa chứng minh SMTP gửi hay inbox nhận; dùng mailbox test được cho phép.

- [architechture/tasks/BE-60.md](../../architechture/tasks/BE-60.md)
- [architechture/tasks/BE-61.md](../../architechture/tasks/BE-61.md)
- [architechture/tasks/BE-65.md](../../architechture/tasks/BE-65.md)
- [architechture/tasks/BE-66.md](../../architechture/tasks/BE-66.md)
- [architechture/tasks/INT-60.md](../../architechture/tasks/INT-60.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | INT-05/09/52, BE-39/64/65, controlled recipients và email_logs. |
| Đầu ra / contract | E2E email matrix từ event/auth tới SMTP outcome và nội dung nhận được. |
| Điểm giao tiếp / deliverable đã cam kết | Email E2E |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Case nghiệp vụ OTP/register/reset/order/payment/refund → recipient/template/purpose → event/message/correlation → email log/SMTP outcome → mailbox evidence. APPROVED khác REFUNDED; accepted khác delivered/inbox, ghi thời điểm và mức chứng cứ.

## 4. Thứ tự thực hiện cụ thể

1. Chốt mailbox/sender test và danh sách template version với owner; chưa có credential cấu hình an toàn thì blocked, không dùng Gmail khách.
2. Lập expected subject/body variables/recipient/state từ contract, gồm OTP purpose/expiry và refund semantic; không lưu OTP thật trong fixture report.
3. Mô tả tạo từng nghiệp vụ bằng API/UI thật, ghi IDs để nối producer→render→send→email log.
4. Đối chiếu mailbox test với log, kiểm link/reference/locale/escaping và không có dữ liệu khách khác; SMTP accepted không tự ghi inbox delivered.
5. Thêm replay event, recipient sai/thiếu và delayed delivery/expiry, theo policy dedup/unknown outcome, không resend vô hạn tới mailbox thật.
6. Bàn giao evidence đã mask, timing/outcomes và bug/PIC/retest; người dùng mới thực hiện gửi mail khi cho phép.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Bổ sung template BE-65 và sender/recipient bàn giao; phân biệt SMTP accepted với mail đến inbox/spam.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Notification/domain chốt event-template map, expiry và delivery observation window. Không nhận được inbox chưa đủ kết luận không gửi; phân loại accepted/spam/unknown theo chứng cứ.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [INT-05](INT-05.md) | Trần Nguyễn Hữu Khánh | Luồng auth hai app với JWT/refresh thật, register/OTP chỉ Customer. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-09](INT-09.md) | Lê Phú Thịnh | QR thật→đối soát→payment PAID→Order CONFIRMED; COD thu đúng role/store. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-52](INT-52.md) | Lê Phú Thịnh | Refund E2E với approve/reject/refunded, audit/notification và chống lặp. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [BE-39](BE-39.md) | Cao Tất Thành | Consumer orchestration tạo notification/email log, gửi qua Mail Sender, trạng thái gửi và chống trùng. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** Chưa có task khai báo phụ thuộc trong snapshot.

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Mỗi nghiệp vụ trong matrix phát email tới mailbox test được phép | Recipient/template/state đúng, IDs nối được; ghi rõ accepted hay thực nhận |
| AC-02 | Refund mới approved | Không nhận email nói đã hoàn tiền |
| AC-03 | Replay event | Không nhận email trùng theo policy |
| AC-04 | OTP/reset | Đúng purpose/recipient/expiry, không lộ log |
| AC-05 | Refund chỉ APPROVED hoặc OTP/reset khác purpose | Không nói đã hoàn tiền trước REFUNDED, OTP đúng mục đích/expiry và không lộ log |
| AC-06 | Replay cùng logical message hoặc delayed SMTP outcome | Không gửi trùng ngoài policy, duplicate/unknown được trace minh bạch |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Event/template matrix, masked email examples và log/message IDs.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao event-template-recipient matrix và log/mailbox evidence redacted, không chứa OTP/password thật; chưa gửi SMTP trong lượt này.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [architechture/tasks/BE-60.md](../../architechture/tasks/BE-60.md)
- [architechture/tasks/BE-61.md](../../architechture/tasks/BE-61.md)
- [architechture/tasks/BE-65.md](../../architechture/tasks/BE-65.md)
- [architechture/tasks/BE-66.md](../../architechture/tasks/BE-66.md)
- [architechture/tasks/INT-60.md](../../architechture/tasks/INT-60.md)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Cao Tất Thành
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 05/11/2026 08:00
**Deadline:** 05/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4608 / reczz28Rqn97UJfU
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rqn97UJfU
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 5 SP
**Time Estimated:** 6 giờ công
**Remaining Estimate:** 6 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Tính chuẩn bị dữ liệu, chạy kịch bản nghiệm thu độc lập và ghi evidence/retest; sửa lỗi implementation thuộc task domain, không cộng hai lần.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../docs/backlog.md#quy-ước-ước-lượng).

Lịch cũ (30/10): 07/11/2026 08:00 → 07/11/2026 23:59. Lịch mới: 05/11/2026 08:00 → 05/11/2026 23:59. Giữ khung Sprint 2 02–08/11 để truy vết; hạn hoàn thành thực tế 05/11, Sprint Review 06/11, không xếp việc triển khai/nghiệm thu vào 06–08/11.

Bắt đầu có thể là chuẩn bị fixture/UI theo contract; phần cần API/event thật bị chặn cho đến khi dependency bàn giao. Nếu cùng ngày đến hạn, phải bàn giao prerequisite trước khi nghiệm thu task này; không coi deadline trùng ngày là bằng chứng đã sẵn sàng.

</details>

## Quy ước kiểm chứng

Việc cập nhật detail không chạy test, lint, typecheck, build, Docker hoặc trình duyệt. Checklist là điều kiện nghiệm thu để người phụ trách thực hiện, không phải báo cáo PASS. Giữ trạng thái snapshot, kể cả DONE; chưa xác nhận lại trên Lark.
