# [INT-52] Tích hợp refund: duyệt/từ chối, cập nhật thanh toán, thông báo và nghiệm thu

> Detail biên soạn lại ngày 02/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới là lịch sử, không phải xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Lê Phú Thịnh |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 04/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công dự kiến | 8 SP / 12 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Duyệt/từ chối/ghi nhận hoàn tiền đồng bộ Order–Payment–Notification và UI theo phạm vi quán.

## 2. Phạm vi

### Bao gồm

- Refund E2E với approve/reject/refunded, audit/notification và chống lặp.
- Manager/Admin duyệt/từ chối refund đúng quán; Payment đánh REFUNDED sau xử lý; Notification nhận event.
- Gộp INT-66 + TEST-03/11: đầy đủ approve/reject/refunded, lặp request và quyền sai.
- Không tự thực hiện chuyển tiền ngân hàng; nghiệm thu phản ánh trạng thái theo docs.

### Không bao gồm

Không thực hiện chuyển tiền ngân hàng tự động; không bỏ kiểm chứng vì API trả 200.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | BE-26/46 refund requests, Payment actions/events, BE-39 và actor Manager/Admin. |
| Đầu ra / contract | Refund E2E với approve/reject/refunded, audit/notification và chống lặp. |
| Điểm giao tiếp / deliverable đã cam kết | Tích hợp refund: duyệt/từ chối, cập nhật thanh toán, thông báo và nghiệm thu |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

## 4. Luồng xử lý / cách thực hiện

1. Khách/nhân sự tạo request đúng điều kiện
2. Manager/Admin quyết định theo store
3. Ghi trạng thái xử lý hoàn và event, đối chiếu UI/backend

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt source of truth mỗi state và thời điểm thông báo; không coi APPROVED là REFUNDED.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-46](BE-46.md) | Lê Phú Thịnh | State machine/refund decision cùng số tiền/role kiểm tra nhất quán. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-26](BE-26.md) | Trần Đức Anh | Cancel/reject và refund_request PENDING khi cần; history và đầu ra event cho INT-39/47. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-39](BE-39.md) | Cao Tất Thành | Consumer orchestration tạo notification/email log, gửi qua Mail Sender, trạng thái gửi và chống trùng. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [INT-40](INT-40.md) | Lê Phú Thịnh | Payment event contract/producer cho Order/Notification/Report. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [INT-64](INT-64.md), [TEST-22](TEST-22.md)

## 7. Tiêu chí nghiệm thu

| AC | Điều kiện / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Đủ đầu vào hợp lệ và contract đã được xác nhận | Refund E2E với approve/reject/refunded, audit/notification và chống lặp. |
| AC-02 | Reject thiếu điều kiện/lý do theo contract | Không ghi thành công giả |
| AC-03 | Duplicate approve/refund | Không hoàn/notify hai lần |
| AC-04 | Manager quán A duyệt B | Bị chặn |

Các AC chưa có kết quả trong lần biên soạn này. Với task UI, fixture chỉ nghiệm thu giao diện; E2E thật thuộc task INT/TEST tương ứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] AC-01: Đủ đầu vào hợp lệ và contract đã được xác nhận — ghi kết quả và evidence.
- [ ] AC-02: Reject thiếu điều kiện/lý do theo contract — ghi kết quả và evidence.
- [ ] AC-03: Duplicate approve/refund — ghi kết quả và evidence.
- [ ] AC-04: Manager quán A duyệt B — ghi kết quả và evidence.
- [ ] Bàn giao bằng chứng cụ thể: Full state sequence, permission/replay cases, order/payment/email/audit evidence.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

## 9. Truy vết gộp task

INT-66: Admin refund approval + payment reconciliation E2E; TEST-03: E2E cancel→refund request→approve→refunded; TEST-11: Refund: approve/reject/refunded state transitions

Không mở lại các ID đã gộp; phần việc gộp phải được kiểm chứng cùng task đích.

## 10. Tài liệu nguồn

- [SRS.md](../../architechture/docs/SRS.md)
- [Đặc tả API.md](../../architechture/docs/%C4%90%E1%BA%B7c%20t%E1%BA%A3%20API.md)
- [Kiến trúc hệ thống.md](../../architechture/docs/Ki%E1%BA%BFn%20tr%C3%BAc%20h%E1%BB%87%20th%E1%BB%91ng.md)
- [Ma trận phân quyền.md](../../architechture/docs/Ma%20tr%E1%BA%ADn%20ph%C3%A2n%20quy%E1%BB%81n.md)
- [Thiết kế cơ sở dữ liệu.md](../../architechture/docs/Thi%E1%BA%BFt%20k%E1%BA%BF%20c%C6%A1%20s%E1%BB%9F%20d%E1%BB%AF%20li%E1%BB%87u.md)
- [schema.sql](../../architechture/database/schema.sql)
- [Kế hoạch gốc trong Git (lịch sử)](https://github.com/lethinh26/Clucky/blob/2cc31a09689e718fb49d2d0a80f5813057547c17/architechture/plans/BACKLOG-REPLAN-PROPOSAL-2026-10-29.md)
- [Danh mục lỗi và quy tắc sinh mã](../../contracts/README.md)
- [Danh mục error code](../../contracts/errors.json)
- [Brand Guidelines](../docs/Brand_Guidelines.md)
- [Backlog tổng hợp và quy ước ước lượng](../../docs/backlog.md)

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Lê Phú Thịnh
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 04/11/2026 08:00
**Deadline:** 04/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4624 / reczz28Rqzs2O5fu
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rqzs2O5fu
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 8 SP
**Time Estimated:** 12 giờ công
**Remaining Estimate:** 12 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Đã gồm INT-66 và TEST-03/11: approve/reject/refunded, idempotency/quyền và email; không triển khai lại state machine BE-46.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../docs/backlog.md#quy-ước-ước-lượng).

Lịch cũ (30/10): 05/11/2026 08:00 → 06/11/2026 23:59. Lịch mới: 04/11/2026 08:00 → 04/11/2026 23:59. Giữ khung Sprint 2 02–08/11 để truy vết; hạn hoàn thành thực tế 05/11, Sprint Review 06/11, không xếp việc triển khai/nghiệm thu vào 06–08/11.

Bắt đầu có thể là chuẩn bị fixture/UI theo contract; phần cần API/event thật bị chặn cho đến khi dependency bàn giao. Nếu cùng ngày đến hạn, phải bàn giao prerequisite trước khi nghiệm thu task này; không coi deadline trùng ngày là bằng chứng đã sẵn sàng.

</details>

## Quy ước kiểm chứng

Việc cập nhật detail không chạy test, lint, typecheck, build, Docker hoặc trình duyệt. Checklist là điều kiện nghiệm thu để người phụ trách thực hiện, không phải báo cáo PASS. Giữ trạng thái snapshot, kể cả DONE; chưa xác nhận lại trên Lark.
