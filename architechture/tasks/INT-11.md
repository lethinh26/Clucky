# [INT-11] Notification list + mark-read E2E

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Cao Tất Thành |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 04/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công dự kiến | 3 SP / 4 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Notification list/badge/read trên hai app phản ánh record thật của user sau event.

## 2. Phạm vi

### Bao gồm

- Notification API integration, read/read-all/count và target navigation.
- Bàn giao theo phạm vi gốc: Notification works.

### Không bao gồm

Không admin email-log hoặc promotion email backlog.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Có notification model/helpers và UI components; sự tồn tại của UI không xác nhận list/read-state đã nối server. Đọc BE-38/39 để tách producer event, persisted notification và refresh UI.

- [frontend/nextjs/lib/notification.ts](../../frontend/nextjs/lib/notification.ts)
- [frontend/nextjs/components/notification](../../frontend/nextjs/components/notification)
- [architechture/tasks/BE-38.md](../../architechture/tasks/BE-38.md)
- [architechture/tasks/BE-39.md](../../architechture/tasks/BE-39.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | UI-32/45, BE-38/39 và auth/session. |
| Đầu ra / contract | Notification API integration, read/read-all/count và target navigation. |
| Điểm giao tiếp / deliverable đã cam kết | Notification works |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

GET my và read/read-all lấy actor từ JWT; notification ID, event ID, unread count và pagination phải cùng semantics. Chốt read-all tới mốc nào khi event mới đến; UI không tự dùng userId query để chọn người nhận.

## 4. Thứ tự thực hiện cụ thể

1. Lập bảng event nghiệp vụ → recipient → notification type/link theo BE-39; xác định producer nào đã bàn giao thật.
2. Chuẩn bị hai user A/B, dữ liệu đủ nhiều trang và một event có ID cố định để replay.
3. Nối list/loading/error/empty và link đúng resource, chỉ dùng Gateway; không lộ notification người khác trong cache dùng chung.
4. Nối mark-read/read-all, khóa request đang chạy và rollback/refetch khi lỗi; refresh trang phải giữ read state server.
5. Nối unread count/refetch theo policy, bỏ polling khi logout/rời scope; tránh append item trùng khi fetch trang và nhận event cùng lúc.
6. Bàn giao replay, ID của B, event mới trong lúc read-all và failed update với evidence notification persisted và UI reload.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt polling/refetch/count semantics; UI-32 là đầu vào nghiệm thu bổ sung dù dependency cũ chưa ghi.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Notification/UI chốt count/pagination/read-all snapshot và tần suất refresh. UI-32 là phối hợp nghiệm thu, không tự thêm dependency edge hay đổi lịch snapshot.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-38](BE-38.md) | Cao Tất Thành | My notifications pagination và trạng thái read/read-all nhất quán. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-39](BE-39.md) | Cao Tất Thành | Consumer orchestration tạo notification/email log, gửi qua Mail Sender, trạng thái gửi và chống trùng. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [DEP-09](DEP-09.md), [TEST-17](TEST-17.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Phát event cho A, load list rồi mark-read và reload | Một item đúng recipient/type/link, read-state và unread count khớp server |
| AC-02 | Replay event | Không xuất hiện item trùng |
| AC-03 | User A dùng ID của B | API chặn và UI không lộ |
| AC-04 | Mark-read lỗi | Không giữ trạng thái đã đọc giả |
| AC-05 | A gửi ID notification B hoặc đổi local cache user | Backend từ chối, response/cache không tiết lộ dữ liệu B |
| AC-06 | Mark-read lỗi và event bị replay trong lúc phân trang | Không giữ read success giả, không nhân bản item; có retry rõ |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Event→notification→UI trace trên hai app và cross-user read test.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao event-to-recipient map, ID đã mask, list/count/read traces và UI-32 contract; email delivery được kiểm chứng riêng, không suy từ in-app success.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

DEP-17: Promotion/Notification smoke test + event runbook

Không mở lại các ID đã gộp; phần việc gộp phải được kiểm chứng cùng task đích.

## 10. Tài liệu và source cần đọc

- [frontend/nextjs/lib/notification.ts](../../frontend/nextjs/lib/notification.ts)
- [frontend/nextjs/components/notification](../../frontend/nextjs/components/notification)
- [architechture/tasks/BE-38.md](../../architechture/tasks/BE-38.md)
- [architechture/tasks/BE-39.md](../../architechture/tasks/BE-39.md)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Cao Tất Thành
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 04/11/2026 08:00
**Deadline:** 04/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4594 / reczz28Rqn97VLvh
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rqn97VLvh
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 3 SP
**Time Estimated:** 4 giờ công
**Remaining Estimate:** 4 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Tính phần nối contract, xử lý lỗi liên service/UI, fixture và evidence tích hợp; không triển khai lại API đã tính ở BE hoặc chạy lại bộ regression TEST.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../docs/backlog.md#quy-ước-ước-lượng).

Lịch cũ (30/10): 05/11/2026 08:00 → 06/11/2026 23:59. Lịch mới: 04/11/2026 08:00 → 04/11/2026 23:59. Giữ khung Sprint 2 02–08/11 để truy vết; hạn hoàn thành thực tế 05/11, Sprint Review 06/11, không xếp việc triển khai/nghiệm thu vào 06–08/11.

Bắt đầu có thể là chuẩn bị fixture/UI theo contract; phần cần API/event thật bị chặn cho đến khi dependency bàn giao. Nếu cùng ngày đến hạn, phải bàn giao prerequisite trước khi nghiệm thu task này; không coi deadline trùng ngày là bằng chứng đã sẵn sàng.

</details>

## Quy ước kiểm chứng

Việc cập nhật detail không chạy test, lint, typecheck, build, Docker hoặc trình duyệt. Checklist là điều kiện nghiệm thu để người phụ trách thực hiện, không phải báo cáo PASS. Giữ trạng thái snapshot, kể cả DONE; chưa xác nhận lại trên Lark.
