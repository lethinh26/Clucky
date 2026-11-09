# A2 — Recovery, đổi email và thu hồi phiên

Mốc: D2A. Nguồn: plan §5.2. Phụ thuộc: A1, Notification và session revocation. Áp dụng [quy tắc chung](README.md). Trạng thái: đặc tả, chưa triển khai.

## Problem Statement

Hai tài khoản dùng chung email recovery dễ dùng nhầm OTP; cho client chọn email đích hoặc chỉ logout máy hiện tại khiến reset không an toàn.

## Solution

Identity quyết định nơi nhận OTP, ràng buộc challenge với tài khoản và mục đích, thu hồi mọi session tài khoản đích. Manager kiểm soát recovery chi nhánh; mất email cũ đi đường Admin có xác thực lại/audit.

## User Stories

1. Là Manager, tôi muốn khôi phục đúng Manager hoặc Staff mà không reset nhầm tài khoản còn lại.
2. Là Manager, tôi muốn thay email recovery sau khi xác thực email cũ và mới.
3. Là Manager mất email cũ, tôi muốn Admin hỗ trợ bằng quy trình được audit.
4. Là Admin, tôi muốn tự khôi phục qua email đã lưu, không một email do người ngoài nhập.
5. Là Admin hỗ trợ quán, tôi muốn OTP gửi email Admin và xác định rõ target/store trước reset.
6. Là người dùng, tôi muốn các phiên cũ không còn thao tác sau đổi password/khóa tài khoản.
7. Là Staff, tôi muốn dùng form recovery nhưng không được tự thay nơi nhận OTP.

## Implementation Decisions

- Forgot-password chọn login/target; Identity resolve email đã xác minh, không nhận destination tùy ý. Response chung không tiết lộ account tồn tại, bị khóa hoặc recovery email đầy đủ.
- Challenge ràng buộc `target account + purpose + challenge`; OTP lưu dạng bảo vệ, có hết hạn, một lần, giới hạn gửi/thử và chống thử trên nhiều challenge. Không dùng OTP Staff để reset Manager cùng mailbox hoặc OTP đổi email để reset password.
- Reset commit password và tăng/revoke session state theo cơ chế hiện hữu, bao phủ access/refresh trên mọi thiết bị; chỉ tài khoản đích bị reset. Không chỉ xóa cookie ở browser hiện tại.
- Manager đổi recovery: xác thực lại, OTP email hiện tại và email mới. Chỉ thay email hiệu lực sau đủ xác minh; bỏ dở/lỗi giữ email cũ. Staff không có quyền đổi recovery.
- Admin self-recovery dùng email Admin lưu sẵn. Admin hỗ trợ quán cần phiên Admin hợp lệ + xác thực lại + OTP email Admin, bind target/store/purpose; recovery email mới vẫn phải xác minh. Không qua đường này để tạo/promote ADMIN.
- Chống race hai request dùng cùng OTP: chỉ một được tiêu thụ/commit; email lỗi giữ challenge/lifecycle nhất quán, không log OTP.

### Contract đề xuất

Các operation: request challenge, verify/reset password, start/confirm recovery email change, Admin assisted reset. Input challengeId + OTP + target-bound dữ liệu cần thiết; server không tin target/email đã bị thay so với challenge. Output trạng thái chung hoặc completion, không password/token cũ/email nhạy cảm. TTL/rate limits/password policy dùng cấu hình an toàn được ghi rõ khi triển khai.

## Acceptance Criteria

- AC1: OTP Staff không reset Manager dù cùng mailbox; sai purpose/target, hết hạn, replay đều bị từ chối.
- AC2: Thay destination trong request forgot-password không thay nơi gửi; account không tồn tại có response không phân biệt.
- AC3: Đổi recovery thiếu xác minh email cũ/mới không commit; Staff không đổi được.
- AC4: Admin self-reset chỉ gửi email đã lưu; hỗ trợ quán thiếu xác thực lại/OTP Admin không thực hiện được.
- AC5: Reset Staff thu hồi mọi phiên Staff, không reset Manager; reset/lock không để refresh/access cũ tiếp tục mutation.
- AC6: Hai request dùng một OTP chỉ một commit; gửi/thử quá giới hạn bị hạn chế và không lộ bí mật qua log.

## Testing Decisions

Chưa chạy. Boundary Auth HTTP + phiên trên hai client + email event không chứa password; thời gian challenge kiểm soát tại test thay vì chờ thật. Tham khảo OtpServiceTest, SessionRevocationServiceTest, AuthServiceTest, JwtIssuerTest. Người dùng kiểm chứng nhận email khi yêu cầu nghiệm thu.

## Out of Scope

Recovery bằng email tùy nhập, PIN nhân viên, thêm MFA/provider mới hoặc chia sẻ OTP không gắn target.

## Further Notes

Gmail Mail Sender dùng App Password môi trường/Config Server của hệ thống, không credential Gmail của khách, không lưu PostgreSQL/log.
