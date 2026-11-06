# [INT-48] Audit Service: producer/consumer cho mọi thay đổi quản trị

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Mai Sơn Việt |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 03/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công dự kiến | 5 SP / 6 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Mọi thay đổi thành công của Staff/Manager/Admin được ghi tập trung vào Audit Service, không chỉ vài thao tác nhạy cảm.

## 2. Phạm vi

### Bao gồm

- Producer từng domain, durable event flow và idempotent consumer ghi duy nhất audit_service.audit_logs.
- Consumer tại Audit Service nhận sự kiện audit từ các service và lưu duy nhất vào `audit_service.audit_logs`, dùng entity/repository BE-43; không lưu audit tại Review & Report.
- Service phát sinh thao tác chịu trách nhiệm phát sự kiện có eventId/correlationId/sourceService/actor/role/storeId/action/target/occurredAt và detail trước–sau. Lấy actor/role từ xác thực backend, store từ đối tượng bị tác động; không tin frontend và không ghi trực tiếp vào schema Audit Service. Loại password/hash, OTP, token và secret trước khi phát.
- Lập checklist mọi thao tác thay đổi trên trang quản trị theo Staff/Manager/Admin và domain: tài khoản/quyền, cửa hàng/menu/giá/kho, đơn hàng, thanh toán/hoàn tiền, khuyến mãi/điểm, cấu hình, đánh giá. Mỗi owner domain triển khai producer của mình; PIC INT-48 chịu kết nối và coverage, không coi consumer đơn lẻ là hoàn tất.
- Chỉ ghi thay đổi đã commit; rollback không được ghi thành thay đổi thành công. Producer cần cơ chế phát tin bền vững/retry khi Kafka lỗi để thay đổi đã commit không bị mất audit; retry giữ nguyên eventId. Không dùng fire-and-forget hoặc log request thay cho audit nghiệp vụ.
- SP/giờ và lịch đang giữ snapshot cũ; cần ước lượng lại coverage producer và bàn giao base BE-43 trước khi nối consumer.
- Consumer xử lý idempotent theo eventId: phát lại cùng sự kiện không tạo thêm bản ghi audit. BE-43 tra cứu cùng bảng đã lưu.

### Không bao gồm

Không bảng audit ở Review & Report, không frontend tự POST audit, không fire-and-forget thay lưu bền vững.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Audit Service có controller/service và Review có ReviewAuditOutbox; đó chỉ là một phần coverage. Cần kiểm kê producer ở từng domain thay vì tuyên bố toàn hệ thống đã audit vì query trả dữ liệu.

- [backend/audit-service](../../backend/audit-service)
- [backend/review-report-service/src/main/java/com/clucky/reviewreportservice/service/ReviewAuditOutbox.java](../../backend/review-report-service/src/main/java/com/clucky/reviewreportservice/service/ReviewAuditOutbox.java)
- [architechture/tasks/BE-43.md](../../architechture/tasks/BE-43.md)
- [architechture/docs/Ma trận phân quyền.md](../../architechture/docs/Ma%20trận%20phân%20quyền.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | Domain mutations, actor/role/store từ backend, before/after đã lọc secret và audit.recorded contract. |
| Đầu ra / contract | Producer từng domain, durable event flow và idempotent consumer ghi duy nhất audit_service.audit_logs. |
| Điểm giao tiếp / deliverable đã cam kết | Producer theo checklist mọi thay đổi quản trị và consumer tại Audit Service ghi vào `audit_service.audit_logs`. |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Actor từ auth context, sourceService/action/targetType/targetId/storeId, eventId/correlationId và timestamp; before/after chỉ allowlist trường an toàn. Manager chỉ xem thao tác Staff quán mình theo RBAC, không chỉ lọc store rồi cho xem mọi role.

## 4. Thứ tự thực hiện cụ thể

1. Lập coverage matrix account/role, catalog/store/kho, order/payment/refund, promotion/loyalty/config/review; mỗi producer có owner và trạng thái đã nối/chưa nối.
2. Chốt envelope/version/field masking với Audit; loại password/token/OTP/bank secret khỏi payload từ producer, không đợi viewer che.
3. Nối publish sau mutation commit bằng durable recovery phù hợp từng service; rollback không ghi audit thành công.
4. Consumer Audit validate/dedup và persist rồi ack; replay giữ eventId, broker failure không mất mutation đã commit.
5. Nối query list/filter/detail theo RBAC thực, kiểm tra Manager filter actorRole và store không mở rộng quyền.
6. Bàn giao từng coverage row bằng mutation thật và query readback; domain chưa có producer ghi blocked/owner, không làm task tổng mất dấu.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** M6 cần BE-43 và producer của từng owner domain; coverage làm theo mốc, không đợi một task tổng khổng lồ mới chốt contract. Cần ước lượng lại do tách service.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Audit + từng domain chốt coverage theo mốc, redaction và reliability; estimate thay đổi cần nhóm duyệt riêng, không tự sửa snapshot. Review outbox không phải template bắt buộc nếu cơ chế hiện hữu đã đủ.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-11](BE-11.md) | Mai Sơn Việt | Topic config và producer/consumer factory/config; ranh giới retry/DLQ bàn giao cho INT-46. | Chốt contract/cấu hình trước khi viết phần phụ thuộc; nghiệm thu bằng bản upstream đã bàn giao. |
| [BE-43](BE-43.md) | Mai Sơn Việt | Module Audit riêng, migration/entity/repository audit_service.audit_logs, GET /api/audit-logs qua Gateway, Config/Eureka/package độc lập. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** Chưa có task khai báo phụ thuộc trong snapshot.

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Mutation quản trị hợp lệ của từng domain được coverage và query Audit | Có record đúng actor/target/source/scope, trace về mutation và không secret |
| AC-02 | Mutation rollback | Không có audit thành công |
| AC-03 | Kafka lỗi rồi retry/replay | Không mất thay đổi đã commit hoặc tạo record trùng |
| AC-04 | Request giả actor/store/secret | Actor đáng tin cậy, secret không được lưu |
| AC-05 | Mutation rollback hoặc broker outage rồi replay | Không audit success cho rollback, committed mutation không mất/nhân record |
| AC-06 | Client giả actor/store trong body và Manager A lọc actor ADMIN/quán B | Actor vẫn từ phiên tin cậy; query không lộ record trái RBAC |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Mutation→event→audit→query trace cho từng domain/role, rollback/outage/replay và redaction cases.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao coverage matrix theo producer owner, event samples masked và audit query evidence; nêu rõ phần chưa nối thay vì đánh done toàn bộ.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

Không

Không có ID gộp trực tiếp vào task này.

## 10. Tài liệu và source cần đọc

- [backend/audit-service](../../backend/audit-service)
- [backend/review-report-service/src/main/java/com/clucky/reviewreportservice/service/ReviewAuditOutbox.java](../../backend/review-report-service/src/main/java/com/clucky/reviewreportservice/service/ReviewAuditOutbox.java)
- [architechture/tasks/BE-43.md](../../architechture/tasks/BE-43.md)
- [architechture/docs/Ma trận phân quyền.md](../../architechture/docs/Ma%20trận%20phân%20quyền.md)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Mai Sơn Việt
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 03/11/2026 08:00
**Deadline:** 04/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4518 / reczz28Rid5XjWiu
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5XjWiu
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 5 SP
**Time Estimated:** 6 giờ công
**Remaining Estimate:** 6 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Tính phần nối contract, xử lý lỗi liên service/UI, fixture và evidence tích hợp; không triển khai lại API đã tính ở BE hoặc chạy lại bộ regression TEST.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../docs/backlog.md#quy-ước-ước-lượng).

Lịch cũ (30/10): 04/11/2026 08:00 → 05/11/2026 23:59. Lịch mới: 03/11/2026 08:00 → 04/11/2026 23:59. Giữ khung Sprint 2 02–08/11 để truy vết; hạn hoàn thành thực tế 05/11, Sprint Review 06/11, không xếp việc triển khai/nghiệm thu vào 06–08/11.

Bắt đầu có thể là chuẩn bị fixture/UI theo contract; phần cần API/event thật bị chặn cho đến khi dependency bàn giao. Nếu cùng ngày đến hạn, phải bàn giao prerequisite trước khi nghiệm thu task này; không coi deadline trùng ngày là bằng chứng đã sẵn sàng.

</details>

## Quy ước kiểm chứng

Việc cập nhật detail không chạy test, lint, typecheck, build, Docker hoặc trình duyệt. Checklist là điều kiện nghiệm thu để người phụ trách thực hiện, không phải báo cáo PASS. Giữ trạng thái snapshot, kể cả DONE; chưa xác nhận lại trên Lark.
