# [TEST-22] OTP/order/payment/refund email E2E flows

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

## Mục tiêu và phạm vi

- OTP/order/payment/status/refund email đúng người nhận/template/state; promotion.approved theo backlog INT-58.
- Nhóm tự kiểm chứng/sửa lỗi cuốn chiếu, hoàn tất chậm nhất 05/11 trước Sprint Review 06/11; task chưa đạt tiêu chí không đánh DONE.

## Đầu ra

- Email E2E
- Mã nguồn/tài liệu/evidence của đúng domain; không commit secret.

## Dependency và phối hợp

- [INT-05](INT-05.md) — Auth E2E: register → OTP → login → refresh, 2 app — PIC: Trần Nguyễn Hữu Khánh
- [INT-09](INT-09.md) — Payment: QR hiển thị, webhook → CONFIRMED, COD confirm — PIC: Lê Phú Thịnh
- [INT-52](INT-52.md) — Tích hợp refund: duyệt/từ chối, cập nhật thanh toán, thông báo và nghiệm thu — PIC: Lê Phú Thịnh
- [BE-39](BE-39.md) — Notification consumer: in-app/email orchestration, idempotency và Kafka replay protection — PIC: Cao Tất Thành

PIC là người chịu trách nhiệm kết nối và bàn giao task. Producer/consumer hoặc API của domain khác vẫn do owner task dependency triển khai; danh sách phối hợp không phải đồng PIC.

## Checklist thực hiện

- [ ] Đối chiếu SRS/API/database/RBAC và dependency trước khi triển khai.
- [ ] Hoàn thành phạm vi và đầu ra nêu trên, gồm phần đã gộp.
- [ ] Xử lý validation, trạng thái lỗi, quyền và idempotency khi áp dụng.
- [ ] Người phụ trách tự kiểm chứng luồng chính/lỗi và ghi evidence.
- [ ] Cập nhật trạng thái thực tế; lỗi phát sinh gán một PIC theo domain.

## Tiêu chí nghiệm thu

1. Đầu ra được bàn giao đúng phạm vi: OTP/order/payment/refund email E2E flows.
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
