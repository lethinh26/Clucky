# SPEC — Quy trình Ca trực Nhân viên (Staff)

Phiên bản: 0.2 (đã chốt Q1, Q2, Q3, Q5, Q6; còn Q4) — 28/10/2026
Nguồn: `docs/SRS.md` (FR-STF-01..10, Mục 5.1–5.4), `docs/Ma trận phân quyền.md` (#13–#25, #40), `docs/Đặc tả API.md`, `TASK-PLAN.md`.
Màn hình: React admin — `frontend/react/src/pages/Staff/StaffOrdersPage.tsx`.

## 1. Mục tiêu
Thống nhất một quy trình xử lý đơn trong ca cho Staff, đúng máy trạng thái và RBAC trong docs, làm căn cứ chung cho FE, BE và người làm các task liên quan.

## 2. Phạm vi
- Trong phạm vi: xử lý đơn trong ca, hủy/từ chối, thu COD, báo sai lệch chuyển khoản, lịch ca, tổng kết ca, bật/tắt món, tiếp nhận đơn tiệc.
- Ngoài phạm vi: POS, KDS, shipper nội bộ, tích hợp API thật với đối tác giao hàng, duyệt hoàn tiền (Manager/Admin), xác nhận thanh toán thủ công (Manager/Admin).

## 3. Ràng buộc chung
- `storeId` của Staff lấy từ JWT; backend ép `storeId` trên mọi truy vấn. Gọi đơn của quán khác trả 403. UI không cho chọn chi nhánh.
- Mọi thao tác hủy/từ chối ghi audit log: actor, role, storeId, hành động, đối tượng, thời gian.
- Staff chỉ xem thông tin khách trong đơn của quán mình.
- Staff phải check-in ca trước khi thao tác đơn; trước check-in chỉ được xem. Kết thúc ca bằng check-out.

## 4. Máy trạng thái áp dụng

### 4.1. Đơn hàng
```
PENDING_PAYMENT ──(webhook PAID)──> CONFIRMED ──> PREPARING ──> READY ──> COMPLETED      (PICKUP)
COD tạo thẳng ─────────────────────> CONFIRMED                    READY ──(bàn giao đối tác)──> SHIPPING ──(đối tác báo đã giao)──> COMPLETED (DELIVERY)
PENDING_PAYMENT / CONFIRMED / PREPARING ──(lý do bắt buộc)──> CANCELLED
```
DELIVERY do đối tác thứ 3 (GrabFood/ShopeeFood) giao. MVP chỉ làm giao diện như đã chuyển cho đối tác; tích hợp API đối tác là việc sau.

### 4.2. Thanh toán
Tuân thủ SRS 5.3; enum dùng chung FE/BE: `UNPAID, PENDING, PAID, EXPIRED, MISMATCH, COLLECTED, REFUND_PENDING, REFUNDED`.
- Chuyển khoản: `UNPAID → PENDING → PAID / EXPIRED / MISMATCH`; chỉ webhook SePay/Casso hoặc Manager/Admin (thủ công) đổi trạng thái.
- COD: `UNPAID → COLLECTED` khi Staff xác nhận thu.
- Hoàn tiền: `PAID → REFUND_PENDING → REFUNDED`; Refund Request `PENDING → APPROVED/REJECTED → REFUNDED`.

## 5. Quy tắc thao tác của Staff

| Trạng thái đơn | Điều kiện | Hành động cho phép | API |
|---|---|---|---|
| PENDING_PAYMENT | — | Chỉ xem ("Chờ khách chuyển khoản") | — |
| CONFIRMED | — | Bắt đầu nấu → PREPARING; Hủy/Từ chối (lý do) | `PUT /api/orders/{id}/status`, `PUT /api/orders/{id}/reject` |
| PREPARING | — | Báo xong món → READY; Hủy/Từ chối (lý do) | như trên |
| READY | PICKUP, đã thanh toán / COD đã COLLECTED | Đã giao cho khách → COMPLETED | `PUT /api/orders/{id}/status` |
| READY | PICKUP, COD chưa thu | Xác nhận thu COD trước, sau đó mới hoàn thành | `PUT /api/payments/{id}/confirm-cod` |
| READY | DELIVERY | Bàn giao đối tác giao hàng → SHIPPING | `PUT /api/orders/{id}/status` |
| SHIPPING | DELIVERY | Chỉ xem; đối tác báo đã giao → COMPLETED | (webhook đối tác — làm sau) |
| Bất kỳ | Chuyển khoản có nghi vấn | Báo sai lệch cho Manager | (chưa có API — xem Q4) |

Hủy đơn đã PAID chuyển khoản: đơn sang CANCELLED và hệ thống tạo Refund Request `PENDING` cho Manager duyệt. Staff không duyệt, không đánh dấu hoàn tiền.

Mọi hành động ở bảng trên chỉ hiện khi Staff đã check-in ca.

## 6. Hiện trạng và phân công

| # | Hạng mục | FR | BE | UI | Người phụ trách | Hiện trạng |
|---|---|---|---|---|---|---|
| 1 | Xử lý đơn trong ca (Mục 5) | FR-STF-03/04/05 | BE-25 | UI-30 | M3 — Trần Đức Anh | UI xong trên mock (nhánh `feature/M3-cart-order-sprint1`, chưa commit); chưa nối API |
| 2 | Lịch ca + check-in/check-out | FR-STF-01 | BE-01, BE-19 `/api/schedules`; **chưa có API check-in/out** | **Chưa có task** (nút check-in đã có trên mock) | BE: M1 — Trần Nguyễn Hữu Khánh; UI: **chưa gán** | Check-in mock ở state, chưa lưu |
| 3 | Tổng kết ca / Dashboard ca | FR-STF-02 | **Chưa có task** (tính theo khung check-in → check-out) | **Chưa có task** | **Chưa gán** | Chưa làm |
| 4 | Bật/tắt còn/hết món, kho | FR-STF-06/07 | BE-22, BE-54 | UI-31 `Staff/Inventory` | M2 — Nguyễn Duy Quang Nhật | Không làm trong trang Staff Orders |
| 5 | Tiếp nhận đơn tiệc tại quán | FR-STF-10 | BE-28 `/api/party-orders` | **Chưa có task** (UI-23 chỉ là form khách) | M3 — Trần Đức Anh (đề xuất) | Chưa làm |

## 7. Đề xuất bổ sung task (chờ nhóm duyệt)
- BE check-in/check-out ca: thêm API (ví dụ `POST /api/schedules/{id}/check-in`, `/check-out`) lưu giờ vào/ra thực tế vào `staff_schedules`. Gợi ý M1 (sở hữu BE-01/BE-19).
- UI Staff "Lịch ca của tôi": đọc `GET /api/schedules`, nối nút check-in/check-out. Người làm: chờ chốt.
- Tổng kết ca: BE tổng hợp đơn đã xử lý, COD đã thu, đơn hủy theo `storeId` trong khung check-in → check-out; UI hiển thị khi check-out. Người làm: chờ chốt.
- UI Staff tiếp nhận đơn tiệc: danh sách đơn tiệc quán mình, chuyển `NEW → CONTACTED`, chuyển Manager báo giá. Gán M3, gộp vào UI-30 hoặc tách task mới.

## 8. Quyết định đã chốt
- Q1. Staff được hủy đơn ở PREPARING, bắt buộc lý do.
- Q2. DELIVERY do đối tác thứ 3 (GrabFood/ShopeeFood) giao; UI làm như đã chuyển cho đối tác: READY → SHIPPING ("Đã chuyển đối tác giao") → COMPLETED khi đối tác báo.
- Q3. Enum thanh toán tuân thủ SRS 5.3 (đã cập nhật type FE ở cả Next.js và React).
- Q5. Cần check-in/check-out ca trên hệ thống.
- Q6. Chỉ dùng 2 font: Baloo 2 (tiêu đề) + Quicksand (nội dung); đã cập nhật Brand Guidelines và SRS NFR-06.

## 9. Câu hỏi còn mở
- Q4. "Báo sai lệch cho Manager" (FR-STF-05) chưa có endpoint trong Đặc tả API. Phương án đề xuất: thêm `POST /api/payments/{id}/mismatch-reports` (Staff, kèm ghi chú) → Payment Service ghi audit + phát Kafka để Notification báo Manager quán. Cần M4 (Payment) đồng ý.

## 10. Tiêu chí nghiệm thu (hạng mục 1)
- Staff quán A không thấy và không gọi được đơn quán B (403).
- Chưa check-in thì không có nút thao tác nào.
- Không có nút nấu cho đơn PENDING_PAYMENT.
- PICKUP: CONFIRMED → PREPARING → READY → COMPLETED; COD chưa COLLECTED thì không hoàn thành được.
- DELIVERY: READY → "Bàn giao đối tác giao hàng" → SHIPPING; Staff không có nút hoàn thành.
- Hủy/từ chối bắt buộc lý do, có audit log; đơn PAID bị hủy sinh Refund Request PENDING.
- Staff không có nút xác nhận chuyển khoản thủ công hay duyệt hoàn tiền.
