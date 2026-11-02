# Rà soát dependency Sprint 2 — 02/11/2026

## 1. Kết luận và nguồn đối chiếu

**Có, vẫn còn nhiều dependency nghiệp vụ. Xây base không đồng nghĩa tất cả task còn lại độc lập.** Base giúp mọi người có cấu trúc và công cụ để viết code; API thật, sự kiện thật và nghiệm thu liên service vẫn cần bàn giao.

Phạm vi rà soát: mã nguồn local trên `main`, HEAD `865a561`, bao gồm thay đổi chưa commit; đọc chi tiết task, dependency và scope, không chỉ lấy cột trạng thái.

- Kế hoạch lịch sử 30/10 có **94 task Sprint 2**. Lần đồng bộ Lark được lưu ngày 01/11 có **96 task trong nhóm SPRINT 2**, do bổ sung `UI-22`, `UI-45`; không phải tự thêm task mới. Phân tích này bao phủ cả 96 task.
- Cơ cấu: **43 BE + 37 INT + 12 TEST + 2 DEP + 2 UI**. Trạng thái trong snapshot của cả 96 là TO DO, không đại diện cho tiến độ vừa được xác nhận hôm nay.
- Dependency lấy từ phần `Dependency và phối hợp` của từng file hiện hành. Riêng `BE-43`, `INT-48` đã thay đổi theo quyết định tách Audit Service ngày 02/11, không dùng các cạnh audit cũ trong JSON 30/10.
- Đồ thị khai báo có **236 cạnh dependency trực tiếp** đi ra từ 96 task; không phát hiện chu trình hoặc tham chiếu ID không tồn tại trong tập 184 task. Đây là kiểm tra quan hệ trong tài liệu, không phải bằng chứng hệ thống chạy được.
- **Giả sử 20 task base được bàn giao/kiểm chứng**, có **18 task chỉ phụ thuộc base hoặc task DONE trong snapshot**, và **78 task còn ít nhất một đầu vào nghiệp vụ khác**. 18 là nhóm có thể bắt đầu phần triển khai, không phải 18 task đã đủ điều kiện nghiệm thu trọn vẹn.
- Sau giả định trên, **32 task có dependency trực tiếp khác PIC**; tính cả đường phụ thuộc gián tiếp là **51 task**. Không nên kết luận “không phụ thuộc người khác” chỉ vì dependency trực tiếp cùng PIC.
- Không có ancestor thuộc nhóm BACKLOG trong đồ thị khai báo của Sprint 2. Các điểm thiếu được nêu ở mục 5 không phải lý do tự kéo toàn bộ Phase 2 vào sprint.

Nguồn: [backlog](../backlog.md), [snapshot kế hoạch](../../architechture/plans/BACKLOG-REPLAN-2026-10-30.json), [lần đồng bộ Lark đã lưu](../../architechture/plans/LARK-SYNC-2026-11-01.json), [task detail](../../architechture/tasks/README.md). **Chưa đọc lại trạng thái trực tiếp trên Lark trong lần rà soát này; không suy diễn ai đã hoặc chưa làm trên nhánh riêng.**

## 2. Base hiện có giải quyết đến đâu?

20 task được xét là base: `BE-01…08`, `BE-09`, `BE-10`, `BE-11`, `BE-12`, `BE-13`, `BE-15`, `BE-50`, `BE-51`, `BE-52`, `BE-57`, `BE-59`, `BE-68`.

| Phần | Bằng chứng đọc từ code | Điều chưa thể kết luận |
| --- | --- | --- |
| Dữ liệu 8 service | Có 39 entity và 39 repository, mapper, DTO, migration V2 trong 8 service | Chưa chạy migration/DB/build; không xác nhận nghiệm thu schema chỉ bằng số file |
| Security/error/config | Có JWT resource-server, kiểm tra claim, advice, danh mục lỗi chung, Kafka/Redis/OpenAPI/correlation và Config Server | JWT validation không phải API login phát token; config Kafka không phải producer/consumer nghiệp vụ |
| Payment/Promotion/Notification | Có các DTO nền, enum và template service/controller | Controller mẫu chưa có HTTP mapping; service mẫu ném `NOT_IMPLEMENTED` |
| Mail/Media | Có cấu hình Mail Sender, `EmailMessage`, cấu hình Cloudinary | Chưa có adapter gửi mail/upload nghiệp vụ trong service layer; chưa xác minh credential hoặc kết nối thật |
| Audit riêng | Task/schema thiết kế đã tách Audit Service | Chưa có module `backend/audit-service`; chưa có include Gradle, route Gateway hoặc service Compose cho audit |
| Frontend | Có UI, i18n và regression frontend của lần trước | Order phía customer/admin vẫn dùng mock/localStorage; test frontend giả lập API không chứng minh INT/E2E backend đã xong |

Đối chiếu bằng chứng:

- [Payment service mẫu](../../backend/payment-service/src/main/java/com/clucky/paymentservice/service/PaymentServiceTemplate.java#L8), [controller mẫu](../../backend/payment-service/src/main/java/com/clucky/paymentservice/controller/PaymentControllerTemplate.java#L7).
- Quét mã Java nguồn của backend không tìm thấy controller nghiệp vụ có `@RestController`/HTTP mapping hoặc consumer `@KafkaListener`; `@RestControllerAdvice` là exception handler, không tính là API nghiệp vụ.
- [Kafka base](../../backend/cart-order-service/src/main/java/com/clucky/cartorderservice/config/KafkaConfig.java#L16) vẫn yêu cầu bổ sung durable DLQ handler; [DomainEvent](../../backend/cart-order-service/src/main/java/com/clucky/cartorderservice/dto/DomainEvent.java#L10) mới là envelope với `JsonNode payload`.
- [Mail config](../../backend/notification-service/src/main/java/com/clucky/notificationservice/config/MailSenderConfig.java#L1), [module Gradle](../../backend/settings.gradle#L1), [route Gateway](../../config-repo/api-gateway.yml#L1).
- [Order customer](../../frontend/nextjs/components/order/order-provider.tsx#L22), [Order admin](../../frontend/react/src/context/OrderContext.tsx#L14).

**Không đổi base thành DONE hoặc coi 78 task là BLOCKED trên Lark từ báo cáo này.** Đây là mức sẵn sàng theo source/dependency, không cập nhật trạng thái làm việc.

## 3. Ai có thể bắt đầu phần nào sau khi nhận base?

| PIC | Số task trong nhóm Sprint 2 | Có thể bắt đầu theo dependency khai báo |
| --- | ---: | --- |
| M1 — Khánh | 11 | [BE-18](../../architechture/tasks/BE-18.md), [BE-19](../../architechture/tasks/BE-19.md) |
| M2 — Nhật | 16 | [BE-21](../../architechture/tasks/BE-21.md), [BE-71](../../architechture/tasks/BE-71.md) |
| M3 — Anh | 11 | — |
| M4 — Thịnh | 23 | [BE-29](../../architechture/tasks/BE-29.md), [BE-32](../../architechture/tasks/BE-32.md), [BE-33](../../architechture/tasks/BE-33.md), [BE-75](../../architechture/tasks/BE-75.md) |
| M5 — Thành | 19 | [BE-34](../../architechture/tasks/BE-34.md), [BE-37](../../architechture/tasks/BE-37.md), [BE-38](../../architechture/tasks/BE-38.md), [BE-58](../../architechture/tasks/BE-58.md), [BE-61](../../architechture/tasks/BE-61.md), [BE-62](../../architechture/tasks/BE-62.md), [UI-22](../../architechture/tasks/UI-22.md), [UI-45](../../architechture/tasks/UI-45.md) |
| M6 — Việt | 16 | [BE-43](../../architechture/tasks/BE-43.md), [INT-46](../../architechture/tasks/INT-46.md) |

**Các điều kiện quan trọng của bảng này:**

- M3 không có task Sprint 2 thuộc nhóm 18, nhưng **có thể làm ngay `BE-23` — Cart Redis** đang ở nhóm `CustomerAdmin`, rồi phần Order dựa trên contract/fixture. Điều này không có nghĩa M3 phải ngồi chờ toàn bộ nhóm.
- M2 cần ưu tiên thêm **`BE-20` — Catalog public** trong `CustomerAdmin`; mapping entity `BE-02` không thay cho API này.
- `BE-32` bắt đầu confirm/bank config; phần audit/refund hoàn chỉnh vẫn cần bàn giao tương ứng. `BE-33` bắt đầu calculate-fee và query contract; shipment có dữ liệu thật phải chờ `INT-43`. `BE-75` bắt đầu DTO/rà policy; nghiệm thu không lộ secret cần adapter/upload API thật.
- `BE-43` có thể xây ngay Audit Service riêng; không phải đã nằm sẵn trong 20 task base cho 8 service.
- `INT-46` có thể chốt và viết policy/handler nền ngay; nghiệm thu áp dụng/replay toàn bộ consumer cần các consumer thực tế.
- Có thể viết UI, test case, adapter với fixture theo contract trước. Không dùng fixture để đánh DONE các task đòi API thật, gửi mail thật hoặc dữ liệu cross-service.

### Bốn đầu vào ngoài Sprint 2 cần theo dõi riêng

| Task ngoài nhóm Sprint 2 | PIC | Nhóm ở lần sync đã lưu | Vì sao không được bỏ quên |
| --- | --- | --- | --- |
| `BE-20` Catalog public | M2 | CustomerAdmin | Chặn trực tiếp `BE-25`, `BE-54`, `INT-06`, `INT-54`; ảnh hưởng 41 task Sprint 2 theo đường phụ thuộc đã khai báo |
| `BE-23` Cart Redis | M3 | CustomerAdmin | Chặn `BE-24`; ảnh hưởng 39 task Sprint 2 theo đường phụ thuộc đã khai báo |
| `UI-28` Admin voucher | M5 | CustomerAdmin | `INT-62` cần màn voucher thường; không kéo phần banner/approve Phase 2 vào đây |
| `UI-32` Notification UI | M5 | CustomerAdmin | `INT-11` cần list/read/read-all ở UI; nút thông báo hiện tại không thay thế màn tích hợp |

## 4. Các chuỗi bàn giao chính

Mũi tên ở đây có nghĩa **đầu ra bên trái cần cho phần tích hợp/nghiệm thu bên phải**, không bắt buộc đợi bên trái DONE mới được viết bất kỳ dòng code nào.

| Luồng | Đầu ra cần bàn giao theo thứ tự | Giao giữa PIC |
| --- | --- | --- |
| Auth + OTP | `BE-58 → BE-60`; `BE-61 → BE-64`; SMTP/template → `BE-16/17 → INT-53/69 → INT-05 → TEST-01` | M5 → M1 → M3 |
| Preview/checkout | `BE-23 + BE-34 + BE-37 + BE-33 → BE-24`; `BE-24 + BE-20 + BE-29 → BE-25 → INT-07` | M2/M4/M5 → M3; thêm Gateway/auth từ M1 |
| Chuyển khoản | `BE-29 → BE-30 → BE-45`; `BE-30 + BE-32 → INT-40`; producer/Order handler → `INT-09` | M4 ↔ M3; Gateway/security từ M1 |
| COD | `BE-32 + BE-25 → INT-51 → INT-09/TEST-01` | M4 ↔ M3 |
| Refund/timeout | `BE-25 → BE-26`; `BE-32 + BE-26 → BE-46`; `BE-46 + BE-39 + INT-40 → INT-52`; `INT-50 + INT-52 + BE-44 → INT-64` | M3 + M4 + M5 |
| Event consumers | `BE-25 → INT-39`; `BE-30/32 → INT-40`; producer → `INT-43/44/45/47` và `BE-39` | M3/M4 → M4/M5/M6 |
| Email nghiệp vụ | `BE-58/60 + BE-62/66 + BE-61/65 + INT-39/40 → BE-39 → TEST-22/23` | M3/M4 cung cấp event, M5 xử lý gửi; M6 phụ trách DLQ/observability |
| Report | `INT-39 + INT-40 → INT-45 → BE-42 → INT-13 → TEST-05` | M3/M4 → M6 |
| Audit | `BE-43 + BE-11` làm nền; producer từng domain → `INT-48` → kiểm chứng coverage/quyền/query | M6 làm nền/consumer; M1–M5 bàn giao producer domain của mình |
| Media | `BE-68 + BE-09 → BE-71 → BE-70 → BE-72`; `INT-72 + BE-72 → INT-73 → TEST-25`; cleanup `BE-74` | M2 chủ trì, M4 phối hợp `BE-75` |
| Google login | `BE-17 + base JWT/Redis/Identity → BE-76 → INT-74` | M1 → M4; cần cấu hình Firebase hợp lệ |
| Chốt demo | `INT-05/06/07/51 → TEST-01`; `INT-61/13 → TEST-05`; `INT-15/62 → TEST-06`; `INT-67 → TEST-07`; bốn test → `DEP-10` | Toàn nhóm → M1; collection `DEP-09` do M6 tổng hợp |

Không coi cùng deadline là đã không còn dependency. Ví dụ `BE-29` ảnh hưởng trực tiếp 4 task và gián tiếp tổng cộng 45 task Sprint 2; đây là độ lan truyền của đồ thị, không phải số task riêng của M4 hoặc ước lượng thời gian.

## 5. Dependency/điều kiện bàn giao chưa ghi đủ

Các dòng dưới là phát hiện và đề xuất ghi rõ checklist/dependency, **chưa tự sửa backlog, PIC hoặc scope**.

| Điểm | Hiện trạng/thiếu sót | Cách chốt để không chờ mơ hồ |
| --- | --- | --- |
| `BE-39` / `TEST-22` và template `BE-65` | Task email cần template order/payment/refund, nhưng `BE-65` không nằm trong dependency chain khai báo của `BE-39` hoặc `TEST-22` | Ghi rõ `BE-65` là đầu vào gửi email nghiệp vụ; M5 bàn giao template ID và variables cùng event fixture |
| `BE-67` và `INT-46` | Scope `BE-67` nói dùng chính sách `INT-46`, nhưng danh sách dependency chỉ có `BE-66`, `BE-11` | Bổ sung handoff `INT-46 → BE-67`; dùng chung quyết định retry/DLQ, không mặc định KafkaConfig đã làm xong DLQ |
| UI chưa đủ cho tích hợp | `INT-62` chỉ khai báo `BE-34`; `INT-11` chỉ khai báo `BE-38/39`; UI tương ứng `UI-28/32` còn ngoài Sprint 2 | Theo dõi thêm phần UI voucher thường và notification list; `UI-22/45` cũng cần bàn giao cho trải nghiệm voucher/loyalty, không chỉ API |
| Internal API và webhook security | Service và Gateway đang chủ động `denyAll` với `/internal/**`, `/api/payments/webhook/**` | Cần M1 cùng owner domain chốt xác thực S2S/claims và các route cụ thể trước tích hợp. `BE-30/INT-49` phải có ingress webhook cùng xác thực đúng contract. **Không đổi toàn bộ sang `permitAll` để bỏ chặn.** |
| `BE-44` kiểm tra owner/store | DTO tạo payment hiện chỉ có orderId/orderCode/amount/method; entity Payment không chứa customerId/storeId. `BE-44` lại chỉ liệt kê `BE-29`, `BE-09` | M3/M4 bàn giao contract Order ownership/store đáng tin cậy trước nghiệm thu `BE-44` và `INT-67`: truy vấn nội bộ có auth hoặc snapshot đáng tin cậy theo thiết kế được chốt; không join DB và không tin ID frontend |
| `payment.confirmed → Order CONFIRMED` | Scope `BE-30` yêu cầu Order đổi trạng thái, nhưng `INT-40` chỉ là producer; `INT-47` mô tả nhánh failed, không thay cho handler confirmed | Ghi rõ owner Order triển khai handler confirmed/idempotency dưới checklist Order/payment integration; M4 phát event. `INT-09` chỉ đạt khi Order thật đổi trạng thái, không chỉ payment PAID |
| Audit toàn admin | `INT-48` chỉ liệt kê `BE-11`, `BE-43`, nhưng scope yêu cầu producer của mọi domain; `BE-32/45/41` cũng yêu cầu audit trong nghiệm thu | Handoff thêm từ user/store/catalog/inventory/order/payment/refund/voucher/loyalty/shipping-config/review mutations. M6 không thể hoàn tất bằng một consumer đơn lẻ. Chốt event contract và cơ chế phát bền vững sau commit trước khi các owner gắn producer |
| Event mới chỉ có envelope | `DomainEvent` có metadata và `JsonNode payload`, chưa có event-specific schema đầy đủ trong code | `INT-39/40` phải bàn giao field, state, key, version/compatibility và ví dụ cho shipping/loyalty/report/notification/audit. Consumer có thể triển khai với fixture đã chốt trước khi producer chạy thật |
| Shipping fee contract | `BE-33/48` có tính phí; DTO hiện có là response shipment/config, chưa có request/response calculate-fee rõ trong code | M4/M3 chốt input/output/rounding/pickup/store override/nguồn distance trước phần preview `BE-24`; không tự thêm bản đồ/GPS ngoài docs |
| Media secrecy `BE-75` | Dependency hiện chỉ `BE-10`, nhưng scope gộp kiểm tra frontend/API/log của upload | Phần DTO có thể làm ngay; nghiệm thu kiểm tra secret phải có các đầu ra thực tế `BE-70/72/INT-73`, phối hợp M2 |
| External configuration | SMTP App Password, Firebase project/provider/server credential, Cloudinary, thông tin ngân hàng/webhook là điều kiện chạy thật | Có thể viết code với fixture; người phụ trách cần xác nhận config an toàn và môi trường đủ điều kiện trước nghiệm thu. Lần này không đọc secret hoặc kết luận credential đã thiếu/hỏng |

Bằng chứng cụ thể: [service security](../../backend/payment-service/src/main/java/com/clucky/paymentservice/config/SecurityConfig.java#L80), [Gateway security](../../backend/api-gateway/src/main/java/com/clucky/apigateway/config/SecurityConfig.java#L66), [payment init DTO](../../backend/payment-service/src/main/java/com/clucky/paymentservice/dto/PaymentInitializationRequest.java#L11), [Payment entity](../../backend/payment-service/src/main/java/com/clucky/paymentservice/entity/Payment.java#L10), [UI admin routes](../../frontend/react/src/App.tsx#L1), [notification button](../../frontend/react/src/layouts/AdminLayout.tsx#L492).

### Tránh tạo vòng chờ giả khi sửa dependency

- **Shipping:** phần fee của `BE-33` phải bàn giao trước `BE-24/25`; phần đọc shipment với dữ liệu thật kiểm chứng sau `INT-43`. Nếu buộc toàn bộ `BE-33` đợi `INT-43`, sẽ tạo vòng `BE-33 → BE-24 → BE-25 → INT-39 → INT-43 → BE-33` về mặt nghiệm thu.
- **Payment/refund:** phần API nền của `BE-32` đi trước `BE-46`; không thêm cạnh ngược “BE-32 phải đợi BE-46 hoàn tất toàn bộ” chỉ vì cùng nhắc refund. Tách mốc bàn giao trong checklist hiện tại.
- **Audit:** giữ `BE-43 → INT-48` như bản task mới; không phục hồi dependency ngược `BE-43 → INT-48` theo cách “BE-43 phụ thuộc INT-48” trong manifest cũ. Base/schema/query có thể làm trước, coverage producer/consumer kiểm chứng sau.

## 6. Riêng M4 — Lê Phú Thịnh

M4 có **23 task trong nhóm Sprint 2**; các task base M4 nhận làm giúp nhóm không được tự chuyển PIC vào M4 trong backlog.

- **Bắt đầu ngay sau base:** `BE-29`, `BE-32` phần nền, `BE-33` phần fee, `BE-75` phần DTO.
- **Chuỗi chủ yếu tự nối trong M4:** `BE-29 → BE-30 → BE-45`; `BE-29 → BE-44` nhưng phải chốt Order ownership; `BE-33 → BE-48`; `BE-30/33 → BE-49`; `BE-30/32 → INT-40`; `BE-30/45 → INT-49`; `BE-32/45 → INT-63`.
- **Cần bàn giao từ M3:** `BE-25` cho COD `INT-51`; `BE-26` cho refund `BE-46/INT-52` và timeout `INT-50`; `INT-39` cho shipment `INT-43`, rồi `INT-65/TEST-12`. Handler confirmed/ownership Order cần M3 phối hợp như mục 5.
- **Cần bàn giao từ M5:** `BE-39` cho `INT-50/52`, kéo theo `INT-64` trạng thái payment UI.
- **Cần bàn giao từ M1:** `BE-17` cho Google `BE-76`, rồi `INT-74`; route/security contract cho webhook và internal call.
- **Cần bàn giao từ M6:** audit contract/base/policy cho những thao tác manual-confirm/refund/config bắt buộc có audit; đây là handoff nghiệm thu còn thiếu trong cột dependency, không có nghĩa M4 không được viết service trước.

Muốn giúp nhóm hết chờ M4 sớm nhất: chốt/bàn giao **fee contract `BE-33`, payment-init contract + implementation `BE-29`, webhook/event contract `BE-30/INT-40`**; không cần đợi mọi màn payment/admin hoàn thiện mới cho M3/M5/M6 tích hợp.

## 7. Thứ tự xử lý để giảm chờ

1. **Chốt phần giao nhau trước:** internal auth + ownership Order; calculate-fee; payment-init; payload event Order/Payment/Audit; template ID/variables; retry/DLQ. Không cần tạo thêm service hay shared module mới cho việc chốt contract.
2. **Làm song song các đầu vào mở đường:** M1 profile/staff và phần login JWT; M2 `BE-20/21/71`; M3 `BE-23`; M4 `BE-29/32/33`; M5 `BE-34/37/38/58/60/61/62/64/65`; M6 `BE-43/INT-46`. Các task trong một nhánh vẫn phải tôn trọng dependency nội bộ; đây không phải tuyên bố tất cả đồng thời ready.
3. **Bàn giao từng endpoint/sự kiện:** không chờ trọn domain; mở preview/create-order, auth Gateway, producer/consumer, rồi nối UI với dữ liệu thật.
4. **Đóng từng luồng và ghi evidence:** SePay/COD/refund/email/report/audit/media/RBAC, sau đó TEST và demo. Không đổi task thành DONE từ việc có file mẫu hoặc UI mock.

## 8. Bảng dependency đầy đủ của 96 task

- Cột “Dependency khai báo” lấy từ task detail mới nhất trong checkout, không bổ sung suy luận vào số đếm.
- Cột “Đầu vào nghiệp vụ còn lại” bỏ 20 task base và task DONE trong snapshot để nhìn phần còn phải bàn giao. Dấu **—** chỉ có nghĩa không còn cạnh loại này, không có nghĩa task đã hoàn tất hoặc đủ điều kiện nghiệm thu; xem ngoại lệ mục 5.
- `BE-20`, `BE-23` xuất hiện trong cột chờ dù ở `CustomerAdmin`, vì không thuộc 20 task base và hiện không có implementation API trong checkout.
- Mã task liên kết tới phạm vi/tiêu chí nghiệm thu; PIC giữ nguyên snapshot. Không dùng tên người để suy luận tiến độ trên nhánh khác.

### Backend — 43 task

| Task / phạm vi | PIC | Dependency khai báo | Đầu vào nghiệp vụ còn lại |
| --- | --- | --- | --- |
| [BE-16](../../architechture/tasks/BE-16.md) — Auth: register + OTP + verify | M1 — Khánh | [BE-01](../../architechture/tasks/BE-01.md), [BE-09](../../architechture/tasks/BE-09.md), [BE-59](../../architechture/tasks/BE-59.md), [BE-64](../../architechture/tasks/BE-64.md), [BE-60](../../architechture/tasks/BE-60.md) | [BE-64](../../architechture/tasks/BE-64.md), [BE-60](../../architechture/tasks/BE-60.md) |
| [BE-17](../../architechture/tasks/BE-17.md) — Auth: login + JWT + refresh + logout + forgot/reset | M1 — Khánh | [BE-01](../../architechture/tasks/BE-01.md), [BE-09](../../architechture/tasks/BE-09.md), [BE-60](../../architechture/tasks/BE-60.md), [BE-64](../../architechture/tasks/BE-64.md) | [BE-60](../../architechture/tasks/BE-60.md), [BE-64](../../architechture/tasks/BE-64.md) |
| [BE-18](../../architechture/tasks/BE-18.md) — User: profile + address book CRUD | M1 — Khánh | [BE-01](../../architechture/tasks/BE-01.md), [BE-09](../../architechture/tasks/BE-09.md) | — |
| [BE-19](../../architechture/tasks/BE-19.md) — User admin: create staff, lock/unlock, assign-store, schedules | M1 — Khánh | [BE-01](../../architechture/tasks/BE-01.md), [BE-09](../../architechture/tasks/BE-09.md) | — |
| [BE-21](../../architechture/tasks/BE-21.md) — Catalog admin: CRUD stores/categories/products/combos/toppings | M2 — Nhật | [BE-02](../../architechture/tasks/BE-02.md), [BE-09](../../architechture/tasks/BE-09.md), [BE-10](../../architechture/tasks/BE-10.md) | — |
| [BE-22](../../architechture/tasks/BE-22.md) — Availability toggle + inventory | M2 — Nhật | [BE-21](../../architechture/tasks/BE-21.md) | [BE-21](../../architechture/tasks/BE-21.md) |
| [BE-24](../../architechture/tasks/BE-24.md) — Order preview: giá, voucher/điểm và phí ship qua contract nội bộ | M3 — Anh | [BE-23](../../architechture/tasks/BE-23.md), [BE-34](../../architechture/tasks/BE-34.md), [BE-33](../../architechture/tasks/BE-33.md), [BE-37](../../architechture/tasks/BE-37.md) | [BE-23](../../architechture/tasks/BE-23.md), [BE-34](../../architechture/tasks/BE-34.md), [BE-33](../../architechture/tasks/BE-33.md), [BE-37](../../architechture/tasks/BE-37.md) |
| [BE-25](../../architechture/tasks/BE-25.md) — Tạo đơn: kiểm tra giá/availability, khởi tạo payment, trạng thái và optimistic locking | M3 — Anh | [BE-24](../../architechture/tasks/BE-24.md), [BE-20](../../architechture/tasks/BE-20.md), [BE-29](../../architechture/tasks/BE-29.md), [BE-09](../../architechture/tasks/BE-09.md) | [BE-24](../../architechture/tasks/BE-24.md), [BE-20](../../architechture/tasks/BE-20.md), [BE-29](../../architechture/tasks/BE-29.md) |
| [BE-26](../../architechture/tasks/BE-26.md) — Order cancel + reject + refund-request | M3 — Anh | [BE-25](../../architechture/tasks/BE-25.md) | [BE-25](../../architechture/tasks/BE-25.md) |
| [BE-27](../../architechture/tasks/BE-27.md) — Order list my/admin (storeId filter) + detail + reorder | M3 — Anh | [BE-25](../../architechture/tasks/BE-25.md) | [BE-25](../../architechture/tasks/BE-25.md) |
| [BE-29](../../architechture/tasks/BE-29.md) — Payment: tạo bank-transfer + QR VietQR (PENDING, expires) | M4 — Thịnh | [BE-04](../../architechture/tasks/BE-04.md), [BE-50](../../architechture/tasks/BE-50.md) | — |
| [BE-30](../../architechture/tasks/BE-30.md) — Payment: webhook SePay (raw-body signature, match code+amount, idempotent) | M4 — Thịnh | [BE-29](../../architechture/tasks/BE-29.md) | [BE-29](../../architechture/tasks/BE-29.md) |
| [BE-32](../../architechture/tasks/BE-32.md) — Payment: confirm-manual, confirm-cod, refund, transactions, bank-config | M4 — Thịnh | [BE-04](../../architechture/tasks/BE-04.md), [BE-09](../../architechture/tasks/BE-09.md) | — |
| [BE-33](../../architechture/tasks/BE-33.md) — Shipping MVP: tính phí, cấu hình phí và chi tiết shipment CREATED | M4 — Thịnh | [BE-06](../../architechture/tasks/BE-06.md) | — |
| [BE-34](../../architechture/tasks/BE-34.md) — Promotion: voucher validate + CRUD + scope ALL/STORE | M5 — Thành | [BE-05](../../architechture/tasks/BE-05.md), [BE-51](../../architechture/tasks/BE-51.md) | — |
| [BE-37](../../architechture/tasks/BE-37.md) — Loyalty: points, tier, earn/redeem, config | M5 — Thành | [BE-05](../../architechture/tasks/BE-05.md), [BE-51](../../architechture/tasks/BE-51.md) | — |
| [BE-38](../../architechture/tasks/BE-38.md) — Notification: my notifications, read, read-all | M5 — Thành | [BE-07](../../architechture/tasks/BE-07.md), [BE-52](../../architechture/tasks/BE-52.md), [BE-09](../../architechture/tasks/BE-09.md) | — |
| [BE-39](../../architechture/tasks/BE-39.md) — Notification consumer: in-app/email orchestration, idempotency và Kafka replay protection | M5 — Thành | [BE-11](../../architechture/tasks/BE-11.md), [BE-38](../../architechture/tasks/BE-38.md), [BE-62](../../architechture/tasks/BE-62.md), [BE-66](../../architechture/tasks/BE-66.md), [INT-39](../../architechture/tasks/INT-39.md), [INT-40](../../architechture/tasks/INT-40.md) | [BE-38](../../architechture/tasks/BE-38.md), [BE-62](../../architechture/tasks/BE-62.md), [BE-66](../../architechture/tasks/BE-66.md), [INT-39](../../architechture/tasks/INT-39.md), [INT-40](../../architechture/tasks/INT-40.md) |
| [BE-40](../../architechture/tasks/BE-40.md) — Review: create/edit/delete own + product reviews | M6 — Việt | [BE-08](../../architechture/tasks/BE-08.md), [BE-09](../../architechture/tasks/BE-09.md), [BE-25](../../architechture/tasks/BE-25.md) | [BE-25](../../architechture/tasks/BE-25.md) |
| [BE-41](../../architechture/tasks/BE-41.md) — Review: replies + hide | M6 — Việt | [BE-40](../../architechture/tasks/BE-40.md) | [BE-40](../../architechture/tasks/BE-40.md) |
| [BE-42](../../architechture/tasks/BE-42.md) — Report: dashboard per role + revenue + export Excel/PDF | M6 — Việt | [BE-08](../../architechture/tasks/BE-08.md), [BE-09](../../architechture/tasks/BE-09.md), [INT-45](../../architechture/tasks/INT-45.md) | [INT-45](../../architechture/tasks/INT-45.md) |
| [BE-43](../../architechture/tasks/BE-43.md) — Audit Service: base, schema và API nhật ký quản trị | M6 — Việt | [UI-03](../../architechture/tasks/UI-03.md), [UI-06](../../architechture/tasks/UI-06.md), [BE-09](../../architechture/tasks/BE-09.md), [BE-10](../../architechture/tasks/BE-10.md) | — |
| [BE-44](../../architechture/tasks/BE-44.md) — Payment status query + ownership: customer chỉ xem payment của order mình | M4 — Thịnh | [BE-29](../../architechture/tasks/BE-29.md), [BE-09](../../architechture/tasks/BE-09.md) | [BE-29](../../architechture/tasks/BE-29.md) |
| [BE-45](../../architechture/tasks/BE-45.md) — Bank transaction reconciliation detail + mismatch workflow | M4 — Thịnh | [BE-30](../../architechture/tasks/BE-30.md) | [BE-30](../../architechture/tasks/BE-30.md) |
| [BE-46](../../architechture/tasks/BE-46.md) — Refund state machine: PENDING → APPROVED/REJECTED → REFUNDED | M4 — Thịnh | [BE-32](../../architechture/tasks/BE-32.md), [BE-26](../../architechture/tasks/BE-26.md) | [BE-32](../../architechture/tasks/BE-32.md), [BE-26](../../architechture/tasks/BE-26.md) |
| [BE-48](../../architechture/tasks/BE-48.md) — Shipping fee rules: base fee, per-km, free threshold, store override | M4 — Thịnh | [BE-33](../../architechture/tasks/BE-33.md) | [BE-33](../../architechture/tasks/BE-33.md) |
| [BE-49](../../architechture/tasks/BE-49.md) — Payment/Shipping OpenAPI examples + webhook payload schemas | M4 — Thịnh | [BE-30](../../architechture/tasks/BE-30.md), [BE-33](../../architechture/tasks/BE-33.md), [BE-13](../../architechture/tasks/BE-13.md) | [BE-30](../../architechture/tasks/BE-30.md), [BE-33](../../architechture/tasks/BE-33.md) |
| [BE-54](../../architechture/tasks/BE-54.md) — Catalog integration hardening: menu cache invalidation and store availability contract | M2 — Nhật | [BE-20](../../architechture/tasks/BE-20.md), [BE-22](../../architechture/tasks/BE-22.md), [BE-12](../../architechture/tasks/BE-12.md) | [BE-20](../../architechture/tasks/BE-20.md), [BE-22](../../architechture/tasks/BE-22.md) |
| [BE-58](../../architechture/tasks/BE-58.md) — Mail Sender interface + Gmail SMTP adapter boundary | M5 — Thành | [BE-57](../../architechture/tasks/BE-57.md), [BE-59](../../architechture/tasks/BE-59.md) | — |
| [BE-60](../../architechture/tasks/BE-60.md) — Gmail SMTP connection with STARTTLS and timeout | M5 — Thành | [BE-57](../../architechture/tasks/BE-57.md), [BE-58](../../architechture/tasks/BE-58.md) | [BE-58](../../architechture/tasks/BE-58.md) |
| [BE-61](../../architechture/tasks/BE-61.md) — Email template renderer for transactional templates | M5 — Thành | [BE-59](../../architechture/tasks/BE-59.md) | — |
| [BE-62](../../architechture/tasks/BE-62.md) — Email log/status persistence and idempotency by eventId/messageId | M5 — Thành | [BE-07](../../architechture/tasks/BE-07.md), [BE-59](../../architechture/tasks/BE-59.md) | — |
| [BE-63](../../architechture/tasks/BE-63.md) — Admin email-log API with recipient/status/template/date filters | M6 — Việt | [BE-62](../../architechture/tasks/BE-62.md), [BE-09](../../architechture/tasks/BE-09.md) | [BE-62](../../architechture/tasks/BE-62.md) |
| [BE-64](../../architechture/tasks/BE-64.md) — OTP email templates: register, verify, forgot/reset password | M5 — Thành | [BE-61](../../architechture/tasks/BE-61.md) | [BE-61](../../architechture/tasks/BE-61.md) |
| [BE-65](../../architechture/tasks/BE-65.md) — Order/payment/refund email templates | M5 — Thành | [BE-61](../../architechture/tasks/BE-61.md), [BE-59](../../architechture/tasks/BE-59.md) | [BE-61](../../architechture/tasks/BE-61.md) |
| [BE-66](../../architechture/tasks/BE-66.md) — Mail retry/backoff policy and FAILED state handling | M5 — Thành | [BE-60](../../architechture/tasks/BE-60.md), [BE-62](../../architechture/tasks/BE-62.md) | [BE-60](../../architechture/tasks/BE-60.md), [BE-62](../../architechture/tasks/BE-62.md) |
| [BE-67](../../architechture/tasks/BE-67.md) — Email failure event/DLQ and masked error logging | M6 — Việt | [BE-66](../../architechture/tasks/BE-66.md), [BE-11](../../architechture/tasks/BE-11.md) | [BE-66](../../architechture/tasks/BE-66.md) |
| [BE-70](../../architechture/tasks/BE-70.md) — Cloudinary adapter và tích hợp upload ảnh product/combo | M2 — Nhật | [BE-68](../../architechture/tasks/BE-68.md), [BE-71](../../architechture/tasks/BE-71.md) | [BE-71](../../architechture/tasks/BE-71.md) |
| [BE-71](../../architechture/tasks/BE-71.md) — Signed upload/secure backend upload contract and MIME/size validation | M2 — Nhật | [BE-68](../../architechture/tasks/BE-68.md), [BE-09](../../architechture/tasks/BE-09.md) | — |
| [BE-72](../../architechture/tasks/BE-72.md) — Product/combo media API | M2 — Nhật | [BE-70](../../architechture/tasks/BE-70.md), [BE-21](../../architechture/tasks/BE-21.md) | [BE-70](../../architechture/tasks/BE-70.md), [BE-21](../../architechture/tasks/BE-21.md) |
| [BE-74](../../architechture/tasks/BE-74.md) — Cloudinary: xử lý lỗi, idempotency và cleanup asset sau metadata commit | M2 — Nhật | [BE-70](../../architechture/tasks/BE-70.md), [BE-72](../../architechture/tasks/BE-72.md) | [BE-70](../../architechture/tasks/BE-70.md), [BE-72](../../architechture/tasks/BE-72.md) |
| [BE-75](../../architechture/tasks/BE-75.md) — Media response DTO và kiểm tra không lộ secret frontend/API/log | M4 — Thịnh | [BE-10](../../architechture/tasks/BE-10.md) | — |
| [BE-76](../../architechture/tasks/BE-76.md) — Google OAuth qua Firebase: verify ID token, complete-password, JWT và migration bổ sung | M4 — Thịnh | [BE-01](../../architechture/tasks/BE-01.md), [BE-09](../../architechture/tasks/BE-09.md), [BE-17](../../architechture/tasks/BE-17.md), [BE-12](../../architechture/tasks/BE-12.md) | [BE-17](../../architechture/tasks/BE-17.md) |

### Tích hợp — 37 task

| Task / phạm vi | PIC | Dependency khai báo | Đầu vào nghiệp vụ còn lại |
| --- | --- | --- | --- |
| [INT-05](../../architechture/tasks/INT-05.md) — Auth E2E: register → OTP → login → refresh, 2 app | M1 — Khánh | [BE-16](../../architechture/tasks/BE-16.md), [BE-17](../../architechture/tasks/BE-17.md), [INT-53](../../architechture/tasks/INT-53.md), [INT-69](../../architechture/tasks/INT-69.md) | [BE-16](../../architechture/tasks/BE-16.md), [BE-17](../../architechture/tasks/BE-17.md), [INT-53](../../architechture/tasks/INT-53.md), [INT-69](../../architechture/tasks/INT-69.md) |
| [INT-06](../../architechture/tasks/INT-06.md) — Menu/catalog E2E: browse, search, availability theo quán | M2 — Nhật | [BE-20](../../architechture/tasks/BE-20.md), [BE-54](../../architechture/tasks/BE-54.md), [INT-54](../../architechture/tasks/INT-54.md) | [BE-20](../../architechture/tasks/BE-20.md), [BE-54](../../architechture/tasks/BE-54.md), [INT-54](../../architechture/tasks/INT-54.md) |
| [INT-07](../../architechture/tasks/INT-07.md) — Cart → checkout → tạo đơn E2E | M3 — Anh | [BE-25](../../architechture/tasks/BE-25.md), [BE-24](../../architechture/tasks/BE-24.md), [INT-53](../../architechture/tasks/INT-53.md) | [BE-25](../../architechture/tasks/BE-25.md), [BE-24](../../architechture/tasks/BE-24.md), [INT-53](../../architechture/tasks/INT-53.md) |
| [INT-08](../../architechture/tasks/INT-08.md) — Order tracking, history, cancel, reorder E2E | M3 — Anh | [BE-26](../../architechture/tasks/BE-26.md), [BE-27](../../architechture/tasks/BE-27.md), [INT-68](../../architechture/tasks/INT-68.md) | [BE-26](../../architechture/tasks/BE-26.md), [BE-27](../../architechture/tasks/BE-27.md), [INT-68](../../architechture/tasks/INT-68.md) |
| [INT-09](../../architechture/tasks/INT-09.md) — Payment: QR hiển thị, webhook → CONFIRMED, COD confirm | M4 — Thịnh | [BE-30](../../architechture/tasks/BE-30.md), [BE-32](../../architechture/tasks/BE-32.md), [INT-40](../../architechture/tasks/INT-40.md), [INT-51](../../architechture/tasks/INT-51.md) | [BE-30](../../architechture/tasks/BE-30.md), [BE-32](../../architechture/tasks/BE-32.md), [INT-40](../../architechture/tasks/INT-40.md), [INT-51](../../architechture/tasks/INT-51.md) |
| [INT-10](../../architechture/tasks/INT-10.md) — Voucher apply + loyalty points E2E | M5 — Thành | [BE-34](../../architechture/tasks/BE-34.md), [BE-37](../../architechture/tasks/BE-37.md), [INT-44](../../architechture/tasks/INT-44.md), [BE-24](../../architechture/tasks/BE-24.md) | [BE-34](../../architechture/tasks/BE-34.md), [BE-37](../../architechture/tasks/BE-37.md), [INT-44](../../architechture/tasks/INT-44.md), [BE-24](../../architechture/tasks/BE-24.md) |
| [INT-11](../../architechture/tasks/INT-11.md) — Notification list + mark-read E2E | M5 — Thành | [BE-38](../../architechture/tasks/BE-38.md), [BE-39](../../architechture/tasks/BE-39.md) | [BE-38](../../architechture/tasks/BE-38.md), [BE-39](../../architechture/tasks/BE-39.md) |
| [INT-12](../../architechture/tasks/INT-12.md) — Review: viết/sửa/xóa + reply + hide E2E | M6 — Việt | [BE-40](../../architechture/tasks/BE-40.md), [BE-41](../../architechture/tasks/BE-41.md) | [BE-40](../../architechture/tasks/BE-40.md), [BE-41](../../architechture/tasks/BE-41.md) |
| [INT-13](../../architechture/tasks/INT-13.md) — Report/dashboard/export E2E | M6 — Việt | [BE-42](../../architechture/tasks/BE-42.md) | [BE-42](../../architechture/tasks/BE-42.md) |
| [INT-14](../../architechture/tasks/INT-14.md) — Admin orders: status, refund approve E2E | M3 — Anh | [BE-25](../../architechture/tasks/BE-25.md), [BE-26](../../architechture/tasks/BE-26.md), [BE-46](../../architechture/tasks/BE-46.md), [INT-51](../../architechture/tasks/INT-51.md) | [BE-25](../../architechture/tasks/BE-25.md), [BE-26](../../architechture/tasks/BE-26.md), [BE-46](../../architechture/tasks/BE-46.md), [INT-51](../../architechture/tasks/INT-51.md) |
| [INT-15](../../architechture/tasks/INT-15.md) — Admin catalog/store/inventory E2E | M2 — Nhật | [BE-21](../../architechture/tasks/BE-21.md), [BE-22](../../architechture/tasks/BE-22.md) | [BE-21](../../architechture/tasks/BE-21.md), [BE-22](../../architechture/tasks/BE-22.md) |
| [INT-39](../../architechture/tasks/INT-39.md) — Kafka producer: order.created/status-changed/completed/cancelled | M3 — Anh | [BE-25](../../architechture/tasks/BE-25.md), [BE-11](../../architechture/tasks/BE-11.md) | [BE-25](../../architechture/tasks/BE-25.md) |
| [INT-40](../../architechture/tasks/INT-40.md) — Kafka producer: payment.confirmed/failed | M4 — Thịnh | [BE-30](../../architechture/tasks/BE-30.md), [BE-32](../../architechture/tasks/BE-32.md), [BE-11](../../architechture/tasks/BE-11.md) | [BE-30](../../architechture/tasks/BE-30.md), [BE-32](../../architechture/tasks/BE-32.md) |
| [INT-43](../../architechture/tasks/INT-43.md) — Consumer: shipping tạo bản ghi khi order.created | M4 — Thịnh | [INT-39](../../architechture/tasks/INT-39.md), [BE-06](../../architechture/tasks/BE-06.md) | [INT-39](../../architechture/tasks/INT-39.md) |
| [INT-44](../../architechture/tasks/INT-44.md) — Consumer: promotion cộng điểm khi order.completed | M5 — Thành | [INT-39](../../architechture/tasks/INT-39.md), [BE-37](../../architechture/tasks/BE-37.md) | [INT-39](../../architechture/tasks/INT-39.md), [BE-37](../../architechture/tasks/BE-37.md) |
| [INT-45](../../architechture/tasks/INT-45.md) — Consumer: report cập nhật daily_store_stats | M6 — Việt | [INT-39](../../architechture/tasks/INT-39.md), [INT-40](../../architechture/tasks/INT-40.md), [BE-08](../../architechture/tasks/BE-08.md) | [INT-39](../../architechture/tasks/INT-39.md), [INT-40](../../architechture/tasks/INT-40.md) |
| [INT-46](../../architechture/tasks/INT-46.md) — DLQ + retry + idempotent consumer | M6 — Việt | [BE-11](../../architechture/tasks/BE-11.md) | — |
| [INT-47](../../architechture/tasks/INT-47.md) — Saga: payment.failed → cancel order → release voucher/điểm | M3 — Anh | [INT-40](../../architechture/tasks/INT-40.md), [BE-26](../../architechture/tasks/BE-26.md), [BE-34](../../architechture/tasks/BE-34.md), [BE-37](../../architechture/tasks/BE-37.md) | [INT-40](../../architechture/tasks/INT-40.md), [BE-26](../../architechture/tasks/BE-26.md), [BE-34](../../architechture/tasks/BE-34.md), [BE-37](../../architechture/tasks/BE-37.md) |
| [INT-48](../../architechture/tasks/INT-48.md) — Audit Service: producer/consumer cho mọi thay đổi quản trị | M6 — Việt | [BE-11](../../architechture/tasks/BE-11.md), [BE-43](../../architechture/tasks/BE-43.md) | [BE-43](../../architechture/tasks/BE-43.md) |
| [INT-49](../../architechture/tasks/INT-49.md) — SePay webhook test: mock → verify → match → confirm | M4 — Thịnh | [BE-30](../../architechture/tasks/BE-30.md), [BE-45](../../architechture/tasks/BE-45.md) | [BE-30](../../architechture/tasks/BE-30.md), [BE-45](../../architechture/tasks/BE-45.md) |
| [INT-50](../../architechture/tasks/INT-50.md) — Payment timeout: QR expires → order/payment expired → notify customer | M4 — Thịnh | [BE-29](../../architechture/tasks/BE-29.md), [INT-40](../../architechture/tasks/INT-40.md), [BE-39](../../architechture/tasks/BE-39.md), [BE-26](../../architechture/tasks/BE-26.md) | [BE-29](../../architechture/tasks/BE-29.md), [INT-40](../../architechture/tasks/INT-40.md), [BE-39](../../architechture/tasks/BE-39.md), [BE-26](../../architechture/tasks/BE-26.md) |
| [INT-51](../../architechture/tasks/INT-51.md) — COD lifecycle: confirm at branch → collected → completed | M4 — Thịnh | [BE-32](../../architechture/tasks/BE-32.md), [BE-25](../../architechture/tasks/BE-25.md) | [BE-32](../../architechture/tasks/BE-32.md), [BE-25](../../architechture/tasks/BE-25.md) |
| [INT-52](../../architechture/tasks/INT-52.md) — Tích hợp refund: duyệt/từ chối, cập nhật thanh toán, thông báo và nghiệm thu | M4 — Thịnh | [BE-46](../../architechture/tasks/BE-46.md), [BE-26](../../architechture/tasks/BE-26.md), [BE-39](../../architechture/tasks/BE-39.md), [INT-40](../../architechture/tasks/INT-40.md) | [BE-46](../../architechture/tasks/BE-46.md), [BE-26](../../architechture/tasks/BE-26.md), [BE-39](../../architechture/tasks/BE-39.md), [INT-40](../../architechture/tasks/INT-40.md) |
| [INT-53](../../architechture/tasks/INT-53.md) — Identity → Gateway security integration: JWT claims, role, storeId propagation | M1 — Khánh | [BE-09](../../architechture/tasks/BE-09.md), [BE-17](../../architechture/tasks/BE-17.md), [UI-05](../../architechture/tasks/UI-05.md) | [BE-17](../../architechture/tasks/BE-17.md) |
| [INT-54](../../architechture/tasks/INT-54.md) — Catalog → Gateway discovery integration: menu route, cache headers, availability | M2 — Nhật | [BE-20](../../architechture/tasks/BE-20.md), [UI-05](../../architechture/tasks/UI-05.md), [UI-04](../../architechture/tasks/UI-04.md) | [BE-20](../../architechture/tasks/BE-20.md) |
| [INT-60](../../architechture/tasks/INT-60.md) — Email delivery metrics/logging correlation across services | M6 — Việt | [BE-62](../../architechture/tasks/BE-62.md), [BE-67](../../architechture/tasks/BE-67.md), [BE-15](../../architechture/tasks/BE-15.md) | [BE-62](../../architechture/tasks/BE-62.md), [BE-67](../../architechture/tasks/BE-67.md) |
| [INT-61](../../architechture/tasks/INT-61.md) — Admin users: create staff, lock, assign E2E | M1 — Khánh | [BE-19](../../architechture/tasks/BE-19.md) | [BE-19](../../architechture/tasks/BE-19.md) |
| [INT-62](../../architechture/tasks/INT-62.md) — Tích hợp UI quản trị voucher thường (banner và duyệt chi nhánh để backlog) | M5 — Thành | [BE-34](../../architechture/tasks/BE-34.md) | [BE-34](../../architechture/tasks/BE-34.md) |
| [INT-63](../../architechture/tasks/INT-63.md) — Admin payments/bank config E2E | M4 — Thịnh | [BE-32](../../architechture/tasks/BE-32.md), [BE-45](../../architechture/tasks/BE-45.md) | [BE-32](../../architechture/tasks/BE-32.md), [BE-45](../../architechture/tasks/BE-45.md) |
| [INT-64](../../architechture/tasks/INT-64.md) — Payment status UI: pending/paid/expired/mismatch/refund states | M4 — Thịnh | [BE-44](../../architechture/tasks/BE-44.md), [INT-50](../../architechture/tasks/INT-50.md), [INT-52](../../architechture/tasks/INT-52.md) | [BE-44](../../architechture/tasks/BE-44.md), [INT-50](../../architechture/tasks/INT-50.md), [INT-52](../../architechture/tasks/INT-52.md) |
| [INT-65](../../architechture/tasks/INT-65.md) — Shipping fee + shipment info UI integration | M4 — Thịnh | [BE-33](../../architechture/tasks/BE-33.md), [BE-48](../../architechture/tasks/BE-48.md), [INT-43](../../architechture/tasks/INT-43.md) | [BE-33](../../architechture/tasks/BE-33.md), [BE-48](../../architechture/tasks/BE-48.md), [INT-43](../../architechture/tasks/INT-43.md) |
| [INT-67](../../architechture/tasks/INT-67.md) — RBAC E2E: storeId enforcement từng API | M1 — Khánh | [INT-53](../../architechture/tasks/INT-53.md), [BE-19](../../architechture/tasks/BE-19.md), [BE-22](../../architechture/tasks/BE-22.md), [BE-27](../../architechture/tasks/BE-27.md), [BE-44](../../architechture/tasks/BE-44.md) | [INT-53](../../architechture/tasks/INT-53.md), [BE-19](../../architechture/tasks/BE-19.md), [BE-22](../../architechture/tasks/BE-22.md), [BE-27](../../architechture/tasks/BE-27.md), [BE-44](../../architechture/tasks/BE-44.md) |
| [INT-68](../../architechture/tasks/INT-68.md) — Order status realtime (polling) cho customer | M3 — Anh | [BE-27](../../architechture/tasks/BE-27.md) | [BE-27](../../architechture/tasks/BE-27.md) |
| [INT-69](../../architechture/tasks/INT-69.md) — Customer auth UI: email sent/sending/failure states | M1 — Khánh | [BE-16](../../architechture/tasks/BE-16.md), [BE-17](../../architechture/tasks/BE-17.md), [BE-60](../../architechture/tasks/BE-60.md) | [BE-16](../../architechture/tasks/BE-16.md), [BE-17](../../architechture/tasks/BE-17.md), [BE-60](../../architechture/tasks/BE-60.md) |
| [INT-72](../../architechture/tasks/INT-72.md) — Component upload/preview/progress/lỗi dùng chung; áp dụng product/combo | M2 — Nhật | [BE-71](../../architechture/tasks/BE-71.md) | [BE-71](../../architechture/tasks/BE-71.md) |
| [INT-73](../../architechture/tasks/INT-73.md) — Tích hợp UI quản trị ảnh product/combo | M2 — Nhật | [BE-72](../../architechture/tasks/BE-72.md), [INT-72](../../architechture/tasks/INT-72.md) | [BE-72](../../architechture/tasks/BE-72.md), [INT-72](../../architechture/tasks/INT-72.md) |
| [INT-74](../../architechture/tasks/INT-74.md) — Google login E2E: tài khoản cũ/mới, complete-password, token lỗi và email trùng | M4 — Thịnh | [BE-76](../../architechture/tasks/BE-76.md), [UI-49](../../architechture/tasks/UI-49.md) | [BE-76](../../architechture/tasks/BE-76.md) |

### Kiểm thử — 12 task

| Task / phạm vi | PIC | Dependency khai báo | Đầu vào nghiệp vụ còn lại |
| --- | --- | --- | --- |
| [TEST-01](../../architechture/tasks/TEST-01.md) — E2E Guest→register→OTP→browse→cart→COD order | M3 — Anh | [INT-05](../../architechture/tasks/INT-05.md), [INT-06](../../architechture/tasks/INT-06.md), [INT-07](../../architechture/tasks/INT-07.md), [INT-51](../../architechture/tasks/INT-51.md) | [INT-05](../../architechture/tasks/INT-05.md), [INT-06](../../architechture/tasks/INT-06.md), [INT-07](../../architechture/tasks/INT-07.md), [INT-51](../../architechture/tasks/INT-51.md) |
| [TEST-05](../../architechture/tasks/TEST-05.md) — E2E Manager: create staff→assign→reports | M6 — Việt | [INT-61](../../architechture/tasks/INT-61.md), [INT-13](../../architechture/tasks/INT-13.md) | [INT-61](../../architechture/tasks/INT-61.md), [INT-13](../../architechture/tasks/INT-13.md) |
| [TEST-06](../../architechture/tasks/TEST-06.md) — E2E Admin: store → product → voucher thường | M2 — Nhật | [INT-15](../../architechture/tasks/INT-15.md), [INT-62](../../architechture/tasks/INT-62.md) | [INT-15](../../architechture/tasks/INT-15.md), [INT-62](../../architechture/tasks/INT-62.md) |
| [TEST-07](../../architechture/tasks/TEST-07.md) — RBAC: Staff A không gọi được dữ liệu quán B | M1 — Khánh | [INT-67](../../architechture/tasks/INT-67.md) | [INT-67](../../architechture/tasks/INT-67.md) |
| [TEST-12](../../architechture/tasks/TEST-12.md) — Shipping fee rules: pickup/free threshold/store override | M4 — Thịnh | [INT-65](../../architechture/tasks/INT-65.md) | [INT-65](../../architechture/tasks/INT-65.md) |
| [TEST-16](../../architechture/tasks/TEST-16.md) — Integration test Kafka + cross-service | M6 — Việt | [INT-43](../../architechture/tasks/INT-43.md), [INT-44](../../architechture/tasks/INT-44.md), [INT-45](../../architechture/tasks/INT-45.md), [INT-46](../../architechture/tasks/INT-46.md), [INT-47](../../architechture/tasks/INT-47.md) | [INT-43](../../architechture/tasks/INT-43.md), [INT-44](../../architechture/tasks/INT-44.md), [INT-45](../../architechture/tasks/INT-45.md), [INT-46](../../architechture/tasks/INT-46.md), [INT-47](../../architechture/tasks/INT-47.md) |
| [TEST-17](../../architechture/tasks/TEST-17.md) — Responsive test toàn bộ | M2 — Nhật | [INT-05](../../architechture/tasks/INT-05.md), [INT-06](../../architechture/tasks/INT-06.md), [INT-08](../../architechture/tasks/INT-08.md), [INT-09](../../architechture/tasks/INT-09.md), [INT-11](../../architechture/tasks/INT-11.md) | [INT-05](../../architechture/tasks/INT-05.md), [INT-06](../../architechture/tasks/INT-06.md), [INT-08](../../architechture/tasks/INT-08.md), [INT-09](../../architechture/tasks/INT-09.md), [INT-11](../../architechture/tasks/INT-11.md) |
| [TEST-22](../../architechture/tasks/TEST-22.md) — OTP/order/payment/refund email E2E flows | M5 — Thành | [INT-05](../../architechture/tasks/INT-05.md), [INT-09](../../architechture/tasks/INT-09.md), [INT-52](../../architechture/tasks/INT-52.md), [BE-39](../../architechture/tasks/BE-39.md) | [INT-05](../../architechture/tasks/INT-05.md), [INT-09](../../architechture/tasks/INT-09.md), [INT-52](../../architechture/tasks/INT-52.md), [BE-39](../../architechture/tasks/BE-39.md) |
| [TEST-23](../../architechture/tasks/TEST-23.md) — Email failure does not rollback order/payment | M5 — Thành | [BE-66](../../architechture/tasks/BE-66.md), [BE-39](../../architechture/tasks/BE-39.md), [INT-07](../../architechture/tasks/INT-07.md), [INT-09](../../architechture/tasks/INT-09.md) | [BE-66](../../architechture/tasks/BE-66.md), [BE-39](../../architechture/tasks/BE-39.md), [INT-07](../../architechture/tasks/INT-07.md), [INT-09](../../architechture/tasks/INT-09.md) |
| [TEST-24](../../architechture/tasks/TEST-24.md) — Secret masking: App Password absent from logs/API | M6 — Việt | [BE-57](../../architechture/tasks/BE-57.md), [BE-67](../../architechture/tasks/BE-67.md) | [BE-67](../../architechture/tasks/BE-67.md) |
| [TEST-25](../../architechture/tasks/TEST-25.md) — Cloudinary valid image upload and URL/public_id persistence | M2 — Nhật | [INT-73](../../architechture/tasks/INT-73.md) | [INT-73](../../architechture/tasks/INT-73.md) |
| [TEST-26](../../architechture/tasks/TEST-26.md) — Invalid MIME/oversize upload rejected | M2 — Nhật | [BE-71](../../architechture/tasks/BE-71.md) | [BE-71](../../architechture/tasks/BE-71.md) |

### Bàn giao/demo — 2 task

| Task / phạm vi | PIC | Dependency khai báo | Đầu vào nghiệp vụ còn lại |
| --- | --- | --- | --- |
| [DEP-09](../../architechture/tasks/DEP-09.md) — Postman collection: mỗi người export service mình, M6 merge | M6 — Việt | [INT-53](../../architechture/tasks/INT-53.md), [INT-54](../../architechture/tasks/INT-54.md), [INT-07](../../architechture/tasks/INT-07.md), [INT-09](../../architechture/tasks/INT-09.md), [INT-11](../../architechture/tasks/INT-11.md), [INT-13](../../architechture/tasks/INT-13.md) | [INT-53](../../architechture/tasks/INT-53.md), [INT-54](../../architechture/tasks/INT-54.md), [INT-07](../../architechture/tasks/INT-07.md), [INT-09](../../architechture/tasks/INT-09.md), [INT-11](../../architechture/tasks/INT-11.md), [INT-13](../../architechture/tasks/INT-13.md) |
| [DEP-10](../../architechture/tasks/DEP-10.md) — Demo materials: script + screenshots + slides | M1 — Khánh | [TEST-01](../../architechture/tasks/TEST-01.md), [TEST-05](../../architechture/tasks/TEST-05.md), [TEST-06](../../architechture/tasks/TEST-06.md), [TEST-07](../../architechture/tasks/TEST-07.md) | [TEST-01](../../architechture/tasks/TEST-01.md), [TEST-05](../../architechture/tasks/TEST-05.md), [TEST-06](../../architechture/tasks/TEST-06.md), [TEST-07](../../architechture/tasks/TEST-07.md) |

### UI chuyển vào Sprint 2 — 2 task

| Task / phạm vi | PIC | Dependency khai báo | Đầu vào nghiệp vụ còn lại |
| --- | --- | --- | --- |
| [UI-22](../../architechture/tasks/UI-22.md) — Voucher & Loyalty: voucher khả dụng, điểm, hạng | M5 — Thành | — | — |
| [UI-45](../../architechture/tasks/UI-45.md) — Promotion + Notification visual components: voucher badge, points tier, notification item | M5 — Thành | — | — |

## 9. Giới hạn và thay đổi trong lần rà soát

- Chỉ đọc source/task/config, dựng lại quan hệ dependency và thêm báo cáo này. Không sửa backlog/task, PIC, lịch, scope, trạng thái hoặc dữ liệu Lark; không commit/push.
- Không chạy test/lint/typecheck/build, không mở browser, Docker hoặc backend. Kiểm tra graph/tập hợp bằng đọc file không thay thế kiểm thử ứng dụng.
- Không dùng GitNexus index cũ ngày 01/11 để suy luận code vừa sửa; đối chiếu trực tiếp working tree. Không kiểm tra hoặc merge nhánh của các thành viên khác.
- Chưa xác nhận Lark live hoặc môi trường triển khai. Nếu member đã bàn giao trên nhánh khác, cần đọc implementation/evidence của nhánh đó trước khi bỏ một dependency khỏi danh sách còn chờ.
- Bản kiểm thử i18n trước đó chỉ là evidence frontend, không đóng các task INT/TEST backend trong báo cáo này.
