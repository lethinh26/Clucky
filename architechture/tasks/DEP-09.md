# [DEP-09] Postman collection: mỗi người export service mình, M6 merge

**PIC:** Mai Sơn Việt
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 04/11/2026 08:00
**Deadline:** 05/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4570 / reczz28Rid5Xhv3s
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5Xhv3s
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 3 SP
**Time Estimated:** 6 giờ công
**Remaining Estimate:** 6 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Tổng hợp collection đã có từ từng domain, mask token/env; không cộng lại công viết API hoặc test nghiệp vụ.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../docs/backlog.md#quy-ước-ước-lượng).

Lịch cũ (30/10): 07/11/2026 08:00 → 07/11/2026 23:59. Lịch mới: 04/11/2026 08:00 → 05/11/2026 23:59. Giữ khung Sprint 2 02–08/11 để truy vết; hạn hoàn thành thực tế 05/11, Sprint Review 06/11, không xếp việc triển khai/nghiệm thu vào 06–08/11.

Bắt đầu có thể là chuẩn bị fixture/UI theo contract; phần cần API/event thật bị chặn cho đến khi dependency bàn giao. Nếu cùng ngày đến hạn, phải bàn giao prerequisite trước khi nghiệm thu task này; không coi deadline trùng ngày là bằng chứng đã sẵn sàng.

## Mục tiêu và phạm vi

- Tổng hợp Postman/API collection từ domain; gộp phần collection của DEP-15.
- Endpoint qua Gateway, env placeholder, không nhúng token/secret thực.
- Nhóm tự kiểm chứng/sửa lỗi cuốn chiếu, hoàn tất chậm nhất 05/11 trước Sprint Review 06/11; task chưa đạt tiêu chí không đánh DONE.

## Đầu ra

- postman/
- Mã nguồn/tài liệu/evidence của đúng domain; không commit secret.

## Dependency và phối hợp

- [INT-53](INT-53.md) — Identity → Gateway security integration: JWT claims, role, storeId propagation — PIC: Trần Nguyễn Hữu Khánh
- [INT-54](INT-54.md) — Catalog → Gateway discovery integration: menu route, cache headers, availability — PIC: Nguyễn Duy Quang Nhật
- [INT-07](INT-07.md) — Cart → checkout → tạo đơn E2E — PIC: Trần Đức Anh
- [INT-09](INT-09.md) — Payment: QR hiển thị, webhook → CONFIRMED, COD confirm — PIC: Lê Phú Thịnh
- [INT-11](INT-11.md) — Notification list + mark-read E2E — PIC: Cao Tất Thành
- [INT-13](INT-13.md) — Report/dashboard/export E2E — PIC: Mai Sơn Việt

PIC là người chịu trách nhiệm kết nối và bàn giao task. Producer/consumer hoặc API của domain khác vẫn do owner task dependency triển khai; danh sách phối hợp không phải đồng PIC.

## Checklist thực hiện

- [ ] Đối chiếu SRS/API/database/RBAC và dependency trước khi triển khai.
- [ ] Hoàn thành phạm vi và đầu ra nêu trên, gồm phần đã gộp.
- [ ] Xử lý validation, trạng thái lỗi, quyền và idempotency khi áp dụng.
- [ ] Người phụ trách tự kiểm chứng luồng chính/lỗi và ghi evidence.
- [ ] Cập nhật trạng thái thực tế; lỗi phát sinh gán một PIC theo domain.

## Tiêu chí nghiệm thu

1. Đầu ra được bàn giao đúng phạm vi: Postman collection: mỗi người export service mình, M6 merge.
2. Hoàn tất từng mục phạm vi ở trên; input hợp lệ, input lỗi và dependency lỗi được xử lý rõ theo API/docs.
3. Một PIC chịu trách nhiệm; phối hợp thông qua dependency, không thêm đồng PIC.
4. Khi có API/nghiệp vụ: DTO/validation/error shape, ownership/storeId và idempotency theo contract; frontend chỉ gọi Gateway.
5. Nhóm/người phụ trách tự kiểm chứng và ghi evidence; không coi file tồn tại hoặc UI mock là nghiệm thu chức năng.

## Truy vết gộp task

Không

Nội dung trùng đã nhập vào phạm vi/tiêu chí ở trên. Các ID nguồn không còn là task độc lập để giao lại. Phần avatar/banner, proposal và Phase 2 được giữ trong backlog theo kế hoạch, không tính là đã hoàn thành.

## Tài liệu nguồn

- `architechture/docs/SRS.md`
- `architechture/docs/Đặc tả API.md`
- `architechture/docs/Kiến trúc hệ thống.md`
- `architechture/docs/Ma trận phân quyền.md`
- `architechture/docs/Thiết kế cơ sở dữ liệu.md`
- `architechture/database/schema.sql`
- `architechture/plans/BACKLOG-REPLAN-PROPOSAL-2026-10-29.md`

## Quy ước kiểm chứng

Việc cập nhật backlog/task detail không thực thi test, lint, typecheck, build, Docker hoặc kiểm thử frontend. Nhóm tự thực hiện kiểm chứng khi triển khai; không ghi kết quả PASS trước khi có bằng chứng.
