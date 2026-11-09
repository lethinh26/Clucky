# Bộ spec — RBAC và vận hành chi nhánh

Ngày: 08/11/2026. **F1–F4 đã sửa mã, chưa nghiệm thu chức năng; A–E vẫn là đặc tả.** Xem [bàn giao F1–F4, ma trận API và checklist](F1-F4-handoff.md).

Nguồn: [Replan v1.0](../../plans/RBAC_Branch_Operations_Replan_2026-11-08.md), [thuật ngữ](../../../CONTEXT.md). Không mở lại Q1–Q10; hai luồng chi trả ở mục 12 vẫn tạm hoãn.

## Danh mục và phụ thuộc

Mỗi dòng là một spec để giao triển khai khi đủ phụ thuộc, không phải ticket đã tạo hoặc tính năng đã DONE. Đọc từng spec cùng quy tắc chung tại đây.

| ID | Spec | Mục plan | Phụ thuộc/điểm mở chức năng |
|---|---|---|---|
| F1 | [Policy và điểm vào](F1-policy-entrypoints.md) | §3, §4 F1 | Thống nhất quyền trước |
| F2 | [Quyền API và scope](F2-api-scope.md) | §4 F2 | F1 |
| F3 | [Order/Payment hiện hữu](F3-order-payment-fixes.md) | §4 F3 | F1; phối hợp F2 |
| F4 | [Dữ liệu thật và lỗi](F4-honest-ui.md) | §4 F4 | F1–F3 để đóng Đợt 1 |
| A1 | [Cặp tài khoản và kích hoạt](A1-branch-account-provisioning.md) | §5.1 | Đợt 1; A3 trước áp unique dữ liệu cũ |
| A2 | [Recovery và phiên](A2-account-recovery.md) | §5.2 | A1, Notification |
| A3 | [Chuyển đổi và audit](A3-account-migration.md) | §5.3 | Admin duyệt mapping; phối hợp A1/A2 |
| B1 | [Workspace Staff](B1-staff-workspace.md) | §6.1 | Đợt 1; action mở theo B2/B3/B4/C2/C4 |
| B2 | [Nhập đơn nhanh](B2-counter-orders.md) | §6.2 | API giá/tồn; thu tiền đợi C4 |
| B3 | [Xử lý đơn và bàn giao](B3-order-handover.md) | §6.3 | F3, C4 cho thao tác thu |
| B4 | [Cấu hình quán và kho](B4-store-inventory.md) | §6.4 | F1/F2, Catalog, Notification |
| C1 | [Ngân hàng và gán quán](C1-bank-accounts.md) | §7.1 | Đợt 1, xác minh store qua Catalog |
| C2 | [Mã và phân loại giao dịch](C2-transfer-classification.md) | §7.2 | C1, Order; điều kiện mở Tiền vào |
| C3 | [Cộng dồn và đối soát](C3-bank-reconciliation.md) | §7.3 | C1/C2, feed xác thực; phối hợp C4 |
| C4 | [Thu tiền tại quầy](C4-counter-collection.md) | §7.4 | C1/C2, contract C3; không bắt có feed để thu thủ công |
| D1 | [Refund basic](D1-basic-refunds.md) | §8.1–8.2 | C3/C4, F3; hoàn tất đợi D2 |
| D2 | [Bằng chứng riêng tư](D2-refund-evidence.md) | §8.3 | D1, Cloudinary delivery hạn chế |
| D3 | [Thông báo refund](D3-refund-notifications.md) | §8.4 | D1/D2, Kafka, Notification |
| E1 | [Reports, Reviews, Audit, tài liệu](E1-integration-docs.md) | §9 | Các phần liên quan được nghiệm thu |

Mốc `D1` của plan là **Đợt 1**, khác spec `D1-basic-refunds`; giao việc bằng ID kèm tên. D2B và D2C phối hợp, không mở thao tác tiền ở D2B khi D2C chưa sẵn sàng.

## Quy tắc chung bắt buộc

- Giữ hai frontend độc lập, Gateway, Config Server/Eureka và service hiện có. Không thêm service hoặc cross-service SQL/FK; migration Flyway mới tại service sở hữu.
- Backend quyết định actor/role/store/ownership/state. STAFF/STORE_MANAGER lấy store từ danh tính đã xác minh; thiếu store thì từ chối, không fallback toàn chuỗi. ADMIN chọn store rõ khi tác nghiệp quán; CUSTOMER chỉ tài nguyên của mình.
- Cấm tạo/promote ADMIN qua UI/API, không thay các Admin hiện hữu. DTO allowlist và validate boundary; không expose entity.
- Lỗi giữ `timestamp, status, error, code, message, path` theo [contract chung](../../../contracts/README.md). Mã mới khai báo catalog; phân biệt xác thực, quyền, không tồn tại, state/version conflict; không raw exception hoặc rò dữ liệu khác quán.
- Audit server-side gồm actor/role/store/target/time/result/correlation và session nếu có. Không tin actor/audit client; không log OTP/token/password hoặc dữ liệu ngân hàng nhạy cảm đầy đủ.
- Idempotency lưu bền theo operation/key/nội dung và scope actor/store phù hợp; replay cùng nội dung trả cùng kết quả, key cũ khác nội dung bị từ chối. Race chặn transaction/unique/version, không chỉ disable nút.
- Event phản ánh commit thật, có event/correlation ID theo contract repo; retry/replay không nhân đôi. Có cơ chế phát lại bền khi commit/publish lệch nhau.
- Tiền VND chính xác, không float, validate không âm và giới hạn kiểu dữ liệu. Tách giá trị đơn, thực nhận, Staff khai, chấp nhận thủ công, dư và hoàn.
- UI theo [Brand Guidelines](../../docs/Brand_Guidelines.md), Fredoka/Quicksand, vi/en, bàn phím/focus/nhãn trạng thái. Giữ logo/favicon.

## Mức độ chốt contract và nguồn

Quyền và nghiệp vụ theo plan đã chốt. Tên operation/DTO/field, trạng thái mới, mẫu `CLUCKY-001-<maDonDuyNhat>`, một tài khoản nhận hiện hành/quán và schema là **đề xuất kỹ thuật**, không khẳng định endpoint/enum đã tồn tại. Trước khi nối API/UI, đối chiếu source mới nhất và ghi wire contract vào API/database/events; giữ tương thích QR/dữ liệu cũ. OTP/activation/upload/retry dùng cấu hình phù hợp hiện có; giá trị còn thiếu phải được ghi cụ thể trong contract triển khai, không coi số tự chọn là yêu cầu đã duyệt.

Đối chiếu [SRS](../../docs/SRS.md), [RBAC](../../docs/Ma%20trận%20phân%20quyền.md), [API](../../docs/Đặc%20tả%20API.md), [database](../../docs/Thiết%20kế%20cơ%20sở%20dữ%20liệu.md), [kiến trúc](../../docs/Kiến%20trúc%20hệ%20thống.md) và [backlog](../../docs/backlog.md). Tài liệu thực tế ở `architechture/docs`. [Audit 08/11](../../docs/RBAC_Audit_2026-11-08.md) giữ nguyên giá trị lịch sử, không phải kết quả test hiện tại.

Bộ spec thay phần ca/check-in cá nhân, dashboard Staff, sửa số lượng kho của Staff, hủy PREPARING và cấm Staff thu thủ công trong [spec Staff cũ](../staff-shift-workflow.md); không mở Party/Shipping từ spec cũ. E1 giao đồng bộ tài liệu chuẩn, ghi rõ phần chưa làm. Lượt này không đổi trạng thái/PIC/SP/sprint backlog/Lark hoặc tự tạo issue/gắn nhãn.

Đã đối chiếu tĩnh controller Auth/Order/Refund, template User/Payment, schema Order bắt buộc customer và test sẵn có; template không chứng minh endpoint hoạt động. Workspace có thay đổi dở dang: spec không ghi đè hoặc tuyên bố đã sửa chúng.

## Ngoài phạm vi chung

Không chi trả dư hoặc phần đã chuyển cho đơn hết hạn; không nút/API/event chi trả hai nhóm này. Vẫn lưu/hiển thị chưa xử lý, không gắn REJECTED/REFUNDED vì hoãn hoặc tính dư vào doanh thu. Đủ/dư vẫn xác nhận đơn hợp lệ; expiry không mở lại đơn.

Không POS đầy đủ, chạy mất mạng, máy in/két tiền, công nợ/miễn tiền, ca/PIN cá nhân, kho nguyên liệu/công thức/ngưỡng từng món, khiếu nại sau chế biến/hoàn thành, voucher proposal, đơn tiệc, shipper/tracking/đối tác giao hàng. MVP chỉ tạo shipment theo kiến trúc hiện có.

## Nghiệm thu và triển khai

Ưu tiên boundary cao nhất: qua Gateway với JWT đúng/sai role, quan sát DTO/trạng thái bền sau reload. Webhook/race/OTP/asset riêng tư kiểm chứng thêm tại boundary chuyên biệt. Testing Decisions là **kế hoạch/chưa chạy**, không phải bằng chứng pass.

Mỗi mốc phải có API + UI + quyền/state/lỗi; chỉ rebuild service bị ảnh hưởng bằng `./start-docker.ps1 -Services ...`, chờ script/health, báo container và giữ volumes. Không tự chạy test/lint/typecheck riêng hoặc browser. Lượt tạo spec chỉ Markdown; lượt triển khai F1–F4 có rebuild theo bàn giao. Đóng mốc khi người dùng nghiệm thu tiêu chí và có bảng endpoint/action/role cùng danh sách còn khóa; viết spec/build thành công không thay thế kiểm thử chức năng.
