# A3 — Chuyển dữ liệu tài khoản và audit shared account

Mốc: D2A. Nguồn: plan §5.3. Áp dụng [quy tắc chung](README.md). Quyết định mới ngày 2026-11-11 thay thế luồng chuyển đổi thủ công mô tả trong phần lịch sử bên dưới.

## Quyết định hiện hành — bỏ chuyển đổi thủ công

- Không còn tab/modal, kiểm kê, báo cáo chuyển đổi hoặc API migration dành cho Admin. Trang tài khoản chỉ quản lý tài khoản hiện hành và nhật ký. Bảng báo cáo cũ vẫn được giữ để không xóa dữ liệu lịch sử.
- Flyway Identity V10 đưa tài khoản đã có vào cặp hiện hành khi mỗi chi nhánh chưa có cặp có đúng một Manager và một Staff. Có trùng vai trò, thiếu tài khoản, store ID hoặc đăng nhập thì dừng toàn bộ migration, không tự chọn, khóa hay xóa tài khoản.
- Giữ ID, mật khẩu, trạng thái khóa/kích hoạt và phiên đăng nhập. `login_name` giữ tên hiện có, hoặc nhận email đăng nhập cũ nếu chưa có tên; không buộc tài khoản đã có đổi thông tin đăng nhập. Tài khoản chi nhánh mới tiếp tục dùng quy tắc tên đăng nhập của A1.
- Không tự suy ra email khôi phục chung từ email cá nhân/cũ. Cặp được đưa vào hiện hành có thể chưa thiết lập email khôi phục; Admin dùng luồng RECOVERY hiện có với mật khẩu và OTP để bổ sung. Đăng nhập cũ tiếp tục hoạt động; tự khôi phục chỉ có thể gửi mã sau khi có email thật.
- Catalog V16 bỏ trạng thái LEGACY, dùng UNPROVISIONED cho chi nhánh chưa có tài khoản. Catalog đồng bộ cặp và trạng thái READY từ Identity qua REST/Eureka, không SQL join xuyên service. Chỉ chi nhánh READY mới nhận đơn; chi nhánh thiếu tài khoản được đóng tạm (giữ INACTIVE), không tự sinh tài khoản/mật khẩu giả.
- Trước triển khai cần sao lưu riêng dữ liệu Identity/Catalog và giữ ngoài Git. Khi triển khai: cập nhật Identity trước, rồi Catalog và Admin; giữ volumes. Flyway có kiểm tra ràng buộc và dừng nếu dữ liệu không đủ điều kiện. Không ghi hash mật khẩu/token vào báo cáo.
- Kiểm thử chức năng do người dùng thực hiện. Build/healthcheck và đối chiếu dữ liệu sau migration không thay thế kiểm thử chức năng.

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

### Lịch sử luồng Admin — đã bị thay thế

- Chỉ hiện chuyển đổi cho chi nhánh legacy chưa có cặp hiện hành. Nếu mỗi vai trò có đúng một tài khoản hợp lệ, UI chọn sẵn để Admin kiểm tra; nhiều lựa chọn thì không tự quyết định. Email khôi phục luôn do Admin nhập.
- Modal có hai bước: chọn cặp/email, sau đó xem toàn bộ tài khoản giữ/ngừng và tên đăng nhập mới trước khi nhập mật khẩu Admin, xác nhận tác động. Backend vẫn kiểm tra quyền Admin, mật khẩu, vai trò/phạm vi tài khoản, phiên bản kiểm kê, cặp hiện hành và tính idempotent. Không tự mở khóa tài khoản đang khóa.
- API `POST /api/auth/branch/stores/{storeId}/migration` nhận `managerId`, `staffId`, `recoveryEmail`, `inventoryVersion`, `currentPassword`. Không còn yêu cầu `backupReference` hoặc biến môi trường mở khóa chuyển đổi. `migrationEnabled` từ API kiểm kê phản ánh điều kiện dữ liệu: chưa có cặp hiện hành, không có tài khoản current và có đủ hai vai trò.
- Backup là bước vận hành: sao lưu database Identity và Catalog trước khi chuyển đổi, lưu bằng chứng ngoài UI và kiểm tra khả năng phục hồi. Nếu chưa có backup dùng được thì dừng; ứng dụng không tạo, xác minh hoặc tự restore backup. Khôi phục phải được người vận hành đánh giá để không ghi đè giao dịch mới.
- Flyway V9 chỉ bỏ NOT NULL của cột tham chiếu backup cũ; giữ nguyên giá trị lịch sử và báo cáo đã có. Báo cáo trước/sau nằm trong tab Nhật ký tài khoản, kể cả sau khi tab chuyển đổi đã ẩn.
- Khi dữ liệu đã đổi kể từ lúc xem trước, backend từ chối; Admin phải kiểm kê và xác nhận lại. Lỗi/timeout sau yêu cầu đóng chi nhánh có thể để chi nhánh ở trạng thái đóng dù giao dịch Identity chưa hoàn tất: kiểm tra trạng thái và báo cáo trước khi thao tác tiếp, không tự mở lại hay restore.
- Thay đổi này không tự chạy chuyển đổi tài khoản thực tế. Kiểm thử chức năng do người dùng thực hiện; không coi build/healthcheck là nghiệm thu.

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
