# A3 — Chuyển dữ liệu tài khoản và audit shared account

Mốc: D2A. Nguồn: plan §5.3. Phụ thuộc: Admin xác nhận mapping; phối hợp A1/A2. Áp dụng [quy tắc chung](README.md). Trạng thái: đặc tả, chưa triển khai/chạy migration.

## Problem Statement

Dữ liệu cũ có thể nhiều Manager/Staff mỗi quán. Tự chọn một account hoặc xóa user sẽ làm mất actor lịch sử và có thể khóa nhầm người vận hành.

## Solution

Kiểm kê, Admin duyệt cặp giữ lại, bảo toàn account ID và lịch sử; tài khoản dư ngừng tác nghiệp, thu hồi session. Chỉ áp unique sau khi dữ liệu không còn xung đột.

## User Stories

1. Là Admin, tôi muốn xem danh sách account hiện tại và xác nhận cặp giữ cho từng quán.
2. Là Admin, tôi muốn account dư không đăng nhập/tác nghiệp nhưng vẫn được truy vết lịch sử.
3. Là Manager, tôi muốn thao tác Staff quán mình được audit theo account/session, không gán thành danh tính cá nhân.
4. Là người vận hành, tôi muốn nhiều thiết bị cùng account không bị coi là nhiều nhân viên.
5. Là Admin, tôi muốn chuyển đổi có backup, bước dừng và bằng chứng đối chiếu trước/sau.

## Implementation Decisions

- Chuẩn bị bảng store → account Manager giữ → account Staff giữ → account dư → recovery email/verification → xung đột/thiếu dữ liệu. Không chọn ID nhỏ nhất hoặc tự suy email recovery.
- Admin xác nhận mapping rõ trước mutation. Quán thiếu/quá số lượng/chưa resolve dừng bước áp constraint tương ứng; không tạo dữ liệu giả để migration pass.
- Backup trước chuyển dữ liệu; migration mới tách giai đoạn chuẩn bị schema, chuyển dữ liệu đã duyệt, áp ràng buộc. Không sửa migration đã áp dụng hoặc đổi primary key.
- Account dư khóa/ngừng là tài khoản vận hành, revoke session; giữ tham chiếu actor/order/audit nguyên vẹn. Account hiện hành khóa tạm vẫn chiếm slot, khác account lịch sử đã được loại khỏi mô hình vận hành có chủ đích.
- Unique hiện hành theo store/role chỉ áp sau đối chiếu mỗi quán đúng cặp. Không FK xuyên Catalog/Identity; không gán lại actor lịch sử cho account dùng chung.
- Audit account/role/store/session/thời gian/action/target/result/correlation; Manager xem hành động Staff quán mình, Admin toàn hệ thống, Staff không màn tra cứu riêng. Không ghi “nhân viên X thực hiện” khi chỉ biết account dùng chung.
- Tài liệu chuyển đổi có điểm dừng và hướng phục hồi bảo toàn giao dịch mới; không restore backup đè dữ liệu mới một cách tự động.

### Contract bàn giao dữ liệu

Input là mapping được Admin xác nhận cùng kết quả kiểm kê; output là báo cáo before/after theo quán, account giữ/ngừng, session đã revoke, constraint và mục cần xử lý. Dữ liệu nhạy cảm không nằm trong báo cáo công khai/repo; không xuất hash password/token.

## Acceptance Criteria

- AC1: Không chuyển dữ liệu khi chưa có mapping được duyệt; không chọn ngẫu nhiên/ID nhỏ nhất.
- AC2: Sau chuyển đổi, quán hợp lệ đúng hai account vận hành; account dư không dùng session cũ được.
- AC3: Account ID và actor lịch sử không đổi; audit/order vẫn tra được account cũ.
- AC4: Unique chặn account thứ hai dù account hiện hành đang khóa; legacy account đã retired không bị xóa để đạt unique.
- AC5: Hai phiên cùng Staff được ghi riêng ở mức session, không được diễn giải là hai nhân viên xác định.
- AC6: Manager không đọc audit quán khác; Staff không truy cập màn/API audit tra cứu riêng.
- AC7: Có backup và báo cáo chuyển đổi, trường hợp chưa xử lý không bị đánh dấu hoàn tất.

## Testing Decisions

Chưa chạy. Kiểm chứng bằng dữ liệu chuyển đổi đại diện và readback qua API/account session; kiểm tra bảo toàn ID trước/sau. Tham khảo SessionRevocationServiceTest và cơ chế audit hiện hữu; không test trên database thật hoặc chạy migration trong lượt viết spec.

## Out of Scope

Xóa user lịch sử, đổi actor lịch sử, tự nhận dạng người thật, ca/PIN/chấm công, tự thay Admin hiện hữu.

## Further Notes

A3 là điều kiện an toàn dữ liệu để A1 áp mô hình mới, không phải tác vụ đã được phép thực thi chỉ vì spec tồn tại.
