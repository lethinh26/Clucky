# Backlog Clucky

**Cập nhật kế hoạch và đối chiếu main: 01/11/2026 · Trạng thái nghiệm thu: giữ snapshot 30/10/2026 · Múi giờ: Asia/Ho_Chi_Minh (UTC+7)**

Tài liệu tổng hợp lịch, phân công, dependency, ước lượng và truy vết gộp của backlog. Kế hoạch rút hạn đã được người dùng duyệt: hoàn thành phạm vi sprint chậm nhất **thứ Năm 05/11/2026**, **thứ Sáu 06/11/2026 báo cáo Sprint Review**. **Đã đồng bộ và đọc lại đối chiếu trên Lark ngày 01/11/2026**: 184 task có SP/giờ công, 94 lịch được cập nhật, 184 detail mới được đính kèm và tải lại đối chiếu nội dung. Trạng thái khớp snapshot 30/10 (37 DONE), không tự sửa tiến độ; nhóm sprint hiện tại trên Lark được giữ nguyên. Không cần thư mục `verification` để đọc backlog.

[Mở backlog trên Lark](https://msgmclt9kdj2.sg.larksuite.com/base/ByTkbHQcYaPOMAsoU4jl41pdgSd?table=tblXgna1HdN3POFK&view=vewC0rB72n)

## Đối chiếu mã nguồn main ngày 01/11/2026

- Đã xác nhận nhánh `main`, fetch `origin` và chạy `git pull --ff-only`: `Already up to date`. `HEAD` và `origin/main` cùng ở `229c409` (merge PR #23 ngày 30/10/2026); không có commit mới trên `main` trong lần kéo này. Các chỉnh sửa local được giữ nguyên.
- Bảng dưới ghi nhận mã nguồn đã merge, không thay thế nghiệm thu hoặc kết quả CI. Giữ 184 task, 37 DONE, PIC, sprint, deadline và ước lượng; không tăng số task DONE chỉ vì có commit.

| Phạm vi backlog | Bằng chứng trên main | Ghi nhận và phần còn cần xác nhận |
|---|---|---|
| [UI-39 — Dockerfile hai frontend](../architechture/tasks/UI-39.md) | `3d3bc48`, merge `f8243c4` (PR #14); `frontend/nextjs/Dockerfile`, `frontend/react/Dockerfile` | Đã có Dockerfile hai ứng dụng; giữ DONE theo snapshot, không tuyên bố build lại. |
| [UI-41 — CI frontend](../architechture/tasks/UI-41.md) | `29ca57f`, merge `75bff2e` (PR #15); `.github/workflows/frontend-ci.yml` | Đã có workflow lint/unit test/build và Playwright trên PR vào main. Giữ DONE theo snapshot; lần này chưa xác minh kết quả GitHub Actions. |
| [UI-44 — Payment/Shipping components](../architechture/tasks/UI-44.md) | `b7e739e`, merge `229c409` (PR #23); `frontend/nextjs/components/payment/`, `frontend/nextjs/components/shipping/`, checkout và chi tiết đơn | Đã merge bản chỉnh UI QR/payment badge/fee/shipment card. Giữ DONE của UI; không suy ra payment, webhook hoặc shipping backend/E2E đã hoàn tất. |
| Triển khai frontend; liên quan [DEP-05](../architechture/tasks/DEP-05.md), [DEP-06](../architechture/tasks/DEP-06.md), [DEP-12](../architechture/tasks/DEP-12.md) | PR #17/#19/#20/#21; `c2ca966`, `f94b3a4`, `06be548`, `f90d350`, `4f88ee7`; `deploy/frontend/` | Đã có đóng gói/deploy main, health check container trong workflow, release manifest và rollback script. Chưa xác nhận deploy VPS thành công, health toàn stack, smoke nghiệp vụ hoặc bàn giao. Giữ trạng thái DEP hiện có. |

**Chưa có trên main:** remote `origin/feat-M2-BE-and-INT` đang ở `83bad08`, có commit `63d4d86` (`feat(catalog-store): implement M2 backend services and frontend integration`) chưa merge vào `main`. Chưa checkout/merge nhánh này và chưa nghiệm thu nội dung; không chuyển BE/INT Catalog & Store sang DONE từ tên commit. Backend của checkout `main` hiện vẫn là scaffold, không dùng tiến độ nhánh riêng để xác nhận API/E2E đã sẵn sàng trên main.

**Phạm vi cập nhật:** bổ sung đối chiếu Git vào tài liệu backlog trong repository. Chưa đồng bộ phần bổ sung này lên Lark; kết quả đồng bộ Lark ở cuối tài liệu thuộc lần trước. Không chạy test, lint, typecheck, build, Docker/backend hoặc kiểm thử trình duyệt; nhóm tự kiểm chứng và bổ sung evidence trước khi đổi trạng thái nghiệm thu.

## Quy ước và lịch sprint

- Mỗi task đúng **một PIC**; giữ ID, trạng thái, dependency, truy vết gộp và 37 task DONE. Không đổi PIC hoặc reset tiến độ.
- **Sprint 1: 26/10–01/11/2026**: giữ lịch đã ghi nhận; 28 task chưa DONE trong snapshot là rủi ro prerequisite, không tự coi đã hoàn tất.
- **Sprint 2: giữ khung 02–08/11/2026 để truy vết**, nhưng **hạn hoàn thành là thứ Năm 05/11/2026 23:59**, **Sprint Review thứ Sáu 06/11/2026** (chưa ấn định giờ họp).
- Deadline của task là 23:59 giờ Việt Nam ngày ghi trong bảng. Lịch bắt đầu chỉ là mục tiêu, không phải ghi nhận đã thực hiện.
- Không xếp triển khai, nghiệm thu, sửa lỗi hoặc chuẩn bị demo sang 06–08/11. Không có Sprint 3 mới.
- 25 task backlog vẫn chưa gán sprint/ngày bắt đầu/deadline; không mặc định toàn dự án/Phase 2 hoàn tất ngày 05/11.
- Theo yêu cầu, **không thu thập giờ làm khả dụng và không tính capacity/velocity giả định**. Lịch là mục tiêu bắt buộc, không phải chứng nhận đủ nguồn lực.

## Quy ước ước lượng

- **Story Point (SP)** dùng thang 1, 2, 3, 5, 8, 13; phản ánh khối lượng tương đối, độ phức tạp và mức chưa rõ. Không đổi cứng SP thành giờ, không dùng SP xếp hạng năng suất cá nhân.
- Mốc so sánh đề xuất: BE-13 = 1 SP (cấu hình hẹp); BE-50 = 2 SP (DTO/enum); BE-38 = 3 SP (API notification đơn giản); BE-23 = 5 SP (cart/session); BE-30 = 8 SP (webhook/security/replay); BE-25 = 13 SP (checkout nhiều service). Đây là mốc để PIC hiệu chỉnh, không phải velocity đã đo.
- **Time Estimated (h)** là giờ công cho toàn bộ phạm vi sau gộp: triển khai, tự kiểm chứng, sửa lỗi cục bộ và tài liệu cần thiết; không phải Deadline trừ Bắt đầu, không gồm thời gian chờ dependency.
- **Remaining (h)***: DONE = 0; task còn lại tạm bằng Time Estimated vì snapshot chỉ có TO DO, chưa có số giờ đã làm. Đây là giả định lập kế hoạch, **không xác nhận khối lượng còn lại thực tế**; PIC cập nhật khi có tiến độ mới mà không sửa ngược estimate gốc.
- SP/giờ của 37 DONE là **ước lượng hồi cứu**, chỉ để tham chiếu; không phải actual time hay velocity lịch sử. Các ước lượng còn lại là đề xuất sơ bộ cần PIC xác nhận; không giảm để ép khớp deadline.
- Task 13 SP cần checklist bàn giao nhỏ và đánh dấu rủi ro; chưa tạo ID mới hay thay đổi phạm vi. Backlog chỉ được sizing, chưa cam kết thực hiện.
- Chỉ tính một lần phần gộp: BE chịu implementation và kiểm chứng cục bộ; INT chịu nối luồng/contract và kiểm chứng tích hợp; TEST chịu vòng nghiệm thu độc lập. Task INT đã hấp thụ TEST giữ luôn công đó, không tính lại ID cũ.
- Không cộng buffer phần trăm. Sửa lỗi trong phạm vi đã nằm trong estimate; lỗi mới chưa rõ chưa có giờ công ước đoán, ghi riêng một PIC khi phát sinh. Ngày 05/11 là mốc chốt, không phải một gói giờ cộng thêm.

## Tổng quan

| Phân bổ | Số task | DONE | Còn lại |
|---|---:|---:|---:|
| Sprint 1 | 65 | 37 | 28 |
| Sprint 2 | 94 | 0 | 94 |
| Backlog chưa gán sprint | 25 | 0 | 25 |
| **Tổng** | **184** | **37** | **147** |

Từ 232 record ban đầu, đã gộp/bỏ 48 record trùng hoặc giao chung. Cả 184 task hiện hành được bổ sung SP/giờ công trong bản cục bộ; 48 ID cũ không được tính lại. Giảm số record sau gộp không đồng nghĩa giảm khối lượng thực hiện.

### Tổng ước lượng theo phạm vi

| Phạm vi | SP tổng | SP DONE (hồi cứu) | SP chưa DONE | Time Estimated (h) | Remaining (h)* |
|---|---:|---:|---:|---:|---:|
| Sprint 1 (gồm hồi cứu DONE) | 219 | 124 | 95 | 354 | 153 |
| Sprint 2 | 522 | 0 | 522 | 738 | 738 |
| Backlog chưa cam kết | 119 | 0 | 119 | 170 | 170 |
| **Tổng** | **860** | **124** | **736** | **1262** | **1061** |

Phạm vi hiện tại cần xử lý trước 05/11 gồm 28 task Sprint 1 chưa DONE và 94 task Sprint 2: **891 giờ còn lại tạm tính**; không gồm backlog. Đây không phải giờ đã xác minh hoặc lịch khả thi đã được chứng nhận.

## Phạm vi và tải công việc

| Người | SP S1 chưa DONE | Remaining S1 (h)* | SP S2 | Remaining S2 (h)* | SP backlog | Estimate backlog (h) |
|---|---:|---:|---:|---:|---:|---:|
| Trần Nguyễn Hữu Khánh | 19 | 32 | 69 | 100 | 5 | 8 |
| Nguyễn Duy Quang Nhật | 12 | 21 | 80 | 117 | 8 | 12 |
| Trần Đức Anh | 8 | 14 | 73 | 104 | 8 | 12 |
| Lê Phú Thịnh | 14 | 22 | 132 | 185 | 16 | 28 |
| Cao Tất Thành | 30 | 47 | 81 | 117 | 22 | 32 |
| Mai Sơn Việt | 12 | 17 | 87 | 115 | 60 | 78 |

Các số trên chỉ giúp nhìn phân bổ khối lượng, không chấm năng suất. Không có capacity nên không kết luận ai quá tải theo giờ/ngày. *Remaining dùng giả định snapshot ở phần quy ước.

## Mục tiêu và trình tự

| Mốc | Đầu ra cần bàn giao |
|---|---|
| 01/11 — giữ Sprint 1 | Xác nhận UI, entity, security/response, Kafka/Redis và contract nền; task chưa DONE được nêu blocker, không tự đổi trạng thái. |
| 02/11 | Ưu tiên contract, API nền, SMTP/OTP, giá/phí/voucher và media contract. Chuẩn bị fixture/UI theo contract song song, chưa nghiệm thu bằng mock. |
| 03/11 | Bàn giao checkout/payment/auth và các API producer chính; tích hợp nhận từng phần khi prerequisite thực sự sẵn sàng. |
| 04/11 | Chốt phần tích hợp checkout/SePay/COD/refund/email, report, media, Google login và RBAC; chuẩn bị collection/script/slides. |
| 05/11 — thứ Năm | Nhóm hoàn tất regression, sửa lỗi/retest, chốt evidence, collection và demo. Deadline cuối 23:59; task không đạt không đánh DONE. |
| 06/11 — thứ Sáu | Sprint Review: báo cáo kết quả có evidence và phần chưa đạt nếu có; không để việc triển khai/demo preparation sang ngày này. |

Bắt đầu trong bảng có thể là chuẩn bị theo contract/fixture, không có nghĩa API thật đã sẵn sàng. Phần implementation cần đầu ra prerequisite phải chờ bàn giao; nghiệm thu cần đủ dependency thật. Các task cùng hạn ngày 03–04/11 phải bàn giao theo thứ tự trong ngày, không coi deadline bằng nhau là bằng chứng không bị chặn.

### Rủi ro và điều kiện bàn giao

- **Nền Sprint 1 chưa xác nhận:** snapshot còn 28 task chưa DONE. Nếu chưa bàn giao trước nhánh Sprint 2 phụ thuộc, báo blocker ngay; không viết lại lịch cũ để che trễ hạn.
- **Auth:** BE-58 → BE-60, BE-61 → BE-64 → BE-16/17 → INT-53/69 → INT-05 → TEST-01. SMTP/template/token phải có evidence trước nghiệm thu auth.
- **Checkout/payment/refund:** BE-24 → BE-25 → BE-26 → BE-46 → INT-52 → INT-64; BE-30/32 → INT-40 và INT-39 → BE-39 cũng chặn refund/email. Nhiều handoff dồn ngày 03–04, rủi ro cao; không bỏ signature/idempotency/ownership.
- **Report:** INT-39/40 → INT-45 → BE-42 → INT-13 → TEST-05; không dùng dashboard mock để chốt báo cáo có dữ liệu thật.
- **Media/Google:** BE-70/72/74 và BE-76 có dependency ngoài ứng dụng; thiếu cấu hình hợp lệ phải báo blocker, không thay bằng kết quả giả.
- **Task lớn:** BE-21, BE-25, BE-42, BE-76 = 13 SP; cần bàn giao từng checklist. Giữ scope/PIC/ID; mọi đề xuất cắt phạm vi hoặc dời hạn cần người dùng quyết định.
- **Đường chốt demo:** TEST-01/05/06/07 → DEP-10 trong ngày 05/11. Chuẩn bị slides từ 04/11, chỉ chốt kết quả/screenshot sau evidence; thất bại nghiệm thu phải báo trung thực trong review.
- **Cảnh báo đỏ về khối lượng:** Sprint 2 có 738 giờ công sơ bộ. Nếu toàn bộ vẫn còn phải làm, số này vượt cả trần thời gian tuyệt đối 6 người × 4 ngày × 24 giờ = 576 giờ trong 02–05/11, chưa tính 153 giờ tồn Sprint 1. Đây chỉ là đối chiếu giới hạn lịch, không phải giả định làm 24 giờ/ngày hay mô hình capacity. Muốn giữ hạn 05/11, phải xác nhận phần thực tế đã hoàn thành và hiệu chỉnh sizing theo bằng chứng; nếu vẫn vượt, trình người dùng quyết định scope/nguồn lực. Không tự giảm estimate, bỏ việc hoặc tuyên bố lịch khả thi.

### Đối chiếu lịch cũ và mới

| Phần việc | Lịch cũ | Lịch mới |
|---|---|---|
| 37 DONE và 28 task còn lại Sprint 1 | 26/10–01/11 | Giữ nguyên trạng thái/PIC/ngày đã ghi; đánh dấu rủi ro chưa bàn giao |
| API và tích hợp Sprint 2 | Hoàn thành rải 02–06/11 | Mục tiêu bàn giao API 02–03, hoàn tất tích hợp 04/11; BE-75 rà bảo mật khi có luồng media |
| RBAC/regression, sửa lỗi, collection/demo | 07–08/11 | Kiểm chứng cuốn chiếu, hoàn tất và chốt demo 05/11 |
| Sprint Review | Chưa ghi riêng | 06/11, chưa ấn định giờ họp |
| 25 task backlog | Chưa xếp | Giữ chưa xếp; chỉ thêm sizing |

Lịch cũ/mới từng task Sprint 2 nằm trong task detail và [manifest điều chỉnh 01/11](../architechture/plans/BACKLOG-ESTIMATES-2026-11-01.json). [Manifest 30/10](../architechture/plans/BACKLOG-REPLAN-2026-10-30.json) giữ nguyên làm snapshot lịch sử, không phải lịch hiện hành.

## Phần chuyển làm sau

- Khánh: upload/thay avatar.
- Nhật: đo/tối ưu ngưỡng menu <500 ms; vẫn giữ cache/correctness.
- Đức Anh: backend đặt tiệc và UI trạng thái gửi email trên đơn.
- Thịnh: Casso và lịch sử giao hàng ngoài MVP; giữ SePay và shipment CREATED.
- Thành: proposal/approve voucher chi nhánh và quản trị banner, kèm event/tích hợp liên quan.
- Việt: load test 50 đơn đồng thời và màn quản trị email log/retry.
- 12 record vận hành: DEP-01…08, DEP-11/12/20/22 — VPS/HTTPS/backup/release/handover ở backlog.

## Database và nghiệm thu

BE-01…08 chỉ ánh xạ entity/repository và cấu hình schema hiện có. Không viết lại Flyway V1, không chỉnh migration đã áp dụng. BE-56 nhập BE-07; metadata ảnh BE-69 chuyển thành checklist đối chiếu; BE-76 vẫn giữ migration bổ sung Google login có căn cứ.

Không bỏ ownership/storeId, JWT/OTP security, signature/idempotency payment, consumer idempotency hoặc nguyên tắc lỗi email không rollback nghiệp vụ. Shipping MVP chỉ CREATED; Gmail SMTP sender secret từ environment/Config Server.

Không tự chạy test/lint/typecheck/build/Docker hoặc kiểm thử frontend khi cập nhật backlog. Nhóm tự kiểm chứng khi triển khai; bằng chứng nằm trong task.

## Danh sách task

Bấm mã task để mở file detail trong `architechture/tasks/`. Các file detail nằm ngoài thư mục `verification`. Cột dependency liệt kê task phải đáp ứng contract/đầu ra trước khi nghiệm thu task hiện tại.

### Sprint 1 — 26/10–01/11/2026

| ID | Task | PIC | Trạng thái | Bắt đầu | Deadline | Dependency | SP | Time Estimated (h) | Remaining (h)* |
|---|---|---|---|---|---|---|---:|---:|---:|
| [UI-01](../architechture/tasks/UI-01.md) | Next.js layout: header, footer, hero, brand tokens | Trần Nguyễn Hữu Khánh | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 6 | 0 |
| [UI-02](../architechture/tasks/UI-02.md) | React Admin layout: sidebar, header, protected route shell | Nguyễn Duy Quang Nhật | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 6 | 0 |
| [UI-03](../architechture/tasks/UI-03.md) | Config Server app + `config-repo` khung | Trần Nguyễn Hữu Khánh | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 2 | 3 | 0 |
| [UI-04](../architechture/tasks/UI-04.md) | Discovery Server app + Eureka client config mẫu | Nguyễn Duy Quang Nhật | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 1 | 2 | 0 |
| [UI-05](../architechture/tasks/UI-05.md) | API Gateway app + route khung lb:// | Trần Đức Anh | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 2 | 3 | 0 |
| [UI-06](../architechture/tasks/UI-06.md) | Docker Compose: postgres, redis, kafka, healthcheck | Mai Sơn Việt | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 5 | 6 | 0 |
| [UI-07](../architechture/tasks/UI-07.md) | Component lib Customer: Button, Card, Input, Badge, Modal | Trần Nguyễn Hữu Khánh | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 6 | 0 |
| [UI-08](../architechture/tasks/UI-08.md) | Component lib Admin: Table, Badge, Modal, Form, Drawer | Nguyễn Duy Quang Nhật | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 5 | 8 | 0 |
| [UI-09](../architechture/tasks/UI-09.md) | Auth pages cả 2 app: Login, Register, OTP, Forgot/Reset | Trần Nguyễn Hữu Khánh | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 5 | 10 | 0 |
| [UI-10](../architechture/tasks/UI-10.md) | Home page: banner, category row, món nổi bật | Nguyễn Duy Quang Nhật | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 4 | 0 |
| [UI-11](../architechture/tasks/UI-11.md) | Menu page: category sidebar, product grid, search/filter | Nguyễn Duy Quang Nhật | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 6 | 0 |
| [UI-12](../architechture/tasks/UI-12.md) | Product Detail: ảnh, options, toppings, quantity, giá động | Nguyễn Duy Quang Nhật | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 5 | 8 | 0 |
| [UI-13](../architechture/tasks/UI-13.md) | Store page customer: danh sách quán, giờ mở, trạng thái | Nguyễn Duy Quang Nhật | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 2 | 3 | 0 |
| [UI-14](../architechture/tasks/UI-14.md) | Admin Dashboard: stat cards, chart placeholder | Mai Sơn Việt | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 2 | 3 | 0 |
| [UI-15](../architechture/tasks/UI-15.md) | Admin Users: table, role badge, lock/unlock, assign-store | Trần Nguyễn Hữu Khánh | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 5 | 0 |
| [UI-16](../architechture/tasks/UI-16.md) | Admin Reviews: list, reply form, hide button | Mai Sơn Việt | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 3 | 4 | 0 |
| [UI-17](../architechture/tasks/UI-17.md) | Cart page: item list, stepper, ghi chú, tổng | Trần Đức Anh | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 5 | 0 |
| [UI-18](../architechture/tasks/UI-18.md) | Checkout page: address, delivery/pickup, voucher, điểm, payment method, summary | Trần Đức Anh | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 5 | 8 | 0 |
| [UI-19](../architechture/tasks/UI-19.md) | Order tracking: status timeline + QR VietQR block | Trần Đức Anh | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 5 | 0 |
| [UI-20](../architechture/tasks/UI-20.md) | Order history + reorder + chi tiết hóa đơn | Trần Đức Anh | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 6 | 0 |
| [UI-21](../architechture/tasks/UI-21.md) | Profile + Address book + đổi mật khẩu | Trần Nguyễn Hữu Khánh | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 5 | 8 | 0 |
| [UI-22](../architechture/tasks/UI-22.md) | Voucher & Loyalty: voucher khả dụng, điểm, hạng | Cao Tất Thành | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | — | 3 | 5 | 5 |
| [UI-23](../architechture/tasks/UI-23.md) | Party order form | Trần Đức Anh | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 2 | 3 | 0 |
| [UI-24](../architechture/tasks/UI-24.md) | Admin Orders: filter tabs, status action, refund modal, drawer | Trần Đức Anh | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 5 | 8 | 0 |
| [UI-25](../architechture/tasks/UI-25.md) | Admin Catalog: product form (ảnh, options, toppings) | Nguyễn Duy Quang Nhật | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 5 | 10 | 0 |
| [UI-26](../architechture/tasks/UI-26.md) | Admin Stores: list + CRUD + giờ mở/khu vực giao | Nguyễn Duy Quang Nhật | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 6 | 0 |
| [UI-27](../architechture/tasks/UI-27.md) | Admin Payments: transactions, webhook log, bank config, manual confirm | Lê Phú Thịnh | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 5 | 8 | 0 |
| [UI-28](../architechture/tasks/UI-28.md) | Admin Promotions: voucher form, duyệt proposal, banners | Cao Tất Thành | TO DO | 30/10/2026 08:00 | 31/10/2026 23:59 | — | 5 | 8 | 8 |
| [UI-29](../architechture/tasks/UI-29.md) | Admin Reports: date picker, store filter, export, chart | Mai Sơn Việt | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 6 | 0 |
| [UI-30](../architechture/tasks/UI-30.md) | Staff Orders: đơn hôm nay, status buttons, COD confirm | Trần Đức Anh | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 5 | 0 |
| [UI-31](../architechture/tasks/UI-31.md) | Staff Inventory: tồn kho, cảnh báo sắp hết, update | Nguyễn Duy Quang Nhật | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 3 | 4 | 0 |
| [UI-32](../architechture/tasks/UI-32.md) | Notification list cả 2 app: badge, mark-read, type icon | Cao Tất Thành | TO DO | 30/10/2026 08:00 | 31/10/2026 23:59 | — | 3 | 5 | 5 |
| [UI-34](../architechture/tasks/UI-34.md) | Kiểm tra UI chung: brand, responsive, accessibility, lint/typecheck, trạng thái và design review | Trần Nguyễn Hữu Khánh | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | — | 8 | 14 | 14 |
| [UI-39](../architechture/tasks/UI-39.md) | Dockerfile cho 2 frontend | Mai Sơn Việt | DONE | 28/10/2026 08:00 | 28/10/2026 23:59 | — | 3 | 4 | 0 |
| [UI-40](../architechture/tasks/UI-40.md) | Verify Dockerfile + build 11 module backend | Mai Sơn Việt | DONE | 28/10/2026 08:00 | 28/10/2026 23:59 | — | 5 | 8 | 0 |
| [UI-41](../architechture/tasks/UI-41.md) | CI script: build + lint | Mai Sơn Việt | DONE | 28/10/2026 08:00 | 28/10/2026 23:59 | — | 3 | 4 | 0 |
| [UI-43](../architechture/tasks/UI-43.md) | Cart + Order visual contract: cart badge, order status chips, order card components | Trần Đức Anh | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 2 | 3 | 0 |
| [UI-44](../architechture/tasks/UI-44.md) | Payment + Shipping visual components: QR card, payment state badge, fee/shipment card | Lê Phú Thịnh | DONE | 26/10/2026 08:00 | 26/10/2026 23:59 | — | 2 | 3 | 0 |
| [UI-45](../architechture/tasks/UI-45.md) | Promotion + Notification visual components: voucher badge, points tier, notification item | Cao Tất Thành | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | — | 2 | 3 | 3 |
| [UI-46](../architechture/tasks/UI-46.md) | Order domain responsive/a11y pass: Cart, Checkout, Orders, Staff Orders | Trần Đức Anh | DONE | 28/10/2026 08:00 | 28/10/2026 23:59 | — | 3 | 4 | 0 |
| [UI-47](../architechture/tasks/UI-47.md) | Payment/Shipping responsive/a11y pass: QR, payment admin, shipment widget | Lê Phú Thịnh | DONE | 28/10/2026 08:00 | 28/10/2026 23:59 | — | 3 | 4 | 0 |
| [UI-48](../architechture/tasks/UI-48.md) | Promotion/Notification responsive/a11y pass: voucher, loyalty, notifications | Cao Tất Thành | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | — | 3 | 4 | 4 |
| [UI-49](../architechture/tasks/UI-49.md) | Nút "Đăng nhập bằng Google" + màn nhập mật khẩu sau khi Google xác thực (customer app only) | Lê Phú Thịnh | DONE | 27/10/2026 08:00 | 27/10/2026 23:59 | — | 5 | 6 | 0 |
| [BE-01](../architechture/tasks/BE-01.md) | Ánh xạ entity/repository vào schema hiện có — Identity | Trần Nguyễn Hữu Khánh | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-03, UI-06 | 3 | 6 | 6 |
| [BE-02](../architechture/tasks/BE-02.md) | Ánh xạ entity/repository vào schema hiện có — Catalog & Store | Nguyễn Duy Quang Nhật | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-03, UI-06 | 5 | 8 | 8 |
| [BE-03](../architechture/tasks/BE-03.md) | Ánh xạ entity/repository vào schema hiện có — Cart & Order | Trần Đức Anh | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-03, UI-06 | 3 | 6 | 6 |
| [BE-04](../architechture/tasks/BE-04.md) | Ánh xạ entity/repository vào schema hiện có — Payment | Lê Phú Thịnh | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-03, UI-06 | 3 | 5 | 5 |
| [BE-05](../architechture/tasks/BE-05.md) | Ánh xạ entity/repository vào schema hiện có — Promotion & Loyalty | Cao Tất Thành | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | UI-03, UI-06 | 3 | 6 | 6 |
| [BE-06](../architechture/tasks/BE-06.md) | Ánh xạ entity/repository vào schema hiện có — Shipping | Lê Phú Thịnh | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-03, UI-06 | 2 | 3 | 3 |
| [BE-07](../architechture/tasks/BE-07.md) | Ánh xạ entity/repository vào schema hiện có — Notification | Cao Tất Thành | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | UI-03, UI-06 | 3 | 5 | 5 |
| [BE-08](../architechture/tasks/BE-08.md) | Ánh xạ entity/repository vào schema hiện có — Review & Report | Mai Sơn Việt | TO DO | 30/10/2026 08:00 | 31/10/2026 23:59 | UI-03, UI-06 | 3 | 5 | 5 |
| [BE-09](../architechture/tasks/BE-09.md) | Security/JWT template: filter, RBAC, storeId | Trần Nguyễn Hữu Khánh | TO DO | 30/10/2026 08:00 | 31/10/2026 23:59 | BE-01 | 8 | 12 | 12 |
| [BE-10](../architechture/tasks/BE-10.md) | Chuẩn response/error và global exception handler | Lê Phú Thịnh | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-03 | 3 | 5 | 5 |
| [BE-11](../architechture/tasks/BE-11.md) | Kafka config: topics, producer/consumer factory | Mai Sơn Việt | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-06 | 5 | 6 | 6 |
| [BE-12](../architechture/tasks/BE-12.md) | Redis config: template, TTL policy | Mai Sơn Việt | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-06 | 2 | 3 | 3 |
| [BE-13](../architechture/tasks/BE-13.md) | OpenAPI/Swagger config template | Lê Phú Thịnh | TO DO | 30/10/2026 08:00 | 31/10/2026 23:59 | UI-03 | 1 | 2 | 2 |
| [BE-15](../architechture/tasks/BE-15.md) | Health + info + correlation-id filter | Lê Phú Thịnh | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | BE-10 | 3 | 4 | 4 |
| [BE-20](../architechture/tasks/BE-20.md) | Catalog public: stores, categories, products, combos, search | Nguyễn Duy Quang Nhật | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | BE-02, BE-10 | 5 | 10 | 10 |
| [BE-23](../architechture/tasks/BE-23.md) | Cart Redis CRUD (guest session + customer) | Trần Đức Anh | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | BE-03, BE-12 | 5 | 8 | 8 |
| [BE-50](../architechture/tasks/BE-50.md) | Payment API contract: payment DTO, QR response, payment status enum | Lê Phú Thịnh | TO DO | 30/10/2026 08:00 | 31/10/2026 23:59 | BE-04 | 2 | 3 | 3 |
| [BE-51](../architechture/tasks/BE-51.md) | Promotion API contract: voucher validation/loyalty DTOs and error cases | Cao Tất Thành | TO DO | 01/11/2026 08:00 | 01/11/2026 23:59 | BE-05 | 3 | 4 | 4 |
| [BE-52](../architechture/tasks/BE-52.md) | Notification API skeleton: notification DTO, pagination, read-state contract | Mai Sơn Việt | TO DO | 30/10/2026 08:00 | 31/10/2026 23:59 | UI-03 | 2 | 3 | 3 |
| [BE-57](../architechture/tasks/BE-57.md) | Mail Sender configuration properties + Config Server env mapping | Cao Tất Thành | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | UI-03 | 3 | 4 | 4 |
| [BE-59](../architechture/tasks/BE-59.md) | Email message DTO: recipient, template, variables, eventId, correlationId | Cao Tất Thành | TO DO | 30/10/2026 08:00 | 01/11/2026 23:59 | UI-03 | 2 | 3 | 3 |
| [BE-68](../architechture/tasks/BE-68.md) | Cloudinary config properties + Config Server env mapping | Nguyễn Duy Quang Nhật | TO DO | 30/10/2026 08:00 | 30/10/2026 23:59 | UI-03 | 2 | 3 | 3 |

### Sprint 2 — khung 02–08/11/2026; hoàn tất 05/11, review 06/11

| ID | Task | PIC | Trạng thái | Bắt đầu | Deadline | Dependency | SP | Time Estimated (h) | Remaining (h)* |
|---|---|---|---|---|---|---|---:|---:|---:|
| [BE-16](../architechture/tasks/BE-16.md) | Auth: register + OTP + verify | Trần Nguyễn Hữu Khánh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-01, BE-09, BE-59, BE-64, BE-60 | 8 | 12 | 12 |
| [BE-17](../architechture/tasks/BE-17.md) | Auth: login + JWT + refresh + logout + forgot/reset | Trần Nguyễn Hữu Khánh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-01, BE-09, BE-60, BE-64 | 8 | 16 | 16 |
| [BE-18](../architechture/tasks/BE-18.md) | User: profile + address book CRUD | Trần Nguyễn Hữu Khánh | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-01, BE-09 | 5 | 8 | 8 |
| [BE-19](../architechture/tasks/BE-19.md) | User admin: create staff, lock/unlock, assign-store, schedules | Trần Nguyễn Hữu Khánh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-01, BE-09 | 8 | 12 | 12 |
| [BE-21](../architechture/tasks/BE-21.md) | Catalog admin: CRUD stores/categories/products/combos/toppings | Nguyễn Duy Quang Nhật | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-02, BE-09, BE-10 | 13 | 24 | 24 |
| [BE-22](../architechture/tasks/BE-22.md) | Availability toggle + inventory | Nguyễn Duy Quang Nhật | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-21 | 5 | 8 | 8 |
| [BE-24](../architechture/tasks/BE-24.md) | Order preview: giá, voucher/điểm và phí ship qua contract nội bộ | Trần Đức Anh | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-23, BE-34, BE-33, BE-37 | 8 | 12 | 12 |
| [BE-25](../architechture/tasks/BE-25.md) | Tạo đơn: kiểm tra giá/availability, khởi tạo payment, trạng thái và optimistic locking | Trần Đức Anh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-24, BE-20, BE-29, BE-09 | 13 | 20 | 20 |
| [BE-26](../architechture/tasks/BE-26.md) | Order cancel + reject + refund-request | Trần Đức Anh | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-25 | 5 | 8 | 8 |
| [BE-27](../architechture/tasks/BE-27.md) | Order list my/admin (storeId filter) + detail + reorder | Trần Đức Anh | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-25 | 8 | 12 | 12 |
| [BE-29](../architechture/tasks/BE-29.md) | Payment: tạo bank-transfer + QR VietQR (PENDING, expires) | Lê Phú Thịnh | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-04, BE-50 | 5 | 8 | 8 |
| [BE-30](../architechture/tasks/BE-30.md) | Payment: webhook SePay (raw-body signature, match code+amount, idempotent) | Lê Phú Thịnh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-29 | 8 | 14 | 14 |
| [BE-32](../architechture/tasks/BE-32.md) | Payment: confirm-manual, confirm-cod, refund, transactions, bank-config | Lê Phú Thịnh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-04, BE-09 | 8 | 14 | 14 |
| [BE-33](../architechture/tasks/BE-33.md) | Shipping MVP: tính phí, cấu hình phí và chi tiết shipment CREATED | Lê Phú Thịnh | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-06 | 5 | 8 | 8 |
| [BE-34](../architechture/tasks/BE-34.md) | Promotion: voucher validate + CRUD + scope ALL/STORE | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-05, BE-51 | 8 | 12 | 12 |
| [BE-37](../architechture/tasks/BE-37.md) | Loyalty: points, tier, earn/redeem, config | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-05, BE-51 | 8 | 14 | 14 |
| [BE-38](../architechture/tasks/BE-38.md) | Notification: my notifications, read, read-all | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-07, BE-52, BE-09 | 3 | 6 | 6 |
| [BE-39](../architechture/tasks/BE-39.md) | Notification consumer: in-app/email orchestration, idempotency và Kafka replay protection | Cao Tất Thành | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-11, BE-38, BE-62, BE-66, INT-39, INT-40 | 8 | 12 | 12 |
| [BE-40](../architechture/tasks/BE-40.md) | Review: create/edit/delete own + product reviews | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-08, BE-09, BE-25 | 5 | 8 | 8 |
| [BE-41](../architechture/tasks/BE-41.md) | Review: replies + hide | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-40 | 3 | 4 | 4 |
| [BE-42](../architechture/tasks/BE-42.md) | Report: dashboard per role + revenue + export Excel/PDF | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-08, BE-09, INT-45 | 13 | 20 | 20 |
| [BE-43](../architechture/tasks/BE-43.md) | Audit log: record + query | Mai Sơn Việt | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | BE-08, BE-09, INT-48 | 5 | 8 | 8 |
| [BE-44](../architechture/tasks/BE-44.md) | Payment status query + ownership: customer chỉ xem payment của order mình | Lê Phú Thịnh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-29, BE-09 | 5 | 6 | 6 |
| [BE-45](../architechture/tasks/BE-45.md) | Bank transaction reconciliation detail + mismatch workflow | Lê Phú Thịnh | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-30 | 5 | 8 | 8 |
| [BE-46](../architechture/tasks/BE-46.md) | Refund state machine: PENDING → APPROVED/REJECTED → REFUNDED | Lê Phú Thịnh | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | BE-32, BE-26 | 8 | 10 | 10 |
| [BE-48](../architechture/tasks/BE-48.md) | Shipping fee rules: base fee, per-km, free threshold, store override | Lê Phú Thịnh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-33 | 3 | 4 | 4 |
| [BE-49](../architechture/tasks/BE-49.md) | Payment/Shipping OpenAPI examples + webhook payload schemas | Lê Phú Thịnh | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-30, BE-33, BE-13 | 3 | 4 | 4 |
| [BE-54](../architechture/tasks/BE-54.md) | Catalog integration hardening: menu cache invalidation and store availability contract | Nguyễn Duy Quang Nhật | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-20, BE-22, BE-12 | 5 | 8 | 8 |
| [BE-58](../architechture/tasks/BE-58.md) | Mail Sender interface + Gmail SMTP adapter boundary | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-57, BE-59 | 2 | 3 | 3 |
| [BE-60](../architechture/tasks/BE-60.md) | Gmail SMTP connection with STARTTLS and timeout | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-57, BE-58 | 5 | 5 | 5 |
| [BE-61](../architechture/tasks/BE-61.md) | Email template renderer for transactional templates | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-59 | 3 | 6 | 6 |
| [BE-62](../architechture/tasks/BE-62.md) | Email log/status persistence and idempotency by eventId/messageId | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-07, BE-59 | 5 | 8 | 8 |
| [BE-63](../architechture/tasks/BE-63.md) | Admin email-log API with recipient/status/template/date filters | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-62, BE-09 | 5 | 6 | 6 |
| [BE-64](../architechture/tasks/BE-64.md) | OTP email templates: register, verify, forgot/reset password | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-61 | 2 | 3 | 3 |
| [BE-65](../architechture/tasks/BE-65.md) | Order/payment/refund email templates | Cao Tất Thành | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-61, BE-59 | 3 | 6 | 6 |
| [BE-66](../architechture/tasks/BE-66.md) | Mail retry/backoff policy and FAILED state handling | Cao Tất Thành | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-60, BE-62 | 8 | 10 | 10 |
| [BE-67](../architechture/tasks/BE-67.md) | Email failure event/DLQ and masked error logging | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-66, BE-11 | 5 | 6 | 6 |
| [BE-70](../architechture/tasks/BE-70.md) | Cloudinary adapter và tích hợp upload ảnh product/combo | Nguyễn Duy Quang Nhật | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-68, BE-71 | 8 | 10 | 10 |
| [BE-71](../architechture/tasks/BE-71.md) | Signed upload/secure backend upload contract and MIME/size validation | Nguyễn Duy Quang Nhật | TO DO | 02/11/2026 08:00 | 02/11/2026 23:59 | BE-68, BE-09 | 5 | 6 | 6 |
| [BE-72](../architechture/tasks/BE-72.md) | Product/combo media API | Nguyễn Duy Quang Nhật | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-70, BE-21 | 3 | 6 | 6 |
| [BE-74](../architechture/tasks/BE-74.md) | Cloudinary: xử lý lỗi, idempotency và cleanup asset sau metadata commit | Nguyễn Duy Quang Nhật | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-70, BE-72 | 8 | 12 | 12 |
| [BE-75](../architechture/tasks/BE-75.md) | Media response DTO và kiểm tra không lộ secret frontend/API/log | Lê Phú Thịnh | TO DO | 02/11/2026 08:00 | 04/11/2026 23:59 | BE-10 | 3 | 4 | 4 |
| [BE-76](../architechture/tasks/BE-76.md) | Google OAuth qua Firebase: verify ID token, complete-password, JWT và migration bổ sung | Lê Phú Thịnh | TO DO | 02/11/2026 08:00 | 03/11/2026 23:59 | BE-01, BE-09, BE-17, BE-12 | 13 | 20 | 20 |
| [INT-05](../architechture/tasks/INT-05.md) | Auth E2E: register → OTP → login → refresh, 2 app | Trần Nguyễn Hữu Khánh | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | BE-16, BE-17, INT-53, INT-69 | 8 | 10 | 10 |
| [INT-06](../architechture/tasks/INT-06.md) | Menu/catalog E2E: browse, search, availability theo quán | Nguyễn Duy Quang Nhật | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-20, BE-54, INT-54 | 5 | 6 | 6 |
| [INT-07](../architechture/tasks/INT-07.md) | Cart → checkout → tạo đơn E2E | Trần Đức Anh | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-25, BE-24, INT-53 | 8 | 10 | 10 |
| [INT-08](../architechture/tasks/INT-08.md) | Order tracking, history, cancel, reorder E2E | Trần Đức Anh | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | BE-26, BE-27, INT-68 | 5 | 8 | 8 |
| [INT-09](../architechture/tasks/INT-09.md) | Payment: QR hiển thị, webhook → CONFIRMED, COD confirm | Lê Phú Thịnh | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | BE-30, BE-32, INT-40, INT-51 | 8 | 12 | 12 |
| [INT-10](../architechture/tasks/INT-10.md) | Voucher apply + loyalty points E2E | Cao Tất Thành | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | BE-34, BE-37, INT-44, BE-24 | 5 | 8 | 8 |
| [INT-11](../architechture/tasks/INT-11.md) | Notification list + mark-read E2E | Cao Tất Thành | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | BE-38, BE-39 | 3 | 4 | 4 |
| [INT-12](../architechture/tasks/INT-12.md) | Review: viết/sửa/xóa + reply + hide E2E | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-40, BE-41 | 5 | 6 | 6 |
| [INT-13](../architechture/tasks/INT-13.md) | Report/dashboard/export E2E | Mai Sơn Việt | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | BE-42 | 5 | 8 | 8 |
| [INT-14](../architechture/tasks/INT-14.md) | Admin orders: status, refund approve E2E | Trần Đức Anh | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | BE-25, BE-26, BE-46, INT-51 | 5 | 6 | 6 |
| [INT-15](../architechture/tasks/INT-15.md) | Admin catalog/store/inventory E2E | Nguyễn Duy Quang Nhật | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-21, BE-22 | 5 | 8 | 8 |
| [INT-39](../architechture/tasks/INT-39.md) | Kafka producer: order.created/status-changed/completed/cancelled | Trần Đức Anh | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-25, BE-11 | 5 | 6 | 6 |
| [INT-40](../architechture/tasks/INT-40.md) | Kafka producer: payment.confirmed/failed | Lê Phú Thịnh | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-30, BE-32, BE-11 | 5 | 6 | 6 |
| [INT-43](../architechture/tasks/INT-43.md) | Consumer: shipping tạo bản ghi khi order.created | Lê Phú Thịnh | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | INT-39, BE-06 | 3 | 4 | 4 |
| [INT-44](../architechture/tasks/INT-44.md) | Consumer: promotion cộng điểm khi order.completed | Cao Tất Thành | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | INT-39, BE-37 | 5 | 6 | 6 |
| [INT-45](../architechture/tasks/INT-45.md) | Consumer: report cập nhật daily_store_stats | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | INT-39, INT-40, BE-08 | 8 | 8 | 8 |
| [INT-46](../architechture/tasks/INT-46.md) | DLQ + retry + idempotent consumer | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-11 | 8 | 10 | 10 |
| [INT-47](../architechture/tasks/INT-47.md) | Saga: payment.failed → cancel order → release voucher/điểm | Trần Đức Anh | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | INT-40, BE-26, BE-34, BE-37 | 8 | 12 | 12 |
| [INT-48](../architechture/tasks/INT-48.md) | Audit log consumer cho thao tác quản trị | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-11, BE-08 | 5 | 6 | 6 |
| [INT-49](../architechture/tasks/INT-49.md) | SePay webhook test: mock → verify → match → confirm | Lê Phú Thịnh | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | BE-30, BE-45 | 5 | 8 | 8 |
| [INT-50](../architechture/tasks/INT-50.md) | Payment timeout: QR expires → order/payment expired → notify customer | Lê Phú Thịnh | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | BE-29, INT-40, BE-39, BE-26 | 8 | 8 | 8 |
| [INT-51](../architechture/tasks/INT-51.md) | COD lifecycle: confirm at branch → collected → completed | Lê Phú Thịnh | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-32, BE-25 | 5 | 6 | 6 |
| [INT-52](../architechture/tasks/INT-52.md) | Tích hợp refund: duyệt/từ chối, cập nhật thanh toán, thông báo và nghiệm thu | Lê Phú Thịnh | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | BE-46, BE-26, BE-39, INT-40 | 8 | 12 | 12 |
| [INT-53](../architechture/tasks/INT-53.md) | Identity → Gateway security integration: JWT claims, role, storeId propagation | Trần Nguyễn Hữu Khánh | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-09, BE-17, UI-05 | 8 | 8 | 8 |
| [INT-54](../architechture/tasks/INT-54.md) | Catalog → Gateway discovery integration: menu route, cache headers, availability | Nguyễn Duy Quang Nhật | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-20, UI-05, UI-04 | 3 | 4 | 4 |
| [INT-60](../architechture/tasks/INT-60.md) | Email delivery metrics/logging correlation across services | Mai Sơn Việt | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-62, BE-67, BE-15 | 3 | 4 | 4 |
| [INT-61](../architechture/tasks/INT-61.md) | Admin users: create staff, lock, assign E2E | Trần Nguyễn Hữu Khánh | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-19 | 5 | 6 | 6 |
| [INT-62](../architechture/tasks/INT-62.md) | Tích hợp UI quản trị voucher thường (banner và duyệt chi nhánh để backlog) | Cao Tất Thành | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-34 | 3 | 4 | 4 |
| [INT-63](../architechture/tasks/INT-63.md) | Admin payments/bank config E2E | Lê Phú Thịnh | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | BE-32, BE-45 | 5 | 6 | 6 |
| [INT-64](../architechture/tasks/INT-64.md) | Payment status UI: pending/paid/expired/mismatch/refund states | Lê Phú Thịnh | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | BE-44, INT-50, INT-52 | 5 | 6 | 6 |
| [INT-65](../architechture/tasks/INT-65.md) | Shipping fee + shipment info UI integration | Lê Phú Thịnh | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | BE-33, BE-48, INT-43 | 3 | 4 | 4 |
| [INT-67](../architechture/tasks/INT-67.md) | RBAC E2E: storeId enforcement từng API | Trần Nguyễn Hữu Khánh | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | INT-53, BE-19, BE-22, BE-27, BE-44 | 8 | 12 | 12 |
| [INT-68](../architechture/tasks/INT-68.md) | Order status realtime (polling) cho customer | Trần Đức Anh | TO DO | 04/11/2026 08:00 | 04/11/2026 23:59 | BE-27 | 3 | 4 | 4 |
| [INT-69](../architechture/tasks/INT-69.md) | Customer auth UI: email sent/sending/failure states | Trần Nguyễn Hữu Khánh | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-16, BE-17, BE-60 | 3 | 4 | 4 |
| [INT-72](../architechture/tasks/INT-72.md) | Component upload/preview/progress/lỗi dùng chung; áp dụng product/combo | Nguyễn Duy Quang Nhật | TO DO | 03/11/2026 08:00 | 03/11/2026 23:59 | BE-71 | 5 | 6 | 6 |
| [INT-73](../architechture/tasks/INT-73.md) | Tích hợp UI quản trị ảnh product/combo | Nguyễn Duy Quang Nhật | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-72, INT-72 | 3 | 4 | 4 |
| [INT-74](../architechture/tasks/INT-74.md) | Google login E2E: tài khoản cũ/mới, complete-password, token lỗi và email trùng | Lê Phú Thịnh | TO DO | 03/11/2026 08:00 | 04/11/2026 23:59 | BE-76, UI-49 | 8 | 10 | 10 |
| [TEST-01](../architechture/tasks/TEST-01.md) | E2E Guest→register→OTP→browse→cart→COD order | Trần Đức Anh | TO DO | 05/11/2026 08:00 | 05/11/2026 23:59 | INT-05, INT-06, INT-07, INT-51 | 5 | 6 | 6 |
| [TEST-05](../architechture/tasks/TEST-05.md) | E2E Manager: create staff→assign→reports | Mai Sơn Việt | TO DO | 05/11/2026 08:00 | 05/11/2026 23:59 | INT-61, INT-13 | 3 | 4 | 4 |
| [TEST-06](../architechture/tasks/TEST-06.md) | E2E Admin: store → product → voucher thường | Nguyễn Duy Quang Nhật | TO DO | 05/11/2026 08:00 | 05/11/2026 23:59 | INT-15, INT-62 | 3 | 4 | 4 |
| [TEST-07](../architechture/tasks/TEST-07.md) | RBAC: Staff A không gọi được dữ liệu quán B | Trần Nguyễn Hữu Khánh | TO DO | 05/11/2026 08:00 | 05/11/2026 23:59 | INT-67 | 5 | 4 | 4 |
| [TEST-12](../architechture/tasks/TEST-12.md) | Shipping fee rules: pickup/free threshold/store override | Lê Phú Thịnh | TO DO | 05/11/2026 08:00 | 05/11/2026 23:59 | INT-65 | 3 | 3 | 3 |
| [TEST-16](../architechture/tasks/TEST-16.md) | Integration test Kafka + cross-service | Mai Sơn Việt | TO DO | 05/11/2026 08:00 | 05/11/2026 23:59 | INT-43, INT-44, INT-45, INT-46, INT-47 | 8 | 8 | 8 |
| [TEST-17](../architechture/tasks/TEST-17.md) | Responsive test toàn bộ | Nguyễn Duy Quang Nhật | TO DO | 05/11/2026 08:00 | 05/11/2026 23:59 | INT-05, INT-06, INT-08, INT-09, INT-11 | 5 | 6 | 6 |
| [TEST-22](../architechture/tasks/TEST-22.md) | OTP/order/payment/refund email E2E flows | Cao Tất Thành | TO DO | 05/11/2026 08:00 | 05/11/2026 23:59 | INT-05, INT-09, INT-52, BE-39 | 5 | 6 | 6 |
| [TEST-23](../architechture/tasks/TEST-23.md) | Email failure does not rollback order/payment | Cao Tất Thành | TO DO | 05/11/2026 08:00 | 05/11/2026 23:59 | BE-66, BE-39, INT-07, INT-09 | 5 | 4 | 4 |
| [TEST-24](../architechture/tasks/TEST-24.md) | Secret masking: App Password absent from logs/API | Mai Sơn Việt | TO DO | 05/11/2026 08:00 | 05/11/2026 23:59 | BE-57, BE-67 | 3 | 3 | 3 |
| [TEST-25](../architechture/tasks/TEST-25.md) | Cloudinary valid image upload and URL/public_id persistence | Nguyễn Duy Quang Nhật | TO DO | 05/11/2026 08:00 | 05/11/2026 23:59 | INT-73 | 2 | 3 | 3 |
| [TEST-26](../architechture/tasks/TEST-26.md) | Invalid MIME/oversize upload rejected | Nguyễn Duy Quang Nhật | TO DO | 05/11/2026 08:00 | 05/11/2026 23:59 | BE-71 | 2 | 2 | 2 |
| [DEP-09](../architechture/tasks/DEP-09.md) | Postman collection: mỗi người export service mình, M6 merge | Mai Sơn Việt | TO DO | 04/11/2026 08:00 | 05/11/2026 23:59 | INT-53, INT-54, INT-07, INT-09, INT-11, INT-13 | 3 | 6 | 6 |
| [DEP-10](../architechture/tasks/DEP-10.md) | Demo materials: script + screenshots + slides | Trần Nguyễn Hữu Khánh | TO DO | 04/11/2026 08:00 | 05/11/2026 23:59 | TEST-01, TEST-05, TEST-06, TEST-07 | 3 | 8 | 8 |

### Backlog — chưa xếp sprint

| ID | Task | PIC | Trạng thái | Bắt đầu | Deadline | Dependency | SP | Time Estimated (h) | Remaining (h)* |
|---|---|---|---|---|---|---|---:|---:|---:|
| [BE-28](../architechture/tasks/BE-28.md) | Party order create + quản lý tiếp nhận | Trần Đức Anh | TO DO | Chưa xếp | Chưa xếp | BE-03, BE-09 | 5 | 8 | 8 |
| [BE-31](../architechture/tasks/BE-31.md) | Payment: webhook Casso | Lê Phú Thịnh | TO DO | Chưa xếp | Chưa xếp | BE-29 | 8 | 12 | 12 |
| [BE-35](../architechture/tasks/BE-35.md) | Promotion: store-proposals + approve | Cao Tất Thành | TO DO | Chưa xếp | Chưa xếp | BE-34 | 5 | 8 | 8 |
| [BE-36](../architechture/tasks/BE-36.md) | Quản trị banner: CRUD, upload ảnh và metadata Cloudinary | Cao Tất Thành | TO DO | Chưa xếp | Chưa xếp | BE-05, BE-70, BE-74 | 8 | 12 | 12 |
| [BE-47](../architechture/tasks/BE-47.md) | Phase 2: lịch sử/trạng thái giao hàng sau CREATED | Lê Phú Thịnh | TO DO | Chưa xếp | Chưa xếp | BE-33 | 8 | 16 | 16 |
| [INT-02](../architechture/tasks/INT-02.md) | Promotion → Cloudinary banner upload integration | Cao Tất Thành | TO DO | Chưa xếp | Chưa xếp | BE-36 | 3 | 4 | 4 |
| [INT-03](../architechture/tasks/INT-03.md) | Identity: upload/thay avatar và lưu metadata Cloudinary | Trần Nguyễn Hữu Khánh | TO DO | Chưa xếp | Chưa xếp | BE-18, BE-70, BE-74 | 5 | 8 | 8 |
| [INT-41](../architechture/tasks/INT-41.md) | Kafka producer: promotion.approved | Cao Tất Thành | TO DO | Chưa xếp | Chưa xếp | BE-35, BE-11 | 3 | 4 | 4 |
| [INT-58](../architechture/tasks/INT-58.md) | Promotion → Notification: promotion email event contract | Cao Tất Thành | TO DO | Chưa xếp | Chưa xếp | INT-41, BE-39 | 3 | 4 | 4 |
| [INT-70](../architechture/tasks/INT-70.md) | Customer order/payment UI: email notification status where applicable | Trần Đức Anh | TO DO | Chưa xếp | Chưa xếp | BE-39, BE-27 | 3 | 4 | 4 |
| [INT-71](../architechture/tasks/INT-71.md) | Admin email-log screen: filter, detail, retry failed email | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | BE-63 | 5 | 8 | 8 |
| [TEST-13](../architechture/tasks/TEST-13.md) | Performance: menu <500ms (Redis cache) | Nguyễn Duy Quang Nhật | TO DO | Chưa xếp | Chưa xếp | BE-54 | 8 | 12 | 12 |
| [TEST-14](../architechture/tasks/TEST-14.md) | Load test 50 concurrent orders | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | INT-07, INT-09 | 8 | 12 | 12 |
| [DEP-01](../architechture/tasks/DEP-01.md) | VPS setup: Docker + Compose + mở port | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | UI-06 | 3 | 4 | 4 |
| [DEP-02](../architechture/tasks/DEP-02.md) | `docker compose up -d` toàn bộ stack | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-01 | 5 | 6 | 6 |
| [DEP-03](../architechture/tasks/DEP-03.md) | Nginx reverse proxy + HTTPS Let's Encrypt | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-02 | 3 | 4 | 4 |
| [DEP-04](../architechture/tasks/DEP-04.md) | Domain + CORS + trusted origins | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-03 | 3 | 3 | 3 |
| [DEP-05](../architechture/tasks/DEP-05.md) | Health check mọi container | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-02 | 2 | 3 | 3 |
| [DEP-06](../architechture/tasks/DEP-06.md) | Smoke test VPS: login, menu, COD, transfer | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-04, DEP-05, TEST-01, INT-09 | 5 | 6 | 6 |
| [DEP-07](../architechture/tasks/DEP-07.md) | Backup script daily, giữ 7 bản | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-02 | 5 | 6 | 6 |
| [DEP-08](../architechture/tasks/DEP-08.md) | README final: run, arch, API | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-06, DEP-09 | 3 | 6 | 6 |
| [DEP-11](../architechture/tasks/DEP-11.md) | Final review + tag release | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-06, DEP-07, DEP-08, DEP-10 | 3 | 4 | 4 |
| [DEP-12](../architechture/tasks/DEP-12.md) | Handover: credentials, .env, rollback | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-11 | 5 | 6 | 6 |
| [DEP-20](../architechture/tasks/DEP-20.md) | Production email smoke test and email_logs backup verification | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-06, BE-60 | 5 | 4 | 4 |
| [DEP-22](../architechture/tasks/DEP-22.md) | Media backup/cleanup verification and production smoke test | Mai Sơn Việt | TO DO | Chưa xếp | Chưa xếp | DEP-06, BE-74 | 5 | 6 | 6 |

## Truy vết 48 ID đã gộp hoặc bỏ record trùng

Các ID dưới đây không còn là task độc lập trên Lark. File detail cũ được giữ dưới dạng chuyển hướng; không giao lại các ID này. Nội dung cần làm được giữ trong task đích hoặc tiêu chí của từng domain.

| ID cũ | Task đích / cách xử lý |
|---|---|
| UI-33 | [UI-34](../architechture/tasks/UI-34.md) — Trần Nguyễn Hữu Khánh |
| UI-35 | [UI-34](../architechture/tasks/UI-34.md) — Trần Nguyễn Hữu Khánh |
| UI-36 | [UI-34](../architechture/tasks/UI-34.md) — Trần Nguyễn Hữu Khánh |
| UI-37 | [UI-34](../architechture/tasks/UI-34.md) — Trần Nguyễn Hữu Khánh |
| UI-38 | [UI-34](../architechture/tasks/UI-34.md) — Trần Nguyễn Hữu Khánh |
| UI-42 | [UI-34](../architechture/tasks/UI-34.md) — Trần Nguyễn Hữu Khánh |
| BE-14 | [BE-10](../architechture/tasks/BE-10.md) — Lê Phú Thịnh |
| BE-53 | [BE-16](../architechture/tasks/BE-16.md) — Trần Nguyễn Hữu Khánh; [BE-17](../architechture/tasks/BE-17.md) — Trần Nguyễn Hữu Khánh |
| BE-55 | [BE-25](../architechture/tasks/BE-25.md) — Trần Đức Anh |
| BE-56 | [BE-07](../architechture/tasks/BE-07.md) — Cao Tất Thành |
| BE-69 | [BE-01](../architechture/tasks/BE-01.md) — Trần Nguyễn Hữu Khánh; [BE-02](../architechture/tasks/BE-02.md) — Nguyễn Duy Quang Nhật; [BE-05](../architechture/tasks/BE-05.md) — Cao Tất Thành |
| BE-73 | [INT-03](../architechture/tasks/INT-03.md) — Trần Nguyễn Hữu Khánh; [BE-36](../architechture/tasks/BE-36.md) — Cao Tất Thành |
| INT-01 | [BE-70](../architechture/tasks/BE-70.md) — Nguyễn Duy Quang Nhật |
| INT-04 | [BE-74](../architechture/tasks/BE-74.md) — Nguyễn Duy Quang Nhật |
| INT-35 | [BE-24](../architechture/tasks/BE-24.md) — Trần Đức Anh |
| INT-36 | [BE-25](../architechture/tasks/BE-25.md) — Trần Đức Anh |
| INT-37 | [BE-25](../architechture/tasks/BE-25.md) — Trần Đức Anh |
| INT-38 | [BE-24](../architechture/tasks/BE-24.md) — Trần Đức Anh |
| INT-42 | [BE-39](../architechture/tasks/BE-39.md) — Cao Tất Thành |
| INT-55 | [BE-16](../architechture/tasks/BE-16.md) — Trần Nguyễn Hữu Khánh |
| INT-56 | [INT-39](../architechture/tasks/INT-39.md) — Trần Đức Anh |
| INT-57 | [INT-40](../architechture/tasks/INT-40.md) — Lê Phú Thịnh |
| INT-59 | [BE-39](../architechture/tasks/BE-39.md) — Cao Tất Thành |
| INT-66 | [INT-52](../architechture/tasks/INT-52.md) — Lê Phú Thịnh |
| TEST-02 | [INT-09](../architechture/tasks/INT-09.md) — Lê Phú Thịnh |
| TEST-03 | [INT-52](../architechture/tasks/INT-52.md) — Lê Phú Thịnh |
| TEST-04 | [INT-14](../architechture/tasks/INT-14.md) — Trần Đức Anh |
| TEST-08 | [INT-49](../architechture/tasks/INT-49.md) — Lê Phú Thịnh |
| TEST-09 | [INT-49](../architechture/tasks/INT-49.md) — Lê Phú Thịnh |
| TEST-10 | [INT-50](../architechture/tasks/INT-50.md) — Lê Phú Thịnh |
| TEST-11 | [INT-52](../architechture/tasks/INT-52.md) — Lê Phú Thịnh |
| TEST-15 | Tiêu chí kiểm chứng critical path trong task BE/INT của từng owner. |
| TEST-18 | Bug thực tế được ghi riêng, mỗi bug một PIC; sửa lỗi/retest cuốn chiếu, chốt trước 05/11. |
| TEST-19 | [BE-60](../architechture/tasks/BE-60.md) — Cao Tất Thành |
| TEST-20 | [BE-66](../architechture/tasks/BE-66.md) — Cao Tất Thành |
| TEST-21 | [BE-39](../architechture/tasks/BE-39.md) — Cao Tất Thành |
| TEST-27 | [BE-74](../architechture/tasks/BE-74.md) — Nguyễn Duy Quang Nhật |
| TEST-28 | [BE-75](../architechture/tasks/BE-75.md) — Lê Phú Thịnh |
| TEST-29 | [INT-74](../architechture/tasks/INT-74.md) — Lê Phú Thịnh |
| DEP-13 | [INT-05](../architechture/tasks/INT-05.md) — Trần Nguyễn Hữu Khánh |
| DEP-14 | [INT-06](../architechture/tasks/INT-06.md) — Nguyễn Duy Quang Nhật |
| DEP-15 | [INT-53](../architechture/tasks/INT-53.md) — Trần Nguyễn Hữu Khánh |
| DEP-16 | [INT-09](../architechture/tasks/INT-09.md) — Lê Phú Thịnh |
| DEP-17 | [INT-11](../architechture/tasks/INT-11.md) — Cao Tất Thành |
| DEP-18 | [BE-57](../architechture/tasks/BE-57.md) — Cao Tất Thành |
| DEP-19 | [BE-57](../architechture/tasks/BE-57.md) — Cao Tất Thành |
| DEP-21 | [BE-68](../architechture/tasks/BE-68.md) — Nguyễn Duy Quang Nhật |
| DEP-23 | [BE-76](../architechture/tasks/BE-76.md) — Lê Phú Thịnh |

## Kết quả đồng bộ Lark ngày 01/11/2026

**Phạm vi publish Git:** chỉ backlog tổng hợp và task detail. Kế hoạch, manifest, snapshot và tài liệu verification được nhắc đến trong tài liệu chỉ giữ cục bộ, không thuộc bản cập nhật này.

- Đã ghi và đọc lại đủ **184 record**; 0 sai lệch. Trên Lark chỉ giữ **Story Point** và **Time Estimate (giờ công)** cho phần đánh giá; đã xóa cột Remaining Estimate và Estimate Notes theo yêu cầu bổ sung, không tự tạo lại hai cột này. Ước lượng còn lại/cơ sở trong tài liệu cục bộ vẫn là dữ liệu tham chiếu.
- **94 task Sprint 2 theo kế hoạch** nhận lịch mới chậm nhất 05/11; ngày của task còn lại giữ nguyên. Sprint Review 06/11; tên view đã làm rõ hai mốc, filter không đổi.
- Giữ nguyên 37 DONE, 147 TO DO, PIC, record ID, dependency và nhóm sprint. Theo yêu cầu bổ sung, đã **gỡ 184 attachment cũ khỏi các task**, chỉ giữ **184 file `ID-estimate-2026-11-01.md`**, mỗi task một file mới nhất. Nội dung 184 file mới đã được tải lại đối chiếu; sau dọn đã đọc lại đủ 184 record và xác nhận không đổi dữ liệu ngoài phạm vi.
- **Phân nhóm trực tiếp trên Lark khác bảng kế hoạch lịch sử:** 37 SPRINT 1, 96 SPRINT 2, 26 CustomerAdmin, 25 chưa gán sprint. Có 28 thay đổi nhóm được giữ, gồm UI-22/UI-45 đã vào SPRINT 2. Vì vậy view được chỉ định có **96 record**, không phải 94; hai task này giữ ngày lịch sử theo yêu cầu không reset tiến độ. Các tổng theo sprint trong tài liệu vẫn phản ánh nhóm kế hoạch 30/10, không ghi đè phân nhóm người dùng.
- [Báo cáo đồng bộ](../architechture/plans/LARK-SYNC-2026-11-01.json) ghi kết quả và 28 nhóm khác snapshot; [bản sao trước đồng bộ](../architechture/plans/LARK-BEFORE-ESTIMATES-2026-11-01.json) giữ dữ liệu đối chiếu. App Secret/access token không được lưu vào file.
- Ước lượng vẫn sơ bộ, cảnh báo 738 giờ Sprint 2 theo phạm vi kế hoạch vẫn giữ; đồng bộ dữ liệu không chứng nhận deadline khả thi hoặc chức năng đã được kiểm thử. Không chạy test/lint/typecheck/build, Docker/backend hay kiểm thử trình duyệt.

## Lịch sử đối chiếu Lark ngày 30/10/2026

Các kết quả dưới đây được giữ từ lần đồng bộ cũ, **không xác nhận lịch/SP/estimate ngày 01/11 đã được cập nhật trên Lark**.

- Đã đọc lại đủ **184 record**; PIC, sprint, ngày giờ, dependency và trạng thái khớp kế hoạch.
- Cả **37 task DONE** được giữ; không tạo lại record DONE.
- Trường PIC được cấu hình chỉ chọn một người; Sprint chỉ còn hai option.
- View BACKLOG có 184 record; view Sprint 1 có 65; view Sprint 2 có 94; view Sprint 3 đã bỏ.
- Đã tải lại **184 file task detail đính kèm** và so sánh nội dung với bản chuẩn bị: tất cả khớp.
- Không chạy test/lint/typecheck/build, không bật Docker/backend và không kiểm thử frontend Clucky. Đây là đối chiếu dữ liệu backlog, không phải chứng nhận chức năng ứng dụng.

## Lưu ý khi dọn thư mục

Có thể xóa thư mục `architechture/verification` mà vẫn giữ được backlog tổng hợp trong file này và task detail trong `architechture/tasks/`. File này không chứa bản sao nhị phân của attachment cũ hoặc lịch sử Lark; xóa bản ZIP trong thư mục đó sẽ bỏ bản sao khôi phục cục bộ trước khi gộp.
