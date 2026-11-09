# Viết lại detail 37 TASK Sprint 2 — 08/11/2026

> **Đã đồng bộ Lark ngày 08/11/2026:** 124 TASK chính; 60 record nguồn đã xoá sau khi chuyển dữ liệu. Tập sizing 37 TASK/247 SP đã cập nhật đủ; trường Sprint 2 thực tế có 35 TASK/218 SP vì giữ lịch nhóm đã đổi. Các ghi chú “chưa đồng bộ” bên dưới là lịch sử biên soạn. [Báo cáo đồng bộ và bảng đối chiếu](Lark_Backlog_Sync_2026-11-08.md).

## Phạm vi thực hiện

Đã biên soạn lại **37 TASK / 247 SP**, giữ ID, title, PIC, sprint, dependency và trạng thái snapshot; không tự sửa lịch, giờ công hoặc mở scope nghiệp vụ. Không chỉnh UI header/i18n theo yêu cầu gửi nhầm session.

Mỗi task hiện có một bản thống nhất: đầu ra, phạm vi/ngoài phạm vi, input/output/contract, điểm đọc source và thứ tự thực hiện, dependency+PIC+handoff, fixture, quyết định còn mở, bảng AC có expected/evidence, DoD và mẫu kết quả. Không còn yêu cầu đọc nhiều bản task ghép chồng để biết phải làm gì.

**Chưa đồng bộ Lark. Chưa chạy test/lint/typecheck/build/browser/Docker/backend/hạ tầng.** Các AC đều chưa có kết quả trong lượt biên soạn, không coi document hoàn chỉnh là code đã hoàn tất hoặc đã nghiệm thu.

## Nội dung được làm rõ

- Gỡ các câu loại trừ BE/UI đã được gộp vào chính task: auth nhận đăng ký/OTP, media nhận adapter/validation/UI/cleanup, email nhận template/SMTP/retry, payment nhận refund/detail/contract.
- Auth theo Browser_Sessions.md 08/11: cookie riêng hai client, user-only JSON, Origin/CORS, single-flight/đa tab, không localStorage token, giữ giỏ khi merge lỗi. Không mở lại lựa chọn token body/cookie legacy như câu hỏi chưa chốt.
- Google theo API 05/11 và phiên 08/11: tài khoản email/Google thống nhất, password bắt buộc cho user mới, pending one-time, conflict/recovery. Không user password null hoặc auto-link unverified.
- Catalog giữ contract options/toppings ID, omitted vs [] và combo references; Review giữ unique/verification/internal boundaries, optimistic version và outbox sanitized.
- Report giữ STAFF STORE_DAY hiện có, tiền/period null, không nhận daily stats là báo cáo ca đầy đủ. Phần ca thật thiếu projection được ghi rõ blocker.
- Payment giữ baseline signature/idempotency/no false confirmation; quy trình tra soát nâng cao 04/11 vẫn hoãn. QR≠đã nhận tiền, APPROVED≠REFUNDED, SMTP accepted≠inbox delivered.
- Mỗi producer/consumer có AC transaction/ACK/replay/identity/failure/recovery; Audit có coverage theo domain chứ không chỉ một listener. Không coi Kafka log hoặc screenshot là evidence persisted effect.
- Phân biệt AC domain và evidence phối hợp: flow auth→COD, Manager nhân sự→report, Admin catalog→voucher có đầu mối và expected rõ; không giao lại toàn bộ flow cho mỗi owner để tính công lặp.

## Danh mục và độ phủ

| TASK | PIC | SP | AC cụ thể | Checklist DoD |
|---|---|---:|---:|---:|
| [BE-17](../tasks/BE-17.md) | Trần Nguyễn Hữu Khánh | 13 | 18 | 17 |
| [BE-18](../tasks/BE-18.md) | Trần Nguyễn Hữu Khánh | 3 | 15 | 17 |
| [BE-19](../tasks/BE-19.md) | Trần Nguyễn Hữu Khánh | 5 | 17 | 17 |
| [BE-21](../tasks/BE-21.md) | Nguyễn Duy Quang Nhật | 8 | 16 | 17 |
| [BE-22](../tasks/BE-22.md) | Nguyễn Duy Quang Nhật | 3 | 14 | 17 |
| [BE-24](../tasks/BE-24.md) | Trần Đức Anh | 8 | 15 | 17 |
| [BE-25](../tasks/BE-25.md) | Trần Đức Anh | 13 | 18 | 17 |
| [BE-26](../tasks/BE-26.md) | Trần Đức Anh | 5 | 14 | 17 |
| [BE-27](../tasks/BE-27.md) | Trần Đức Anh | 5 | 14 | 17 |
| [BE-29](../tasks/BE-29.md) | Lê Phú Thịnh | 8 | 16 | 17 |
| [BE-30](../tasks/BE-30.md) | Lê Phú Thịnh | 8 | 16 | 17 |
| [BE-32](../tasks/BE-32.md) | Lê Phú Thịnh | 13 | 17 | 17 |
| [BE-33](../tasks/BE-33.md) | Lê Phú Thịnh | 5 | 15 | 17 |
| [BE-34](../tasks/BE-34.md) | Cao Tất Thành | 5 | 14 | 17 |
| [BE-37](../tasks/BE-37.md) | Cao Tất Thành | 8 | 14 | 17 |
| [BE-38](../tasks/BE-38.md) | Cao Tất Thành | 3 | 13 | 17 |
| [KAFKA-12](../tasks/KAFKA-12.md) | Cao Tất Thành | 8 | 15 | 17 |
| [BE-40](../tasks/BE-40.md) | Mai Sơn Việt | 5 | 17 | 17 |
| [BE-42](../tasks/BE-42.md) | Mai Sơn Việt | 8 | 16 | 17 |
| [BE-43](../tasks/BE-43.md) | Mai Sơn Việt | 5 | 14 | 17 |
| [BE-54](../tasks/BE-54.md) | Nguyễn Duy Quang Nhật | 5 | 14 | 17 |
| [BE-60](../tasks/BE-60.md) | Cao Tất Thành | 8 | 15 | 17 |
| [BE-62](../tasks/BE-62.md) | Cao Tất Thành | 8 | 15 | 17 |
| [BE-63](../tasks/BE-63.md) | Mai Sơn Việt | 8 | 15 | 17 |
| [BE-72](../tasks/BE-72.md) | Nguyễn Duy Quang Nhật | 13 | 17 | 17 |
| [BE-75](../tasks/BE-75.md) | Lê Phú Thịnh | 3 | 13 | 17 |
| [BE-76](../tasks/BE-76.md) | Lê Phú Thịnh | 8 | 17 | 17 |
| [DEP-09](../tasks/DEP-09.md) | Mai Sơn Việt | 3 | 12 | 16 |
| [DEP-10](../tasks/DEP-10.md) | Trần Nguyễn Hữu Khánh | 2 | 12 | 16 |
| [KAFKA-02](../tasks/KAFKA-02.md) | Trần Đức Anh | 5 | 12 | 17 |
| [KAFKA-03](../tasks/KAFKA-03.md) | Lê Phú Thịnh | 5 | 12 | 17 |
| [KAFKA-05](../tasks/KAFKA-05.md) | Lê Phú Thịnh | 3 | 12 | 17 |
| [KAFKA-06](../tasks/KAFKA-06.md) | Cao Tất Thành | 5 | 13 | 17 |
| [KAFKA-07](../tasks/KAFKA-07.md) | Mai Sơn Việt | 8 | 13 | 17 |
| [KAFKA-08](../tasks/KAFKA-08.md) | Mai Sơn Việt | 8 | 13 | 17 |
| [KAFKA-09](../tasks/KAFKA-09.md) | Trần Đức Anh | 8 | 13 | 17 |
| [KAFKA-10](../tasks/KAFKA-10.md) | Mai Sơn Việt | 8 | 14 | 17 |
| **Tổng** | **37 TASK** | **247** | **540** | **627** |

Số dòng là kiểm kê tiêu chí, **không phải số test đã chạy, coverage phần trăm hoặc công phát sinh**. Nhiều dòng hơn không tự chứng minh chất lượng; tiêu chí phải có fixture/expected/evidence và thuộc phạm vi đã chốt. Các DoD chung lặp ở từng file để dev đọc độc lập, không cộng công riêng.

## Lịch sử và cách cập nhật tiếp

- Bản cũ lưu ở `architechture/tasks/history/2026-11-08-before-detail-rewrite/`, chỉ lịch sử; không đếm thành task mới hoặc đọc SP nguồn như hiện hành. Bản này được giữ vì nhiều thay đổi trước đó chưa commit.
- Nội dung cũ có câu mâu thuẫn hoặc AC toàn hệ thống lặp: bản hiện hành phân định lại owner/handoff theo API/RBAC và quyết định gộp. Nếu phát hiện yêu cầu đã duyệt chưa được thể hiện đủ, owner bổ sung vào task chính và ghi nguồn, không tạo lại INT/TEST hoặc âm thầm coi ngoài scope.
- Trước ghi Lark, đọc lại trạng thái/attachment/PIC và chuyển đúng detail vào 37 record hiện hành; không dùng snapshot để ghi đè tiến độ/evidence mới. Chưa thực hiện bước đó trong lượt này.
- Dev cập nhật mẫu kết quả trong từng task bằng actual/evidence, chốt Qxx với owner, giữ BLOCKED cho upstream thiếu. Không tự tuyên bố PASS hoặc giảm security/AC để ép SP.
