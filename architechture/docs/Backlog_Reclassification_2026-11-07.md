# Báo cáo phân loại backlog — 07/11/2026

> **Đã đồng bộ Lark ngày 08/11/2026:** 124 TASK chính; 60 record nguồn đã xoá sau khi chuyển dữ liệu. Tập sizing 37 TASK/247 SP đã cập nhật đủ; trường Sprint 2 thực tế có 35 TASK/218 SP vì giữ lịch nhóm đã đổi. Các ghi chú “chưa đồng bộ” bên dưới là lịch sử biên soạn. [Báo cáo đồng bộ và bảng đối chiếu](Lark_Backlog_Sync_2026-11-08.md).

> LỊCH SỬ 07/11: đã gộp tiếp Sprint 2 ngày 08/11; hiện còn 124 TASK toàn backlog, 37 TASK Sprint 2. Các số 142/55 và đích trung gian ở báo cáo này không còn là danh sách giao việc hiện hành. Xem [báo cáo gộp 08/11](Sprint_2_Consolidation_2026-11-08.md) và [backlog](backlog.md); chưa đồng bộ Lark.

## Quyết định

- Mọi công việc giữ lại là **TASK chính**, không phải Sub Task. Không còn INT/TEST hoạt động; thêm nhóm **KAFKA**.
- Xóa record trùng, không xóa implementation/kiểm chứng. Dev tự test, sửa lỗi/retest theo AC/DoD ngay trong TASK chính; dùng chung evidence, không tính công hai lần.
- **Đã sửa repository; chưa sửa/xóa record trên Lark.** Không xác nhận test/DONE mới. Kế hoạch cũ (kể cả Sprint_2_Planning.md) chỉ là snapshot khi khác phân loại này.
- File mã cũ là chuyển hướng, không phải task để giao việc/tính SP. Chỉ bảng backlog hiện hành dùng để tính task.

## Tổng hợp

| Phạm vi | Số lượng | Quyết định |
|---|---:|---|
| INT đang hoạt động trước sửa | 43 | Phân loại toàn bộ |
| INT trùng đầu ra BE/UI | 28 | Bỏ record, chuyển cả nối API/triển khai và AC/DoD |
| INT Kafka | 10 | Giữ công việc, đổi mã KAFKA và loại TASK |
| INT có đầu ra riêng ngoài Kafka | 5 | Giữ công việc, đổi mã BE/UI và loại TASK |
| TEST đang hoạt động | 14 | Bỏ toàn bộ; chuyển AC/DoD, contract/fixture vào TASK chính |
| TEST đã gộp trước | 15 | Vẫn không có record; trỏ đích cuối |
| BE cấu hình/consumer Kafka | 2 | Đổi mã KAFKA, không xóa công việc |
| **Record cần bỏ thêm** | **42** | **28 INT + 14 TEST** |
| **Record đổi mã/loại, không xóa** | **17** | **12 KAFKA + 2 BE + 3 UI** |
| **TASK còn lại** | **142** | **70 BE + 46 UI + 12 KAFKA + 14 DEP** |

184 − 42 = 142; đổi mã không tạo thêm công việc. Giữ 37 DONE snapshot, không xác nhận AC mới đã đạt. Không suy ra giờ tiết kiệm hoặc cộng lại remaining/velocity khi chưa rà estimate.

## Giữ công việc — đổi mã, loại TASK

Tên các TASK đích đã được diễn đạt lại ngày 07/11 để rõ việc cần làm và đầu ra. Mã cũ, quyết định giữ/gộp, PIC, lịch và phạm vi không thay đổi; title của record đã bỏ giữ nguyên để truy vết.

Đổi mã trên record hiện có khi đồng bộ; giữ history/attachment/PIC, không tạo bản sao rồi xóa record có evidence. KAFKA-04/11 vẫn backlog, không kéo promotion approval/email vào sprint.

| Mã cũ | Mã chính mới | Đầu ra giữ lại | PIC | Lịch snapshot |
|---|---|---|---|---|
| BE-11 | [KAFKA-01](../tasks/KAFKA-01.md) | Cấu hình topic, producer và consumer Kafka cho các service, thống nhất JSON event, group, serializer và cách xác nhận xử lý | Mai Sơn Việt | SPRINT 1 |
| INT-39 | [KAFKA-02](../tasks/KAFKA-02.md) | Phát sự kiện tạo, đổi trạng thái, hoàn tất và hủy đơn sau khi Order commit, giữ eventId và correlationId khi gửi lại | Trần Đức Anh | SPRINT 2 |
| INT-40 | [KAFKA-03](../tasks/KAFKA-03.md) | Phát sự kiện xác nhận hoặc thất bại thanh toán và dữ liệu hết hạn, sai lệch, hoàn tiền theo contract cho các service nhận | Lê Phú Thịnh | SPRINT 2 |
| INT-41 | [KAFKA-04](../tasks/KAFKA-04.md) | Phát sự kiện promotion.approved sau khi Admin duyệt voucher chi nhánh, kèm định danh để truy vết và chống xử lý lặp | Cao Tất Thành | BACKLOG |
| INT-43 | [KAFKA-05](../tasks/KAFKA-05.md) | Xử lý sự kiện order.created để tạo một shipment CREATED cho mỗi đơn, không tạo trùng khi Kafka gửi lại | Lê Phú Thịnh | SPRINT 2 |
| INT-44 | [KAFKA-06](../tasks/KAFKA-06.md) | Xử lý sự kiện order.completed để cộng điểm cho đúng khách, lưu biến động điểm và không cộng lại khi nhận sự kiện trùng | Cao Tất Thành | SPRINT 2 |
| INT-45 | [KAFKA-07](../tasks/KAFKA-07.md) | Xử lý sự kiện Order và Payment để cập nhật thống kê từng quán theo ngày, không cộng doanh thu hai lần khi nhận lại sự kiện | Mai Sơn Việt | SPRINT 2 |
| INT-46 | [KAFKA-08](../tasks/KAFKA-08.md) | Triển khai retry, DLQ và xử lý sự kiện không lặp hiệu ứng cho Kafka consumer, hỗ trợ phát lại có kiểm soát khi khôi phục lỗi | Mai Sơn Việt | SPRINT 2 |
| INT-47 | [KAFKA-09](../tasks/KAFKA-09.md) | Xử lý payment.failed để hủy đơn và giải phóng voucher, điểm đã giữ, bảo đảm các bước bù trừ không thực hiện trùng | Trần Đức Anh | SPRINT 2 |
| INT-48 | [KAFKA-10](../tasks/KAFKA-10.md) | Phát sự kiện cho mọi thay đổi quản trị đã commit và ghi tập trung vào Audit Service, chống trùng và loại dữ liệu nhạy cảm | Mai Sơn Việt | SPRINT 2 |
| INT-58 | [KAFKA-11](../tasks/KAFKA-11.md) | Thống nhất và tích hợp sự kiện khuyến mãi đã duyệt từ Promotion sang Notification, đủ dữ liệu chọn email và người nhận | Cao Tất Thành | BACKLOG |
| BE-39 | [KAFKA-12](../tasks/KAFKA-12.md) | Xử lý sự kiện Order, Payment để tạo thông báo và yêu cầu gửi email đúng người, chống trùng và không rollback nghiệp vụ khi email lỗi | Cao Tất Thành | SPRINT 2 |
| INT-03 | [BE-77](../tasks/BE-77.md) | Triển khai upload hoặc thay avatar qua Identity, lưu metadata Cloudinary và chỉ cho phép người dùng sửa ảnh của mình | Trần Nguyễn Hữu Khánh | BACKLOG |
| INT-60 | [BE-78](../tasks/BE-78.md) | Bổ sung log và chỉ số gửi email xuyên service, nối event, message, correlation ID để truy vết lỗi và các lần gửi lại | Mai Sơn Việt | SPRINT 2 |
| INT-71 | [UI-50](../tasks/UI-50.md) | Xây dựng màn tra cứu email log theo bộ lọc, xem chi tiết và gửi lại email lỗi khi API, quyền và chính sách được chốt | Mai Sơn Việt | BACKLOG |
| INT-70 | [UI-51](../tasks/UI-51.md) | Hiển thị trạng thái email liên quan đến đơn hoặc thanh toán cho Customer khi có contract được duyệt, không coi email lỗi là đơn lỗi | Trần Đức Anh | BACKLOG |
| INT-72 | [UI-52](../tasks/UI-52.md) | Xây dựng component upload ảnh dùng chung cho món và combo, có xem trước, tiến độ, hủy hoặc thử lại và phản hồi lỗi | Nguyễn Duy Quang Nhật | SPRINT 2 |

BE-77 avatar, BE-78 email observability, UI-50 email-log, UI-51 email status Customer, UI-52 upload component có đầu ra riêng nên giữ TASK. Phạm vi backlog cũ giữ nguyên, không gộp ép vào task sprint đã DONE.

## INT cần bỏ record độc lập

Đích đầu là đầu mối; các đích sau sở hữu phần domain/UI. Scope/contract/fixture nằm trực tiếp ở đầu mối; **đầy đủ bảng AC và checklist DoD chép vào từng task nhận**, không chỉ ghi “dev tự test” hoặc thêm liên kết.

| Record bỏ | Phạm vi/coverage giữ lại | TASK chính nhận scope/AC/DoD |
|---|---|---|
| INT-02 | Promotion → Cloudinary banner upload integration | [BE-36](../tasks/BE-36.md) |
| INT-05 | Auth E2E: register → OTP → login → refresh, 2 app | [BE-17](../tasks/BE-17.md), [BE-16](../tasks/BE-16.md), [UI-09](../tasks/UI-09.md) |
| INT-06 | Menu/catalog E2E: browse, search, availability theo quán | [UI-11](../tasks/UI-11.md), [UI-10](../tasks/UI-10.md), [UI-12](../tasks/UI-12.md), [UI-13](../tasks/UI-13.md), [BE-20](../tasks/BE-20.md), [BE-54](../tasks/BE-54.md) |
| INT-07 | Cart → checkout → tạo đơn E2E | [BE-25](../tasks/BE-25.md), [BE-23](../tasks/BE-23.md), [BE-24](../tasks/BE-24.md), [UI-17](../tasks/UI-17.md), [UI-18](../tasks/UI-18.md) |
| INT-08 | Order tracking, history, cancel, reorder E2E | [BE-27](../tasks/BE-27.md), [BE-26](../tasks/BE-26.md), [UI-19](../tasks/UI-19.md), [UI-20](../tasks/UI-20.md) |
| INT-09 | Payment: QR hiển thị, webhook → CONFIRMED, COD confirm | [BE-29](../tasks/BE-29.md), [BE-30](../tasks/BE-30.md), [BE-32](../tasks/BE-32.md), [BE-44](../tasks/BE-44.md), [UI-19](../tasks/UI-19.md), [UI-30](../tasks/UI-30.md), [UI-44](../tasks/UI-44.md) |
| INT-10 | Voucher apply + loyalty points E2E | [BE-34](../tasks/BE-34.md), [BE-37](../tasks/BE-37.md), [BE-24](../tasks/BE-24.md), [UI-18](../tasks/UI-18.md), [UI-22](../tasks/UI-22.md), [KAFKA-06](../tasks/KAFKA-06.md) |
| INT-11 | Notification list + mark-read E2E | [BE-38](../tasks/BE-38.md), [UI-32](../tasks/UI-32.md) |
| INT-12 | Review: viết/sửa/xóa + reply + hide E2E | [BE-40](../tasks/BE-40.md), [BE-41](../tasks/BE-41.md), [UI-12](../tasks/UI-12.md), [UI-16](../tasks/UI-16.md) |
| INT-13 | Report/dashboard/export E2E | [BE-42](../tasks/BE-42.md), [UI-14](../tasks/UI-14.md), [UI-29](../tasks/UI-29.md) |
| INT-14 | Admin orders: status, refund approve E2E | [BE-26](../tasks/BE-26.md), [BE-25](../tasks/BE-25.md), [BE-46](../tasks/BE-46.md), [UI-24](../tasks/UI-24.md), [UI-30](../tasks/UI-30.md) |
| INT-15 | Admin catalog/store/inventory E2E | [BE-21](../tasks/BE-21.md), [BE-22](../tasks/BE-22.md), [UI-25](../tasks/UI-25.md), [UI-26](../tasks/UI-26.md), [UI-31](../tasks/UI-31.md) |
| INT-49 | SePay webhook test: mock → verify → match → confirm | [BE-30](../tasks/BE-30.md), [BE-45](../tasks/BE-45.md) |
| INT-50 | Payment timeout: QR expires → order/payment expired → notify customer | [BE-29](../tasks/BE-29.md), [BE-30](../tasks/BE-30.md), [BE-25](../tasks/BE-25.md), [BE-44](../tasks/BE-44.md), [KAFKA-03](../tasks/KAFKA-03.md), [KAFKA-12](../tasks/KAFKA-12.md), [UI-19](../tasks/UI-19.md) |
| INT-51 | COD lifecycle: confirm at branch → collected → completed | [BE-32](../tasks/BE-32.md), [BE-25](../tasks/BE-25.md), [UI-30](../tasks/UI-30.md) |
| INT-52 | Tích hợp refund: duyệt/từ chối, cập nhật thanh toán, thông báo và nghiệm thu | [BE-46](../tasks/BE-46.md), [BE-26](../tasks/BE-26.md), [BE-32](../tasks/BE-32.md), [UI-24](../tasks/UI-24.md), [KAFKA-03](../tasks/KAFKA-03.md), [KAFKA-12](../tasks/KAFKA-12.md) |
| INT-53 | Identity → Gateway security integration: JWT claims, role, storeId propagation | [BE-09](../tasks/BE-09.md), [BE-17](../tasks/BE-17.md), [UI-05](../tasks/UI-05.md) |
| INT-54 | Catalog → Gateway discovery integration: menu route, cache headers, availability | [BE-54](../tasks/BE-54.md), [BE-20](../tasks/BE-20.md), [UI-05](../tasks/UI-05.md) |
| INT-61 | Admin users: create staff, lock, assign E2E | [BE-19](../tasks/BE-19.md), [UI-15](../tasks/UI-15.md) |
| INT-62 | Tích hợp UI quản trị voucher thường (banner và duyệt chi nhánh để backlog) | [BE-34](../tasks/BE-34.md), [UI-28](../tasks/UI-28.md) |
| INT-63 | Admin payments/bank config E2E | [BE-32](../tasks/BE-32.md), [UI-27](../tasks/UI-27.md) |
| INT-64 | Payment status UI: pending/paid/expired/mismatch/refund states | [BE-44](../tasks/BE-44.md), [UI-19](../tasks/UI-19.md), [UI-20](../tasks/UI-20.md), [UI-44](../tasks/UI-44.md) |
| INT-65 | Shipping fee + shipment info UI integration | [BE-33](../tasks/BE-33.md), [BE-24](../tasks/BE-24.md), [UI-18](../tasks/UI-18.md), [UI-19](../tasks/UI-19.md), [UI-44](../tasks/UI-44.md) |
| INT-67 | RBAC E2E: storeId enforcement từng API | [BE-09](../tasks/BE-09.md), [BE-18](../tasks/BE-18.md), [BE-19](../tasks/BE-19.md), [BE-21](../tasks/BE-21.md), [BE-22](../tasks/BE-22.md), [BE-25](../tasks/BE-25.md), [BE-26](../tasks/BE-26.md), [BE-27](../tasks/BE-27.md), [BE-32](../tasks/BE-32.md), [BE-33](../tasks/BE-33.md), [BE-34](../tasks/BE-34.md), [BE-37](../tasks/BE-37.md), [BE-38](../tasks/BE-38.md), [BE-40](../tasks/BE-40.md), [BE-41](../tasks/BE-41.md), [BE-42](../tasks/BE-42.md), [BE-43](../tasks/BE-43.md), [BE-44](../tasks/BE-44.md), [BE-46](../tasks/BE-46.md), [BE-63](../tasks/BE-63.md), [BE-71](../tasks/BE-71.md), [BE-72](../tasks/BE-72.md) |
| INT-68 | Order status realtime (polling) cho customer | [UI-19](../tasks/UI-19.md), [BE-27](../tasks/BE-27.md) |
| INT-69 | Customer auth UI: email sent/sending/failure states | [UI-09](../tasks/UI-09.md), [BE-16](../tasks/BE-16.md), [BE-17](../tasks/BE-17.md) |
| INT-73 | Tích hợp UI quản trị ảnh product/combo | [BE-72](../tasks/BE-72.md), [UI-25](../tasks/UI-25.md), [UI-52](../tasks/UI-52.md), [BE-74](../tasks/BE-74.md) |
| INT-74 | Google login E2E: tài khoản cũ/mới, complete-password, token lỗi và email trùng | [BE-76](../tasks/BE-76.md), [UI-49](../tasks/UI-49.md) |

## TEST cần bỏ toàn bộ record độc lập

Đích đầu là đầu mối; các đích sau sở hữu phần domain/UI. Scope/contract/fixture nằm trực tiếp ở đầu mối; **đầy đủ bảng AC và checklist DoD chép vào từng task nhận**, không chỉ ghi “dev tự test” hoặc thêm liên kết.

| Record bỏ | Phạm vi/coverage giữ lại | TASK chính nhận scope/AC/DoD |
|---|---|---|
| TEST-01 | E2E Guest→register→OTP→browse→cart→COD order | [BE-25](../tasks/BE-25.md), [BE-16](../tasks/BE-16.md), [BE-17](../tasks/BE-17.md), [BE-20](../tasks/BE-20.md), [BE-23](../tasks/BE-23.md), [BE-24](../tasks/BE-24.md), [BE-32](../tasks/BE-32.md), [UI-09](../tasks/UI-09.md), [UI-11](../tasks/UI-11.md), [UI-17](../tasks/UI-17.md), [UI-18](../tasks/UI-18.md), [UI-30](../tasks/UI-30.md) |
| TEST-05 | E2E Manager: create staff→assign→reports | [BE-19](../tasks/BE-19.md), [BE-42](../tasks/BE-42.md), [UI-15](../tasks/UI-15.md), [UI-29](../tasks/UI-29.md) |
| TEST-06 | E2E Admin: store → product → voucher thường | [BE-21](../tasks/BE-21.md), [BE-34](../tasks/BE-34.md), [BE-24](../tasks/BE-24.md), [UI-25](../tasks/UI-25.md), [UI-26](../tasks/UI-26.md), [UI-28](../tasks/UI-28.md) |
| TEST-07 | RBAC: Staff A không gọi được dữ liệu quán B | [BE-09](../tasks/BE-09.md), [BE-19](../tasks/BE-19.md), [BE-21](../tasks/BE-21.md), [BE-22](../tasks/BE-22.md), [BE-25](../tasks/BE-25.md), [BE-26](../tasks/BE-26.md), [BE-27](../tasks/BE-27.md), [BE-32](../tasks/BE-32.md), [BE-33](../tasks/BE-33.md), [BE-34](../tasks/BE-34.md), [BE-41](../tasks/BE-41.md), [BE-42](../tasks/BE-42.md), [BE-43](../tasks/BE-43.md), [BE-46](../tasks/BE-46.md), [BE-63](../tasks/BE-63.md), [BE-72](../tasks/BE-72.md) |
| TEST-12 | Shipping fee rules: pickup/free threshold/store override | [BE-48](../tasks/BE-48.md), [BE-33](../tasks/BE-33.md), [BE-24](../tasks/BE-24.md), [UI-18](../tasks/UI-18.md) |
| TEST-13 | Performance: menu <500ms (Redis cache) | [BE-54](../tasks/BE-54.md) |
| TEST-14 | Load test 50 concurrent orders | [BE-25](../tasks/BE-25.md) |
| TEST-16 | Integration test Kafka + cross-service | [KAFKA-08](../tasks/KAFKA-08.md), [KAFKA-02](../tasks/KAFKA-02.md), [KAFKA-03](../tasks/KAFKA-03.md), [KAFKA-05](../tasks/KAFKA-05.md), [KAFKA-06](../tasks/KAFKA-06.md), [KAFKA-07](../tasks/KAFKA-07.md), [KAFKA-09](../tasks/KAFKA-09.md), [KAFKA-10](../tasks/KAFKA-10.md), [KAFKA-12](../tasks/KAFKA-12.md) |
| TEST-17 | Responsive test toàn bộ | [UI-34](../tasks/UI-34.md), [UI-46](../tasks/UI-46.md), [UI-47](../tasks/UI-47.md), [UI-48](../tasks/UI-48.md) |
| TEST-22 | OTP/order/payment/refund email E2E flows | [KAFKA-12](../tasks/KAFKA-12.md), [BE-16](../tasks/BE-16.md), [BE-17](../tasks/BE-17.md), [BE-60](../tasks/BE-60.md), [BE-64](../tasks/BE-64.md), [BE-65](../tasks/BE-65.md), [BE-62](../tasks/BE-62.md), [BE-66](../tasks/BE-66.md), [BE-46](../tasks/BE-46.md), [KAFKA-02](../tasks/KAFKA-02.md), [KAFKA-03](../tasks/KAFKA-03.md) |
| TEST-23 | Email failure does not rollback order/payment | [KAFKA-12](../tasks/KAFKA-12.md), [BE-25](../tasks/BE-25.md), [BE-30](../tasks/BE-30.md), [BE-32](../tasks/BE-32.md), [BE-46](../tasks/BE-46.md), [BE-60](../tasks/BE-60.md), [BE-66](../tasks/BE-66.md), [BE-67](../tasks/BE-67.md) |
| TEST-24 | Secret masking: App Password absent from logs/API | [BE-57](../tasks/BE-57.md), [BE-58](../tasks/BE-58.md), [BE-60](../tasks/BE-60.md), [BE-67](../tasks/BE-67.md), [BE-75](../tasks/BE-75.md), [BE-78](../tasks/BE-78.md), [KAFKA-12](../tasks/KAFKA-12.md) |
| TEST-25 | Cloudinary valid image upload and URL/public_id persistence | [BE-72](../tasks/BE-72.md), [BE-70](../tasks/BE-70.md), [BE-74](../tasks/BE-74.md), [UI-25](../tasks/UI-25.md), [UI-52](../tasks/UI-52.md) |
| TEST-26 | Invalid MIME/oversize upload rejected | [BE-71](../tasks/BE-71.md), [BE-70](../tasks/BE-70.md), [BE-72](../tasks/BE-72.md), [UI-52](../tasks/UI-52.md) |

**Giữ phạm vi hoãn:** TEST-13 (<500ms) ở BE-54; TEST-14 (50 concurrent orders) ở BE-25. Đầy đủ AC/fixture/DoD nhưng vẫn backlog chưa cam kết, chỉ kích hoạt sau khi chốt workload/metric/môi trường/lịch; không thêm vào DoD bắt buộc sprint cũ. TEST-17 vào UI-34/46/47/48; responsive/a11y cũng là DoD mỗi task UI.

**Ranh giới:** Payment nâng cao theo quyết định 04/11 vẫn hoãn, signature/idempotency/không xác nhận nhầm bắt buộc. Shipping MVP chỉ CREATED. Audit có schema/service riêng. Quyết định mở không tự thành rule đã duyệt.

## ID đã gộp từ trước — không xóa lần hai

| ID cũ | Đích cuối hiện hành |
|---|---|
| BE-14 | [BE-10](../tasks/BE-10.md) |
| BE-53 | [BE-16](../tasks/BE-16.md), [BE-17](../tasks/BE-17.md) |
| BE-55 | [BE-25](../tasks/BE-25.md) |
| BE-56 | [BE-07](../tasks/BE-07.md) |
| BE-69 | [BE-01](../tasks/BE-01.md), [BE-02](../tasks/BE-02.md), [BE-05](../tasks/BE-05.md) |
| BE-73 | [BE-77](../tasks/BE-77.md), [BE-36](../tasks/BE-36.md) |
| DEP-13 | [BE-17](../tasks/BE-17.md), [BE-16](../tasks/BE-16.md), [UI-09](../tasks/UI-09.md) |
| DEP-14 | [UI-11](../tasks/UI-11.md), [UI-10](../tasks/UI-10.md), [UI-12](../tasks/UI-12.md), [UI-13](../tasks/UI-13.md), [BE-20](../tasks/BE-20.md), [BE-54](../tasks/BE-54.md) |
| DEP-15 | [BE-09](../tasks/BE-09.md), [BE-17](../tasks/BE-17.md), [UI-05](../tasks/UI-05.md) |
| DEP-16 | [BE-29](../tasks/BE-29.md), [BE-30](../tasks/BE-30.md), [BE-32](../tasks/BE-32.md), [BE-44](../tasks/BE-44.md), [UI-19](../tasks/UI-19.md), [UI-30](../tasks/UI-30.md), [UI-44](../tasks/UI-44.md) |
| DEP-17 | [BE-38](../tasks/BE-38.md), [UI-32](../tasks/UI-32.md) |
| DEP-18 | [BE-57](../tasks/BE-57.md) |
| DEP-19 | [BE-57](../tasks/BE-57.md) |
| DEP-21 | [BE-68](../tasks/BE-68.md) |
| DEP-23 | [BE-76](../tasks/BE-76.md) |
| INT-01 | [BE-70](../tasks/BE-70.md) |
| INT-04 | [BE-74](../tasks/BE-74.md) |
| INT-35 | [BE-24](../tasks/BE-24.md) |
| INT-36 | [BE-25](../tasks/BE-25.md) |
| INT-37 | [BE-25](../tasks/BE-25.md) |
| INT-38 | [BE-24](../tasks/BE-24.md) |
| INT-42 | [KAFKA-12](../tasks/KAFKA-12.md) |
| INT-55 | [BE-16](../tasks/BE-16.md) |
| INT-56 | [KAFKA-02](../tasks/KAFKA-02.md) |
| INT-57 | [KAFKA-03](../tasks/KAFKA-03.md) |
| INT-59 | [KAFKA-12](../tasks/KAFKA-12.md) |
| INT-66 | [BE-46](../tasks/BE-46.md), [BE-26](../tasks/BE-26.md), [BE-32](../tasks/BE-32.md), [UI-24](../tasks/UI-24.md), [KAFKA-03](../tasks/KAFKA-03.md), [KAFKA-12](../tasks/KAFKA-12.md) |
| TEST-02 | [BE-29](../tasks/BE-29.md), [BE-30](../tasks/BE-30.md), [BE-32](../tasks/BE-32.md), [BE-44](../tasks/BE-44.md), [UI-19](../tasks/UI-19.md), [UI-30](../tasks/UI-30.md), [UI-44](../tasks/UI-44.md) |
| TEST-03 | [BE-46](../tasks/BE-46.md), [BE-26](../tasks/BE-26.md), [BE-32](../tasks/BE-32.md), [UI-24](../tasks/UI-24.md), [KAFKA-03](../tasks/KAFKA-03.md), [KAFKA-12](../tasks/KAFKA-12.md) |
| TEST-04 | [BE-26](../tasks/BE-26.md), [BE-25](../tasks/BE-25.md), [BE-46](../tasks/BE-46.md), [UI-24](../tasks/UI-24.md), [UI-30](../tasks/UI-30.md) |
| TEST-08 | [BE-30](../tasks/BE-30.md), [BE-45](../tasks/BE-45.md) |
| TEST-09 | [BE-30](../tasks/BE-30.md), [BE-45](../tasks/BE-45.md) |
| TEST-10 | [BE-29](../tasks/BE-29.md), [BE-30](../tasks/BE-30.md), [BE-25](../tasks/BE-25.md), [BE-44](../tasks/BE-44.md), [KAFKA-03](../tasks/KAFKA-03.md), [KAFKA-12](../tasks/KAFKA-12.md), [UI-19](../tasks/UI-19.md) |
| TEST-11 | [BE-46](../tasks/BE-46.md), [BE-26](../tasks/BE-26.md), [BE-32](../tasks/BE-32.md), [UI-24](../tasks/UI-24.md), [KAFKA-03](../tasks/KAFKA-03.md), [KAFKA-12](../tasks/KAFKA-12.md) |
| TEST-15 | [BE-25](../tasks/BE-25.md), [BE-30](../tasks/BE-30.md), [BE-46](../tasks/BE-46.md), [KAFKA-12](../tasks/KAFKA-12.md) |
| TEST-18 | [BE-25](../tasks/BE-25.md), [UI-34](../tasks/UI-34.md) |
| TEST-19 | [BE-60](../tasks/BE-60.md) |
| TEST-20 | [BE-66](../tasks/BE-66.md) |
| TEST-21 | [KAFKA-12](../tasks/KAFKA-12.md) |
| TEST-27 | [BE-74](../tasks/BE-74.md) |
| TEST-28 | [BE-75](../tasks/BE-75.md) |
| TEST-29 | [BE-76](../tasks/BE-76.md), [UI-49](../tasks/UI-49.md) |
| UI-33 | [UI-34](../tasks/UI-34.md) |
| UI-35 | [UI-34](../tasks/UI-34.md) |
| UI-36 | [UI-34](../tasks/UI-34.md) |
| UI-37 | [UI-34](../tasks/UI-34.md) |
| UI-38 | [UI-34](../tasks/UI-34.md) |
| UI-42 | [UI-34](../tasks/UI-34.md) |

TEST-15 critical path và TEST-18 bug/retest là DoD mọi TASK chính, không giới hạn vào đích minh họa. TEST đã gộp trước vẫn truy tới cùng nghiệp vụ, không mở lại record.

## Dependency, PIC, tiến độ và estimate

- Dependency hiện hành đổi sang ID đích, mở rộng task phối hợp của gói gộp, bỏ tự phụ thuộc/trùng. Handoff nghiệm thu phần gộp ghi riêng ở đầu mối, không tự biến UI nghiệm thu thành prerequisite triển khai backend.
- Giữ PIC/lịch/trạng thái snapshot của TASK nhận. PIC cũ INT/TEST là lịch sử; đầu mối và owner domain nhận trách nhiệm, không giao lại subtask. DONE cũ không có nghĩa scope mới DONE.
- SP/giờ cũ chỉ tham chiếu. PIC rà một estimate cho implementation + tự test + sửa lỗi; không cộng nguyên estimate INT/TEST, không tự gán remaining/deadline mới.
- AC trùng dùng chung evidence; AC khác phạm vi phải giữ. Thiếu handoff ghi BLOCKED/prerequisite/PIC; không tạo TEST mới để che blocker.

## Đồng bộ Lark — CHƯA THỰC HIỆN

1. Đọc lại record/tiến độ/PIC, lưu snapshot/attachment; không ghi đè tiến độ mới bằng snapshot repository.
2. Đổi mã 17 record giữ lại, đặt nhóm và **Loại = TASK**, bỏ parent/subtask, giữ history/evidence. Các TASK chính khác cũng dùng loại TASK.
3. Cập nhật đầy đủ scope/AC/DoD ở task đích, chuyển attachment/evidence, remap dependency/parent/link/view, bỏ tự phụ thuộc.
4. Chỉ sau khi đọc lại đủ nội dung/evidence ở đích mới bỏ 42 record dư. Có evidence/tiến độ mới chưa chuyển thì dừng xóa record đó, báo owner.
5. Đọc lại 142 TASK, không INT/TEST hoạt động, KAFKA là TASK chính; rà quan hệ và quyền attachment. Không tạo 142 bản sao hoặc xóa task nhận việc.

Chỉ sửa Markdown; không chạy test/lint/typecheck/build/browser/Docker/backend/hạ tầng. Chưa đồng bộ Lark, chưa cập nhật trạng thái nghiệm thu.
