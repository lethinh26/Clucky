# [INT-74] Google login E2E: tài khoản cũ/mới, complete-password, token lỗi và email trùng

## Cập nhật tích hợp local — 05/11/2026, chưa nghiệm thu E2E

- UI Google hiện gọi endpoint thật qua Gateway, chỉ hiện đặt mật khẩu khi REQUIRES_PASSWORD; thông báo rõ email/Google dùng chung account. Đồng bộ password policy backend, retry pending sau 401/409/5xx/network; không gửi Bearer cũ lên endpoint auth công khai.
- Backend trả access token + refresh cookie hiện có; test UI không còn giả refresh token trong JSON. Bổ sung regression account cũ, complete, mật khẩu yếu và conflict/restart.
- Người dùng đã điền ba biến Next.js. Firebase backend credential/project/provider/authorized domains và môi trường local/VPS cần người dùng cấu hình theo [runbook](../docs/Google_Auth_Runbook.md).
- Chưa chạy test/lint/typecheck/build, browser/Firebase E2E hoặc hạ tầng; chưa có evidence PASS, không đánh DONE.

> Detail viết lại theo mẫu đã duyệt ngày 05/11/2026 tại repository; chưa đồng bộ bản này lên Lark. Metadata bên dưới giữ nguyên lịch sử, không xác nhận tiến độ mới.

## Thông tin quản lý

| Thuộc tính | Giá trị giữ nguyên |
|---|---|
| PIC | Lê Phú Thịnh |
| Trạng thái snapshot — không xác nhận lại | TO DO |
| Sprint kế hoạch | SPRINT 2 |
| Bắt đầu → deadline (UTC+7) | 03/11/2026 08:00 → 04/11/2026 23:59 |
| SP / giờ công dự kiến | 8 SP / 10 giờ công |

Nhóm sprint hiện tại trên Lark (nếu khác kế hoạch) và toàn bộ metadata được giữ trong mục cuối. Không tự đổi PIC, lịch, estimate hoặc trạng thái vì viết lại tiêu chí.

## 1. Mục tiêu nghiệp vụ

Google login Customer chạy với Firebase/Identity thật cho user cũ/mới và xử lý lỗi không tạo phiên sai.

## 2. Phạm vi

### Bao gồm

- Popup→ID token→JWT hoặc complete-password→JWT, login email/password sau complete.
- Google popup → ID token → backend JWT; user mới complete password, user cũ link an toàn.
- Gộp TEST-29: email trùng 409, uid unique, pendingToken hết hạn, đăng nhập email/password sau complete.

### Không bao gồm

Không Google login Admin/Staff, không chỉ mock Firebase để đánh E2E thật đạt.

### Bắt đầu từ đâu? Đối chiếu source ngày 05/11/2026

lib/google-auth.ts dùng Firebase popup, inMemoryPersistence và signOut sau lấy ID token; backend authApi có google/complete routes nhưng route allowlist không chứng minh handler BE-75/76 hoàn tất. Scope Google là Customer.

- [frontend/nextjs/lib/google-auth.ts](../../frontend/nextjs/lib/google-auth.ts)
- [frontend/nextjs/components/auth/google-auth-flow.tsx](../../frontend/nextjs/components/auth/google-auth-flow.tsx)
- [frontend/nextjs/lib/api.ts](../../frontend/nextjs/lib/api.ts)
- [architechture/tasks/BE-75.md](../../architechture/tasks/BE-75.md)
- [architechture/tasks/BE-76.md](../../architechture/tasks/BE-76.md)

Đây là đối chiếu tĩnh, không phải kết quả chạy. Nếu đầu ra producer còn thiếu, ghi blocker và owner; không tự dựng success/mock để nghiệm thu tích hợp.

## 3. Đầu vào, đầu ra và contract

| Thành phần | Chi tiết cần bàn giao |
|---|---|
| Đầu vào / nguồn tin cậy | BE-76, UI-49, Firebase project/provider cấu hình hợp lệ và test account được cấp. |
| Đầu ra / contract | Popup→ID token→JWT hoặc complete-password→JWT, login email/password sau complete. |
| Điểm giao tiếp / deliverable đã cam kết | Google login E2E: tài khoản cũ/mới, complete-password, token lỗi và email trùng |

Các route/DTO/event là yêu cầu bàn giao, không khẳng định endpoint đã hoạt động. Nếu chi tiết trường/trạng thái còn thiếu trong nguồn, PIC phải chốt với owner trước khi hai phía tích hợp; không tự biến ví dụ thành quy tắc.

### Mapping phải ghi trước khi nối luồng

Firebase ID token → backend verify project/audience/expiry/verified identity → existing/link JWT hoặc REQUIRES_PASSWORD pendingToken → complete một lần. Pending token không phải session/access token; role/store từ backend, không lấy email UI làm bằng chứng identity.

## 4. Thứ tự thực hiện cụ thể

1. Nhận OAuth/Firebase project/origins test và backend contract từ owner, dùng env public config đúng loại; service-account secret không vào FE/repo.
2. Chuẩn bị Customer existing/new/email collision và nhân sự cùng email theo policy linking; không tạo tài khoản thật ngoài sự đồng ý.
3. Nối popup cancel/error và gửi ID token qua Gateway, không tạo backend session nếu popup thành công nhưng verify thất bại.
4. Theo existing/new branch, form complete-password validate theo contract và pending token expiry/reuse; không lưu token vào log/evidence.
5. Sau complete/login nối JWT/HttpOnly refresh cookie/reload/logout như auth thường; pending token không cho gọi protected APIs.
6. Bàn giao concurrency same email/uid, wrong project/expired token, linking forbidden và popup cancel; thiếu handler/origin ghi blocked không dùng token demo.

## 5. Quy tắc và điểm cần chốt

**Điểm cần PIC/owner xác nhận:** Chốt link account và môi trường OAuth origins; credential/service account không nằm trong fixture Git.

**Ràng buộc chung áp dụng khi có phần tương ứng:** Giữ ranh giới service/schema và kiểm tra quyền ở backend; API frontend đi qua Gateway. Mã lỗi mới phải vào danh mục chung rồi sinh lại, không sửa file generated. Nếu thay UI, thêm đủ locale vi/en, không dịch dữ liệu người dùng.

Phương án được ghi là “cần chốt/đề xuất” chưa phải quyết định sản phẩm. AC liên quan chỉ được kết luận sau khi lưu quyết định và cập nhật contract; không đánh PASS bằng giả định.

### Quyết định có owner và phần bị chặn

PIC Identity/Firebase/UI chốt account linking và conflict outcome; không tự link Google vào Staff/Admin hoặc bypass complete-password vì email đã verified.

## 6. Dependency và bàn giao

### Tiên quyết đã có trong backlog

| Task tiên quyết đã khai báo | PIC bàn giao | Cần nhận cụ thể | Mốc sử dụng |
|---|---|---|---|
| [BE-76](BE-76.md) | Lê Phú Thịnh | POST auth/google và google/complete, user link/create an toàn, JWT hoặc REQUIRES_PASSWORD. | Chốt DTO/state/error trước; API/event thật phải sẵn sàng trước nghiệm thu tích hợp. |
| [UI-49](UI-49.md) | Lê Phú Thịnh | GoogleButton và CompletePassword UI cho Customer login/register. | Trước nối hành vi màn hình; fixture chỉ xác nhận UI, không thay API thật. |

### Có thể bắt đầu đến đâu?

- Chuẩn bị input/fixture, đối chiếu phạm vi và chốt contract ở mục 3–5 mà không chờ mọi API hoàn tất. Chỉ code theo fixture khi contract liên quan đã thống nhất.
- Phần sử dụng đầu ra của dependency chỉ được nghiệm thu sau khi owner bàn giao bản thật và chạy được tình huống liên quan; deadline cùng ngày không chứng minh đầu ra đã sẵn sàng.
- Phối hợp bổ sung nêu ở mục 5 là việc cần xác nhận, **không tự thêm dependency hoặc đổi lịch** trong snapshot này. Một PIC chịu trách nhiệm task; owner domain khác giữ trách nhiệm producer/consumer của mình.

**Task nhận đầu ra theo dependency đã khai báo:** Chưa có task khai báo phụ thuộc trong snapshot.

## 7. Tiêu chí nghiệm thu cụ thể

| AC | Fixture / thao tác | Kết quả mong đợi |
|---|---|---|
| AC-01 | Customer existing và new lần lượt login/complete rồi reload/refresh/logout | Đúng nhánh contract, session thật sau bước hợp lệ, account chỉ tạo một lần |
| AC-02 | Popup cancel/token sai | Không có backend session giả |
| AC-03 | PendingToken expiry/reuse | Không tạo user lần hai |
| AC-04 | Email trùng/concurrent | 409 hoặc outcome theo contract, không duplicate uid/email |
| AC-05 | Popup cancel, token sai project/hết hạn hoặc pending token reuse | Không session giả/user trùng; error an toàn, pending không có quyền API |
| AC-06 | Hai complete đồng thời cùng email/uid hoặc email thuộc nhân sự | Outcome theo uniqueness/linking policy, không nâng quyền hoặc duplicate account |

Các AC là kế hoạch để người phụ trách/người dùng thực hiện sau, **chưa chạy trong lần viết detail**. Ghi PASS/FAIL/BLOCKED theo evidence thật; fixture chỉ chứng minh phần đã dùng fixture, không thay thế E2E. Không phát sinh chuyển tiền, email tới khách thật hoặc phá dữ liệu để làm bằng chứng.

## 8. Checklist và bằng chứng bàn giao

- [ ] Chốt các quyết định ở mục 5 với owner liên quan, ghi lựa chọn và phiên bản contract.
- [ ] Bàn giao bằng chứng cụ thể: Old/new/link/error/expiry matrix, user uniqueness và phiên backend đã mask.
- [ ] Ghi commit/môi trường/dữ liệu kiểm chứng đã ẩn secret, kết quả đạt/chưa đạt và lỗi còn mở với một PIC; không dùng file mẫu hoặc ảnh mock thay bằng chứng runtime.

- Gộp yêu cầu TEST-15: kiểm chứng critical path phù hợp domain; bug thực tế có một PIC, không tạo task chung cho cả nhóm.

- [ ] Ghi kết quả riêng AC-01 đến AC-06, phiên bản code/contract, fixture, actor/store, bước tái hiện và actual/expected; case chưa chạy không đánh PASS.
- [ ] Bàn giao branch/identity/session matrix và origin configuration names, redacted traces; không chứa ID token/pending token/service-account key.
- [ ] Không đổi status/PIC/lịch/estimate/dependency vì detail đã viết xong. TEST-15 đã gộp: PIC của task này chịu kiểm chứng critical path liên quan, không giao sang một task TEST-15 độc lập.
- [ ] Không chạy test/lint/typecheck/build/browser, Docker/backend/SMTP trong lần cập nhật tài liệu; người dùng tự kiểm thử theo yêu cầu.

## 9. Truy vết gộp task

TEST-29: Google auth: register email trùng tài khoản Google → 409; `firebase_uid` unique; `pendingToken` hết hạn; login bằng cả email+password sau complete

Không mở lại các ID đã gộp; phần việc gộp phải được kiểm chứng cùng task đích.

## 10. Tài liệu và source cần đọc

- [frontend/nextjs/lib/google-auth.ts](../../frontend/nextjs/lib/google-auth.ts)
- [frontend/nextjs/components/auth/google-auth-flow.tsx](../../frontend/nextjs/components/auth/google-auth-flow.tsx)
- [frontend/nextjs/lib/api.ts](../../frontend/nextjs/lib/api.ts)
- [architechture/tasks/BE-75.md](../../architechture/tasks/BE-75.md)
- [architechture/tasks/BE-76.md](../../architechture/tasks/BE-76.md)
- [API](../docs/Đặc%20tả%20API.md), [SRS](../docs/SRS.md), [RBAC](../docs/Ma%20trận%20phân%20quyền.md), [Kiến trúc](../docs/Kiến%20trúc%20hệ%20thống.md), [Backlog](../docs/backlog.md), [Danh mục lỗi](../../contracts/README.md).

## 11. Metadata và lịch sử kế hoạch

<details>
<summary>Xem nguyên trạng metadata, ước lượng và lịch từ bản trước</summary>

**PIC:** Lê Phú Thịnh
**Trạng thái trên Lark:** TO DO
**Sprint:** SPRINT 2
**Khoảng sprint:** 02/11/2026–08/11/2026 (khung lưu lịch sử; hoàn tất 05/11, Sprint Review 06/11)
**Bắt đầu:** 03/11/2026 08:00
**Deadline:** 04/11/2026 23:59
**Múi giờ:** Asia/Ho_Chi_Minh (UTC+7)
**Loại:** Sub Task
**Mã Lark:** Mail-4654 / reczz28SgdBIGAvC
**Record:** https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&record=reczz28SgdBIGAvC
**Cập nhật:** 30/10/2026 — kế hoạch hai sprint đã được duyệt

**Story Point:** 8 SP
**Time Estimated:** 10 giờ công
**Remaining Estimate:** 10 giờ công — tạm bằng estimate vì chưa có tiến độ mới; không phải số giờ còn lại đã xác minh.
**Cơ sở ước lượng:** Sơ bộ theo snapshot 30/10; PIC cần xác nhận, không suy ra tiến độ hiện tại.
**Cập nhật ước lượng/lịch:** 01/11/2026 — đã đồng bộ ước lượng/lịch lên Lark; giữ trạng thái, PIC và nhóm sprint hiện tại.

## Ước lượng và lịch thực hiện

Đã gồm TEST-29: account cũ/mới, uid/email trùng, pendingToken hết hạn và login bằng password sau complete.

Không quy đổi SP ra giờ; giờ công không gồm chờ dependency. Ước lượng gồm tự kiểm chứng/sửa lỗi trong phạm vi, không cộng thêm buffer phần trăm hoặc phần việc BE/INT/TEST đã tính riêng. Xem [quy ước và tải tổng hợp](../../docs/backlog.md#quy-ước-ước-lượng).

Lịch cũ (30/10): 04/11/2026 08:00 → 06/11/2026 23:59. Lịch mới: 03/11/2026 08:00 → 04/11/2026 23:59. Giữ khung Sprint 2 02–08/11 để truy vết; hạn hoàn thành thực tế 05/11, Sprint Review 06/11, không xếp việc triển khai/nghiệm thu vào 06–08/11.

Bắt đầu có thể là chuẩn bị fixture/UI theo contract; phần cần API/event thật bị chặn cho đến khi dependency bàn giao. Nếu cùng ngày đến hạn, phải bàn giao prerequisite trước khi nghiệm thu task này; không coi deadline trùng ngày là bằng chứng đã sẵn sàng.

</details>

## Quy ước kiểm chứng

Việc cập nhật detail không chạy test, lint, typecheck, build, Docker hoặc trình duyệt. Checklist là điều kiện nghiệm thu để người phụ trách thực hiện, không phải báo cáo PASS. Giữ trạng thái snapshot, kể cả DONE; chưa xác nhận lại trên Lark.
