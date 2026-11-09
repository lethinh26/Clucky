# Clucky Club — contract và bàn giao triển khai 08/11/2026

## 1. Giao việc và kết quả

Phạm vi được người dùng duyệt trong chat: `/loyalty`, loyalty checkout, Admin policy, ledger và consumer Order. Đây là bản triển khai liên kết các TASK hiện hành, không mở TASK trùng, không thay PIC/SP/sprint/lịch hoặc đánh DONE trên Lark.

| TASK | Bàn giao trong đợt này |
|---|---|
| BE-51 | Contract preview/reserve, policy version, money units, error handling |
| BE-37 | Read API, ledger atomic, holds, policy Admin, recovery |
| UI-22 | Trang loyalty dữ liệu thật, filter/page, vi/en, loading/error/guest |
| UI-18, BE-24, BE-25 | Điểm thật trong checkout; voucher → hạng → điểm; giữ điểm trước commit Order |
| KAFKA-06 | Earn và redeem khi order.completed; chống replay |
| KAFKA-09 | Release khi order.cancelled, kể cả hủy do payment.failed qua saga Order hiện có |

## 2. Chính sách đã chọn

- Mặc định 10.000 VNĐ tiền món thực trả tích 1 điểm, làm tròn xuống; 1 điểm đổi 1.000 VNĐ. Không tính phí giao hàng.
- Voucher giảm trước; giảm hạng tính trên phần tiền món còn lại; đổi điểm sau cùng và không làm âm tiền món.
- MEMBER: 0%; SILVER từ 1.000 điểm tích lũy: 3%; GOLD từ 5.000: 5%. Điểm xét hạng tách khỏi điểm có thể tiêu. Admin sửa rate/ngưỡng/discount, các đơn đã reserve giữ phiên bản cũ.
- Khi tạo đơn: available = total - reserved. Giữ điểm chưa trừ total. Hoàn tất: redeem rồi earn trong cùng transaction. Hủy: giải phóng hold, không cộng lại vào total vì trước đó chưa trừ.
- Các dòng ADJUST với change=0 cho RESERVED/RELEASED là lịch sử giữ/giải phóng, không phải tiền thưởng.
- Không thêm expiry, reset hạng hằng năm, quà sinh nhật hoặc thưởng đăng ký.
- Migration giữ nguyên số dư hiện tại (kể cả seed cũ). lifetime ban đầu = số dư chuyển tiếp, không tuyên bố đây là toàn bộ lịch sử tích điểm thực tế; thêm OPENING_BALANCE để tổng ledger khớp số dư. Hạng API tính lại theo policy thay vì tin tier seed cũ.

## 3. API và quyền

| API | Quyền / DTO |
|---|---|
| GET /api/loyalty/policy | Public, chỉ các trường chính sách không nhạy cảm |
| GET /api/loyalty/me?page=0&size=10&type=ALL | CUSTOMER từ JWT; không nhận customerId từ browser. size 1–50; type ALL/EARN/REDEEM/ADJUST |
| GET /api/loyalty/config | ADMIN |
| PUT /api/loyalty/config | ADMIN; version hiện tại, spendPerPoint/pointValue/silverThreshold/goldThreshold nguyên dương, silverDiscount/goldDiscount 0–100. Kiểm thứ tự ngưỡng và phần trăm; version cũ trả 409 |
| POST /internal/loyalty/preview | Order → Promotion, customerId/pointsToRedeem/orderAmount; chỉ preview, không thay số dư |
| POST /internal/loyalty/reserve | Order → Promotion, orderId/customerId/pointsToRedeem/orderAmount/policyVersion/pointsAmount/tierDiscount; khóa số dư và xác minh lại quote |
| GET /internal/loyalty/orders/{id} | Promotion → Order; chỉ customerId/status, không PII; 404 xác nhận không có Order đã commit |

`me`: points {customerId,totalPoints,reservedPoints,availablePoints,lifetimePoints,tier}, policy, transactions [{id,orderId,change,balanceAfter,type,reason,createdAt}], page,size,totalElements.

Quote: policyVersion,availablePoints,pointsUsed,pointsAmount,pointsToEarn,tier,tierDiscount. Order preview trả thêm tierDiscount; discountAmount là tổng voucher + tier. Frontend tách riêng hai khoản, chỉ cho submit khi preview thành công.

Lỗi theo ApiError hiện có: 400 validation, 401 chưa xác thực, 403 sai quyền, 409 số dư/quote/config đã đổi, 503 dependency chưa sẵn sàng. Order không fallback cho điểm chưa xác minh.

Internal endpoints nằm ngoài `/api`, Gateway chặn `/internal/**`; hai service so sánh credential `LOYALTY_INTERNAL_TOKEN` tối thiểu 32 ký tự. Chỉ thêm vào private `.env.docker`/environment; `.env.example` là placeholder. Không gửi token xuống frontend hoặc log.

## 4. Vòng đời và khôi phục

1. Order tính giá món từ Catalog, voucher từ Promotion, gọi loyalty preview cho customer đã xác thực.
2. Tạo Order trong transaction tối đa 60 giây; reserve với orderId và policy version. Reserve lưu quote cố định, khóa row số dư, kiểm concurrent balance và idempotency theo orderId.
3. Outbox Order phát created/completed/cancelled sau commit. Promotion xác nhận identity/source/eventType và đọc trạng thái hiện hành từ Order để tránh áp dụng terminal event cũ sai thứ tự; ledger cùng balance commit trước ACK.
4. Duplicate event hoặc duplicate operation không nhân số dư. Unique operation_key là orderId:action; correlationId chỉ dùng trace. Lock theo customer trước khi khóa reservation.
5. Reservation chưa kết thúc quá 5 phút được đối chiếu với Order mỗi phút, tối đa 100 bản/lượt. Chỉ release orphan khi Order trả 404 hoặc CANCELLED. Timeout/5xx/401 giữ nguyên điểm, không coi là đơn không tồn tại. COMPLETED đối chiếu có thể phục hồi earn khi event chậm.
6. Event lỗi retry rồi lưu vào `<topic>.DLT` trước commit offset. DLQ giữ eventId/correlationId trong envelope. Đọc/sửa nguyên nhân rồi replay đúng topic nguồn bằng quy trình vận hành, không tạo eventId mới để bypass dedup.

## 5. Ranh giới chưa hoàn thành

- **Hoàn tiền sau COMPLETED chưa kích hoạt thu hồi/hoàn điểm tự động.** Source hiện có APPROVED refund request nhưng chưa có xác nhận tiền đã hoàn; không dùng APPROVED làm bằng chứng hoàn tiền. Cần chốt full/partial refund, điểm đã tiêu, ảnh hưởng lifetime/tier và event xác nhận trước khi bổ sung nghiệp vụ. Không trừ điểm âm hoặc âm thầm xóa điểm.
- Không tự cộng lại điểm cho các đơn lịch sử không có loyalty reservation/snapshot. Backfill lịch sử và làm sạch seed cần tác vụ được duyệt riêng.
- Không mở giao diện Admin tùy ý cộng/trừ điểm khách; không có yêu cầu/contract được duyệt cho việc này.

## 6. Acceptance Criteria và trạng thái

Tất cả ca chức năng dưới đây **CHƯA CHẠY**. User tự kiểm thử theo AGENTS.md. Có JUnit LoyaltyMathTest và Playwright loyalty spec để chạy khi được yêu cầu. Docker build/health không thay thế acceptance test.

| AC | Fixture / thao tác | Expected |
|---|---|---|
| L01 | Customer mới vào loyalty; refresh | 0 điểm, MEMBER, lịch sử trống; không fallback 1450 |
| L02 | Đổi account, khách vãng lai, 401/503 | Không lộ dữ liệu người trước; guest/error/retry đúng |
| L03 | Thay page/filter, vi/en, mobile, bàn phím | Phân trang server, label bản địa hóa, focus và layout sử dụng được |
| L04 | MEMBER chi 250.000, không giảm/đổi | Nhận 25 điểm chỉ sau completed |
| L05 | SILVER, tiền món sau voucher 250.000, đổi 50 | Tier 7.500; điểm 50.000; eligible 192.500; earn 19, phí ship không ảnh hưởng |
| L06 | Số điểm yêu cầu vượt tiền món/số dư | Preview giới hạn; reserve reject nếu số dư thay đổi; không âm |
| L07 | Hai checkout đồng thời dùng cùng điểm | Một hold đúng, request còn lại không tiêu trùng |
| L08 | Replay created/completed/cancelled | Không nhân hold/redeem/earn/release hoặc ledger |
| L09 | Rollback Order sau reserve; stop service/retry | Giữ dữ liệu; reconcile release orphan, không release khi dependency unavailable |
| L10 | Đổi config giữa preview/reserve/completion | Version được chốt giữ nhất quán; PUT version cũ conflict |
| L11 | Khách sửa owner/role/token hoặc gọi internal qua Gateway | Deny; không lộ số dư hoặc thay điểm |
| L12 | Cancel/payment failure từ saga | Giải phóng đúng hold một lần; completed không được hoàn điểm như cancel |
| L13 | DB fail giữa ledger và balance; Kafka/DLQ fail | Rollback và không ACK thành công giả |
| L14 | Admin lưu config, readback, reload | Persist policy/version/updatedBy; Customer/Manager không chỉnh được |

## 7. Definition of Done và vận hành

- [x] Source/migration/UI/contract được triển khai trong working tree, không commit thay người dùng.
- [x] Policy, lifecycle, ranh giới refund và seed được ghi rõ; không tuyên bố hoàn thành phần bị chặn.
- [x] Docker build và healthcheck thành công ngày 08/11/2026 cho promotion-loyalty-service, cart-order-service, api-gateway, customer, admin. Không chạy test/lint/typecheck độc lập hoặc kiểm thử trình duyệt.
- [ ] User chạy và ghi PASS/FAIL cho AC; lưu evidence không chứa secret/PII.
- [ ] Nghiệm thu đầy đủ rồi mới đổi trạng thái TASK; không tự đồng bộ Lark.
- Rebuild chọn lọc: `./start-docker.ps1 -Services promotion-loyalty-service,cart-order-service,api-gateway,customer,admin` (PowerShell truyền danh sách string).
- Giữ PostgreSQL/Kafka/Redis volumes; không reset DB, không replay toàn bộ lịch sử để thử bằng tài khoản thật.
- Lần áp dụng đầu gặp V5 đã tồn tại trong DB nhưng thiếu trong checkout source. Đã phục hồi nguyên bản `V5__loyalty_constraints_and_idempotency.sql` từ commit `5d7d390`, đưa thay đổi mới vào V6, không repair checksum/schema history. Build lại và cả 5 container healthy.
- Nhật ký build cục bộ: `%TEMP%/clucky-loyalty-build.log`. Cảnh báo Next.js còn lại thuộc menu/vouchers/use-deferred-action có sẵn, ngoài phạm vi loyalty.

## 8. Truy vết

SRS FR-CUS-11 / FR-ADM-09; BE-37, BE-51, UI-22, UI-18, BE-24/25, KAFKA-06/09; cuộc hội thoại duyệt kế hoạch 08/11/2026. Các metadata lịch sử trong task giữ nguyên.
