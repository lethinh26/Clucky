# [TEST-23] Email failure does not rollback order/payment

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Cao Tất Thành |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 05/11/2026 08:00 → 05/11/2026 23:59 |
| SP / giờ công dự kiến | 5 SP / 4 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Gmail lỗi không làm rollback hoặc báo thất bại giả cho Order/Payment đã commit.

## 2. Phạm vi

### Bao gồm

- Failure-isolation evidence, retry hữu hạn và email FAILED state.
- Gmail lỗi/timeout không rollback order/payment; log FAILED và retry có giới hạn.

### Không bao gồm

Không tắt email rồi coi đó là thử lỗi; không dùng mock Order thay persistence thật.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Notification delivery là downstream, không được rollback Order/Payment đã commit. BE-66/67 và INT-46 cần retry/DLQ bền vững; fault test phải tách với credential production.

- [architechture/tasks/BE-39.md](../../architechture/tasks/BE-39.md)
- [architechture/tasks/BE-66.md](../../architechture/tasks/BE-66.md)
- [architechture/tasks/BE-67.md](../../architechture/tasks/BE-67.md)
- [architechture/tasks/INT-46.md](../../architechture/tasks/INT-46.md)
- [backend/notification-service](../../backend/notification-service)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | BE-66/39, INT-07/09, test SMTP auth/timeout faults và persisted nghiệp vụ. |
| Đầu ra / contract | Failure-isolation evidence, retry hữu hạn và email FAILED state. |
| Điểm giao tiếp / deliverable đã cam kết | Failure isolation test |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Baseline order/payment committed + message identity → SMTP timeout/auth failure → business state unchanged + delivery failure/retry/DLQ trace. Unknown SMTP outcome không mặc định fail-before-send; retry policy tránh gửi lặp ngoài guarantee.

## 4. Thứ tự thực hiện cụ thể

1. Chốt môi trường/fault injection adapter hoặc cấu hình test biệt lập và restore plan; không đổi password sender production.
2. Chuẩn bị order/payment hợp lệ và expected persisted states trước fault, ghi correlation/message IDs đã mask.
3. Mô tả gây timeout/auth failure ở sender sau event nghiệp vụ, không thay response Order bằng mock fail.
4. Đối chiếu Order/Payment không rollback hoặc tự hủy, email log lưu failure/attempt và consumer timeout hữu hạn.
5. Khôi phục sender và retry/replay đúng message theo policy; kiểm business records/event effects không nhân đôi, mail unknown xử lý đúng rule.
6. Bàn giao timeline before/fault/recovery cùng bug/PIC, cleanup fault config an toàn; chưa chạy SMTP/Kafka/Order trong lượt detail.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt retry/backoff và safe fault injection, không thay credential production để test.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Notification/Order/Payment chốt timeout budget, retry/terminal và unknown outcome. Không hứa zero duplicate email nếu SMTP acknowledgment bị mất mà contract chưa bảo đảm.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-66](BE-66.md) | Cao Tất Thành | Backoff hữu hạn, retry_count, terminal FAILED và retry idempotent. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-39](BE-39.md) | Cao Tất Thành | Consumer orchestration tạo notification/email log, gửi qua Mail Sender, trạng thái gửi và chống trùng. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [INT-07](INT-07.md) | Trần Đức Anh | Cart→preview→submit→order detail qua Gateway với trạng thái nhất quán. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-09](INT-09.md) | Lê Phú Thịnh | QR thật→đối soát→payment PAID→Order CONFIRMED; COD thu đúng role/store. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** Chưa có task khai báo phụ thuộc trong snapshot.

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Order/Payment đã commit gặp SMTP auth failure hoặc timeout | Business state giữ đúng, delivery failure có trace và không treo consumer vô hạn |
| AC-02 | SMTP auth sai | Order/payment không đảo ngược |
| AC-03 | Timeout nhiều lần | Consumer không treo vô hạn |
| AC-04 | Khôi phục SMTP/replay | Không tạo thêm order/payment hoặc gửi lặp ngoài policy |
| AC-05 | Fault kéo dài qua retry budget | Có terminal/DLQ bền vững theo policy, không ack mất message hoặc retry không kiểm soát |
| AC-06 | Khôi phục và replay cùng message | Không thêm Order/Payment, email outcome theo idempotency/unknown policy được ghi rõ |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Before/after Order/Payment, email retry timeline và failure/recovery log đã mask.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao fault/restore plan và state/count before-after cùng email retry evidence; không lưu credential thật hoặc thao tác production.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [architechture/tasks/BE-39.md](../../architechture/tasks/BE-39.md)
- [architechture/tasks/BE-66.md](../../architechture/tasks/BE-66.md)
- [architechture/tasks/BE-67.md](../../architechture/tasks/BE-67.md)
- [architechture/tasks/INT-46.md](../../architechture/tasks/INT-46.md)
- [backend/notification-service](../../backend/notification-service)
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
**Mã Lark:** Mail-4609 / reczz28Rqn97TvLs
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rqn97TvLs
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 5 SP
**Time Estimated:** 4 giờ công
**Remaining Estimate:** 4 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
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
