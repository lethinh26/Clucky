# E1 — Reports, Reviews, Audit và đồng bộ tài liệu

Mốc: D2E. Nguồn: plan §9–11. Phụ thuộc: các spec liên quan đã đủ điều kiện nghiệm thu. Áp dụng [quy tắc chung](README.md). Trạng thái: đặc tả.

## Problem Statement

Reports/Reviews/Audit còn chỗ chưa nối thật; tài liệu ca cá nhân/quyền cũ có thể được dùng lại như chuẩn dù plan đã thay mô hình. UI hoàn chỉnh không chứng minh tích hợp hoặc task DONE.

## Solution

Nối dashboard/report thật cho Manager/Admin, review moderation đúng quyền và audit server-side. Đồng bộ nguồn yêu cầu/API/schema/events/spec Staff cùng bằng chứng triển khai; không sửa lịch sử audit hoặc tự đổi trạng thái backlog.

## User Stories

1. Là Manager, tôi muốn dashboard/report/export thật chỉ thuộc quán mình.
2. Là Admin, tôi muốn xem chuỗi/quán và xóa mềm đánh giá vi phạm.
3. Là Manager, tôi muốn reply/ẩn đánh giá quán mình nhưng không xóa mềm như Admin.
4. Là Staff, tôi giữ quyền reply cũ trong quán nhưng không được xem báo cáo doanh thu hoặc ẩn/xóa review.
5. Là Manager, tôi muốn tra thao tác account Staff quán mình; Admin muốn tra toàn hệ thống.
6. Là người triển khai, tôi muốn chỉ một bộ yêu cầu hiện hành, không vô tình làm lại check-in/ca cá nhân.
7. Là người nghiệm thu, tôi muốn phân biệt phần thực hiện, còn khóa và chưa kiểm thử.

## Implementation Decisions

### Dashboard và Reports

- Nối API thật của Review/Report; backend scope cả aggregate/list/export. Manager không fallback toàn chuỗi nếu store thiếu; Staff bị chặn kể cả export/deep link.
- Filter thời gian/quán và aggregate theo định nghĩa nghiệp vụ đã có; đồng bộ ý nghĩa số liệu mới với ledger: excess không doanh thu, pending bank reconciliation không được gắn nhãn “ngân hàng đã nhận”. Không phát minh quy tắc doanh thu mới chỉ để có biểu đồ.
- Export trả file thật theo contract, áp cùng quyền/filter; lỗi không tạo toast hoặc file giả. Dữ liệu rỗng là rỗng, không dùng mockRevenueData.

### Reviews

- Giữ owner Customer xóa review của mình theo contract cũ; bổ sung action moderation Admin xóa mềm riêng/guard rõ, không nới ownership endpoint một cách vô điều kiện.
- Manager reply/hide quán mình; Admin reply/hide/soft-delete mọi quán; Staff chỉ quyền reply cũ quán mình. Backend lấy store qua nguồn có thẩm quyền, không client khai.
- Soft delete giữ record/audit, không xóa cứng; public listing không trả review bị xóa mềm, hành vi hidden giữ theo contract hiện hữu. Mutation có concurrency/idempotency phù hợp và phản ánh sau reload.

### Audit và tài liệu

- Dùng Audit Service hiện hữu, không tạo thêm service hoặc coi array frontend là lịch sử thật. Audit lấy actor/store/target/action/version từ backend; shared account không suy thành tên nhân viên thật.
- Outbox intent chưa được dispatch/consume không đồng nghĩa có audit end-to-end. Hoàn thiện đường publish/retry/consumer/read scoped, giữ eventId qua replay, hạn chế payload nhạy cảm theo contract đã có.
- Tài liệu cần cập nhật: SRS, ma trận RBAC, API, database/migration, events, Staff spec, dependency/backlog scope. Ghi rõ dòng bị thay: check-in/ca cá nhân, dashboard Staff, kho Staff, hủy PREPARING, thu thủ công, account pair, đơn quầy, refund/hoãn chi trả.
- Task cũ về ca/cá nhân ghi cần thay phạm vi, giữ lịch sử và ID; không tự xóa task/nhận DONE/đổi PIC/SP/sprint hoặc Lark nếu không được yêu cầu. Audit 08/11 giữ nguyên kết luận lịch sử.
- Bàn giao endpoint/method/action/role/store/owner/state, migration mới và xử lý legacy, contract event, chức năng đang khóa, điều kiện mở, checklist và bằng chứng thực tế. Khi chưa triển khai không đánh spec là nghiệm thu.

### Contract đề xuất

Reports giữ API hiện hữu và DTO/report format đã tài liệu hóa, không sinh API mới chỉ vì sửa UI. Reviews bổ sung moderation soft-delete không làm mất owner route. Audit query Manager chỉ thao tác Staff quán mình, Admin toàn hệ thống, Staff không màn tra cứu riêng; lọc theo target/time/action không nới scope.

## Acceptance Criteria

- AC1: Manager không xem/export quán khác; Staff không dashboard/revenue/export bằng request trực tiếp; Admin chọn chuỗi/quán rõ.
- AC2: Dashboard/report rỗng/lỗi không dùng mock; export file thật đúng filter, excess không được tính thành doanh thu.
- AC3: Manager chỉ hide/reply quán mình; Staff chỉ reply; Admin soft-delete giữ record/audit và review không xuất hiện public.
- AC4: Audit frontend tự khai không được tin; replay event không tạo lịch sử trùng; Manager chỉ đọc hành động Staff quán mình.
- AC5: Outbox chưa dispatch/consume được ghi chưa tích hợp, không báo audit hoàn chỉnh.
- AC6: Tài liệu hiện hành không còn hai chuẩn mâu thuẫn về ca/Staff/kho/cancel/refund; audit lịch sử giữ nguyên.
- AC7: Backlog scope được đối chiếu mà không tự đổi trạng thái/PIC/SP/sprint; checklist ghi rõ việc chưa kiểm thử và các chức năng còn khóa.
- AC8: Không xuất hiện nút/API/event chi trả dư hoặc tiền đơn hết hạn trong reports/payment/refund khi tích hợp cuối.

## Testing Decisions

Chưa chạy. Boundary Gateway theo role/store/owner cho report/export/review/audit, event replay đến audit readback. Prior art: ReportSafetyTest, ReviewSafetyTest, ReviewModerationTest; review hiện có outbox không phải bằng chứng dispatcher đã chạy. Người dùng tự nghiệm thu chức năng; chỉ chạy test/browser khi được yêu cầu.

## Out of Scope

Khôi phục ca/xếp hạng nhân viên cá nhân, mở Shipping/Party/voucher proposal, xóa cứng review/audit, phát hành Lark hoặc tự nhận DONE.

## Further Notes

Khi triển khai chỉ rebuild service thực sự bị ảnh hưởng bằng script repo, chờ hoàn tất/health, giữ volumes và báo container; không rebuild stack chỉ để cập nhật tài liệu. D2E không che việc các mốc trước còn chưa nghiệm thu.
