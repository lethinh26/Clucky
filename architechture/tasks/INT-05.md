# [INT-05] Auth E2E: register → OTP → login → refresh, 2 app

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Trần Nguyễn Hữu Khánh |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 04/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công dự kiến | 8 SP / 10 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Customer đăng ký/OTP/login/refresh hoạt động xuyên UI→Gateway→Identity→Notification; nhân sự đăng nhập tài khoản được cấp.

## 2. Phạm vi

### Bao gồm

- Luồng auth hai app với JWT/refresh thật, register/OTP chỉ Customer.
- Bàn giao theo phạm vi gốc: Auth flow works.

### Không bao gồm

Không Google flow INT-74 hoặc public register Admin.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

Auth pages hai app và authApi đã có request thật; React AuthContext vẫn dùng mock role/default ADMIN. Next verify-otp có resend gọi register với trường rỗng cần đối chiếu Identity. Bắt đầu bằng kiểm kê request/session hiện có, không tạo form login mới.

- [frontend/nextjs/lib/api.ts](../../frontend/nextjs/lib/api.ts)
- [frontend/nextjs/app/verify-otp/page.tsx](../../frontend/nextjs/app/verify-otp/page.tsx)
- [frontend/react/src/context/AuthContext.tsx](../../frontend/react/src/context/AuthContext.tsx)
- [backend/identity-service](../../backend/identity-service)
- [architechture/tasks/BE-16.md](../../architechture/tasks/BE-16.md)
- [architechture/tasks/BE-17.md](../../architechture/tasks/BE-17.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | API BE-16/17, Gateway security INT-53, auth UX INT-69 và sender đã cấu hình. |
| Đầu ra / contract | Luồng auth hai app với JWT/refresh thật, register/OTP chỉ Customer. |
| Điểm giao tiếp / deliverable đã cam kết | Auth flow works |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Lập bảng register/verify/login/refresh/logout/forgot/reset → payload → response/error → UI state. Role/storeId phải từ phiên thật; refresh token nằm trong cookie HttpOnly, không đưa vào localStorage. Ghi rõ ai cấp recipient thử nghiệm và evidence nào chứng minh SMTP accepted so với email thực nhận.

## 4. Thứ tự thực hiện cụ thể

1. Đối chiếu AuthController/DTO và hai adapter; liệt kê endpoint thiếu hoặc lệch, giao lại owner BE trước khi nối UI.
2. Chuẩn bị Customer chưa verify, Customer đã verify và từng role nhân sự đúng quán; chỉ dùng tài khoản/mailbox được phép, không public signup nhân viên.
3. Nối register → OTP → verify, xử lý expiry/reuse/resend theo hợp đồng; không dùng timer hoặc register rỗng để báo đã gửi OTP.
4. Nối login/refresh/reload và guard bằng session thật, bỏ đường fallback default ADMIN trong luồng thật; CUSTOMER vào Admin phải bị từ chối.
5. Nối logout/revocation và lỗi refresh: dừng retry lặp, xóa state nhạy cảm đúng phạm vi, giữ URL trở lại an toàn; không lưu password/OTP để retry.
6. Soạn kịch bản SMTP lỗi, cookie/CORS lỗi và token hết hạn; người dùng kiểm chứng qua Gateway, gắn trace đã che secret vào runbook auth gộp từ DEP-13.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt cách cung cấp test recipient và cleanup account; không ghi token/OTP thật vào evidence.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Auth cùng Identity/Gateway chốt resend, cookie domain/SameSite, hành vi refresh đồng thời và redirect theo role. Chưa có sender/recipient thì ghi blocked bước email; vẫn hoàn thiện mapping/session UI, không chứng nhận OTP E2E bằng mock.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-16](BE-16.md) | Trần Nguyễn Hữu Khánh | POST register/verify-otp, tài khoản CUSTOMER và OTP chỉ dùng một lần; trạng thái gửi mail theo contract. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [BE-17](BE-17.md) | Trần Nguyễn Hữu Khánh | API login/refresh/logout/forgot-password/reset-password và JWT có role/storeId theo actor. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [INT-53](INT-53.md) | Trần Nguyễn Hữu Khánh | Security integration login→Gateway→service, auth/authorization error contract nhất quán. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |
| [INT-69](INT-69.md) | Trần Nguyễn Hữu Khánh | Sending/sent/failure UX cho OTP, retry và giữ form. | Trước kiểm chứng xuyên hệ thống; cần luồng thật và dữ liệu/evidence bàn giao. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** [TEST-01](TEST-01.md), [TEST-17](TEST-17.md), [TEST-22](TEST-22.md)

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Customer register → nhận/verify OTP → login → reload/refresh → logout, sau đó gọi lại API bằng phiên cũ | Trước logout phiên đúng người; sau logout phiên đã thu hồi không còn truy cập được theo contract; mỗi bước có network và server evidence |
| AC-02 | OTP hết hạn/reuse | Không tạo session |
| AC-03 | Refresh bị thu hồi | UI về trạng thái xác thực phù hợp |
| AC-04 | SMTP lỗi | UI không báo email đã gửi thành công giả |
| AC-05 | Role CUSTOMER đăng nhập app Admin và STAFF quán A mở dữ liệu quán B | Không rơi về ADMIN mặc định, không lộ dữ liệu khác scope; backend chặn độc lập với guard |
| AC-06 | Hai request gặp access token hết hạn cùng lúc; refresh lỗi | Không có vòng lặp refresh, không success giả; UI về trạng thái auth được chốt |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Network/API trace, email log và role/refresh/reload evidence đã mask.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao bảng auth transport, runbook DEP-13, trace cookie đã mask và lỗi theo owner Identity/Gateway/UI; không đính kèm token hay OTP thật.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

DEP-13: Auth smoke test + identity runbook

Không mở lại các ID đã gộp; phần việc gộp phải được kiểm chứng cùng task đích.

## 10. Tài liệu và source cần đọc

- [frontend/nextjs/lib/api.ts](../../frontend/nextjs/lib/api.ts)
- [frontend/nextjs/app/verify-otp/page.tsx](../../frontend/nextjs/app/verify-otp/page.tsx)
- [frontend/react/src/context/AuthContext.tsx](../../frontend/react/src/context/AuthContext.tsx)
- [backend/identity-service](../../backend/identity-service)
- [architechture/tasks/BE-16.md](../../architechture/tasks/BE-16.md)
- [architechture/tasks/BE-17.md](../../architechture/tasks/BE-17.md)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Trần Nguyễn Hữu Khánh
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 04/11/2026 08:00
**Deadline:** 04/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4525 / reczz28Rid5XizME
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28Rid5XizME
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 8 SP
**Time Estimated:** 10 giờ công
**Remaining Estimate:** 10 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Tính phần nối contract, xử lý lỗi liên service/UI, fixture và evidence tích hợp; không triển khai lại API đã tính ở BE hoặc chạy lại bộ regression TEST.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../docs/backlog.md#quy-ước-ước-lượng).

Lịch cũ (30/10): 06/11/2026 08:00 → 06/11/2026 23:59. Lịch mới: 04/11/2026 08:00 → 04/11/2026 23:59. Giữ khung Sprint 2 02–08/11 để truy vết; hạn hoàn thành thực tế 05/11, Sprint Review 06/11, không xếp việc triển khai/nghiệm thu vào 06–08/11.

Bắt đầu có thể là chuẩn bị fixture/UI theo contract; phần cần API/event thật bị chặn cho đến khi dependency bàn giao. Nếu cùng ngày đến hạn, phải bàn giao prerequisite trước khi nghiệm thu task này; không coi deadline trùng ngày là bằng chứng đã sẵn sàng.

</details>

## Quy ước kiểm chứng

Việc cập nhật detail không chạy test, lint, typecheck, build, Docker hoặc trình duyệt. Checklist là điều kiện nghiệm thu để người phụ trách thực hiện, không phải báo cáo PASS. Giữ trạng thái snapshot, kể cả DONE; chưa xác nhận lại trên Lark.
