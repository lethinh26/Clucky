# [TEST-14] Load test 50 concurrent orders

**PIC:** Mai Sơn Việt
**Trạng thái trên Lark:** TO DO
**Sprint:** BACKLOG — chưa gán sprint
**Khoảng sprint:** Chưa cam kết
**Bắt đầu:** Chưa xếp lịch
**Deadline:** Chưa xếp lịch
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4557 / reczz28Rid5XiOZ3
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5XiOZ3
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 8 SP
**Time Estimated:** 12 giờ công
**Remaining Estimate:** 12 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Tính chuẩn bị dữ liệu, chạy kịch bản nghiệm thu độc lập và ghi evidence/retest; sửa lỗi implementation thuộc task domain, không cộng hai lần.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../docs/backlog.md#quy-ước-ước-lượng).

Chỉ sizing backlog; không cam kết ngày bắt đầu/deadline và không kéo vào phạm vi phải xong 05/11.

## Mục tiêu và phạm vi

- Hoàn thành đầu ra: Load test 50 concurrent orders.
- Deliverable gốc cần bảo toàn: Load report.

## Đầu ra

- Load report
- Mã nguồn/tài liệu/evidence của đúng domain; không commit secret.

## Dependency và phối hợp

- [INT-07](INT-07.md) — Cart → checkout → tạo đơn E2E — PIC: Trần Đức Anh
- [INT-09](INT-09.md) — Payment: QR hiển thị, webhook → CONFIRMED, COD confirm — PIC: Lê Phú Thịnh

PIC là người chịu trách nhiệm kết nối và bàn giao task. Producer/consumer hoặc API của domain khác vẫn do owner task dependency triển khai; danh sách phối hợp không phải đồng PIC.

## Checklist thực hiện

- [ ] Đối chiếu SRS/API/database/RBAC và dependency trước khi triển khai.
- [ ] Hoàn thành phạm vi và đầu ra nêu trên, gồm phần đã gộp.
- [ ] Xử lý validation, trạng thái lỗi, quyền và idempotency khi áp dụng.
- [ ] Người phụ trách tự kiểm chứng luồng chính/lỗi và ghi evidence.
- [ ] Cập nhật trạng thái thực tế; lỗi phát sinh gán một PIC theo domain.

## Tiêu chí nghiệm thu

1. Đầu ra được bàn giao đúng phạm vi: Load test 50 concurrent orders.
2. Hoàn tất từng mục phạm vi ở trên; input hợp lệ, input lỗi và dependency lỗi được xử lý rõ theo API/docs.
3. Một PIC chịu trách nhiệm; phối hợp thông qua dependency, không thêm đồng PIC.
4. Khi có API/nghiệp vụ: DTO/validation/error shape, ownership/storeId và idempotency theo contract; frontend chỉ gọi Gateway.
5. Nhóm/người phụ trách tự kiểm chứng và ghi evidence; không coi file tồn tại hoặc UI mock là nghiệm thu chức năng.
6. Chưa cam kết trong Sprint 1/2; chưa có Start Date/End Date. Chỉ xếp lịch khi được đưa vào sprint sau.

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
