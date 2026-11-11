# THIẾT KẾ CƠ SỞ DỮ LIỆU
## Hệ thống website bán hàng thức ăn nhanh

Nguyên tắc: mỗi microservice sở hữu schema riêng; không khóa ngoại (foreign key)ข้าม schema — liên kết xuyên service bằng ID và qua API/sự kiện. Trong môi trường đồ án, tất cả schema nằm chung 1 instance PostgreSQL trên VPS. Sơ đồ quan hệ tổng quát xem tại diagrams/ERD_TongQuat.svg.

Kiểu dữ liệu quy ước: khóa chính `id` kiểu BIGINT (identity) hoặc UUID tùy service (thống nhất BIGINT trong tài liệu này); tiền tệ `amount` kiểu NUMERIC(12,0) — đơn vị VND, không dùng số thực; thời gian `TIMESTAMPTZ`; trạng thái dùng ENUM (lưu dạng VARCHAR có check constraint).

---

# 1. IDENTITY SERVICE — identity_db
| Bảng | Cột chính | Mô tả |
|---|---|---|
| users | id, email (unique), phone (unique, nullable), password_hash (NOT NULL), firebase_uid (unique, nullable; migration V4), full_name, avatar_url, avatar_public_id, role (CUSTOMER/STAFF/STORE_MANAGER/ADMIN/SHIPPER), store_id (nullable, với STAFF/MANAGER/SHIPPER), status (ACTIVE/LOCKED), email_verified, created_at, updated_at | Một Customer/email dùng chung Google và mật khẩu; Google mới chỉ tạo user sau complete-password, trước đó giữ pending Redis 10 phút. User email đã xác minh được link UID không đổi password/userId. store_id ép phạm vi dữ liệu; PostgreSQL là nguồn user/role/status. |
| addresses | id, user_id, receiver_name, phone, province, district, ward, detail, is_default | Sổ địa chỉ của khách |
| refresh_tokens | id, user_id, token_hash, expires_at, revoked | Quản lý refresh token |
| otp_codes | id, identifier (email/phone), code_hash, purpose (REGISTER/RESET), expires_at, used | Hoặc lưu Redis thay cho bảng này |
| shifts | id, store_id, name, start_time, end_time | Ca làm việc do Manager định nghĩa |
| staff_schedules | id, staff_id, store_id, shift_id, work_date, status | Lịch phân ca cho Staff |

# 2. CATALOG & STORE SERVICE — catalog_db
| Bảng | Cột chính | Mô tả |
|---|---|---|
| stores | id, name, address, phone, open_time, close_time, status (OPEN/CLOSED_TEMP/ACTIVE/INACTIVE), delivery_area (mô tả khu vực giao), created_at | Chi nhánh |
| categories | id, name, image_url, sort_order, is_active | Danh mục món (Gà rán, Burger, Combo, Phụ, Tráng miệng, Nước) |
| products | id, category_id, name, description, base_price, image_url, image_public_id, kcal, spicy_level, is_active | Món ăn gốc (dữ liệu toàn chuỗi do Admin quản lý) |
| product_options | id, product_id, group_name (ví dụ: Size), name (ví dụ: Lớn), extra_price | Tùy chọn món: size, số miếng, mức cay... |
| product_toppings | id, product_id, topping_name, extra_price | Món phụ/topping cộng thêm |
| combos | id, name, description, combo_price, image_url, image_public_id, start_at, end_at, is_active | Combo cố định |
| combo_items | id, combo_id, product_id, quantity, option_id (nullable) | Thành phần của combo |
| store_products | id, store_id, product_id, store_price (nullable — ghi đè giá gốc nếu có), is_available, is_sold_out | Tình trạng bán của món tại từng chi nhánh (Staff/Manager cập nhật is_sold_out) |
| store_inventory | id, store_id, product_id, quantity_available, low_stock_threshold, updated_by, updated_at | Kho cơ bản theo món tại chi nhánh |

# 3. CART & ORDER SERVICE — order_db (+ Redis cho giỏ)
Giỏ hàng lưu trên Redis: key `cart:{userId}`, value là danh sách {productId/comboId, optionIds, toppingIds, quantity, note, storeId}. Khi checkout thành công, giỏ được xóa.

| Bảng | Cột chính | Mô tả |
|---|---|---|
| orders | id, order_code (unique, dùng làm nội dung chuyển khoản), customer_id, store_id, type (DELIVERY/PICKUP), status, subtotal, discount_amount, points_used, points_amount, shipping_fee, total_amount, voucher_code (nullable), receiver_name, receiver_phone, delivery_address, note, scheduled_at, created_at, updated_at | Đơn hàng — bảng trung tâm |
| order_items | id, order_id, item_type (PRODUCT/COMBO), product_id, combo_id, item_name (snapshot), unit_price (snapshot), quantity, options_snapshot (JSONB), toppings_snapshot (JSONB), note, line_total | Chi tiết đơn; lưu snapshot tên/giá để hóa đơn không đổi khi Admin sửa menu sau này |
| order_status_history | id, order_id, from_status, to_status, changed_by, changed_role, reason, created_at | Lịch sử đổi trạng thái phục vụ tracking và audit |
| refund_requests | id, order_id, customer_id, amount, reason, status (PENDING/APPROVED/REJECTED/REFUNDED), reviewed_by, reviewed_at | Yêu cầu hoàn tiền khi hủy đơn đã thanh toán |
| party_orders | id, customer_id, store_id, contact_name, phone, expected_date, guest_count, content, status (NEW/CONTACTED/QUOTED/CONFIRMED/CLOSED) | Đơn tiệc / đơn lớn |

Trạng thái đơn (orders.status): PENDING_PAYMENT, CONFIRMED, PREPARING, READY, SHIPPING, COMPLETED, CANCELLED (xem State_TrangThaiDonHang).

# 4. PAYMENT SERVICE — payment_db
| Bảng | Cột chính | Mô tả |
|---|---|---|
| payments | id, order_id, order_code, method, amount, status, expires_at, paid_at, live_payment, received_amount, receipt_proposed, closed_reason | Phiên live mới duy nhất/đơn, snapshot ngân hàng/reference/deadline bất biến; legacy giữ nguyên |
| bank_transactions | id, bank_tx_id (unique — khóa idempotency), bank_account, amount, content, received_at, matched_order_code, raw_payload (JSONB), payment_id | Receipt bất biến, nhiều khoản có thể cấp tiền cho một payment; DTO không trả raw payload |
| webhook_logs | id, provider, signature_valid, payload (JSONB), processed, created_at | Schema nền; P1 chỉ dùng SEPAY/API Key, không trả raw payload qua UI |
| bank_accounts_config | id, bank_name, bank_code, account_no, account_name, is_active, version | Admin quản lý trong DB, không biến môi trường ngân hàng |

Bổ sung 09/11/2026: khôi phục nguyên bản V4__payment_attempts_and_delivery đã áp trên database từ commit 6d5df8b; V5 mới thêm version cho bank_accounts_config, version/updated_at và account nullable cho store_bank_accounts. Giữ bank_code/unique identity của V4 và assignment hiện hữu. FK account chỉ nội bộ Payment, storeId không FK chéo Catalog. bank_operations lưu key/hash/response bền theo actor; bank_audit_outbox lưu event để phát lại audit sau commit. Không sửa payments/transactions legacy hoặc tự suy diễn snapshot/ngân hàng. Chi tiết: [bàn giao mốc ngân hàng](../specs/rbac-branch-operations/P1-bank-accounts-handoff.md).

V6 bổ sung fingerprint, bank_occurred_at/last_seen_at, replay/conflict counts và candidate_payment_id/candidate_order_code vào bank_transactions; sepay_receipt_conflicts giữ từng fingerprint bất thường, không ghi đè receipt gốc. Matcher normalized contains chỉ lưu ứng viên chờ đối soát, chưa allocation/PAID. Xem [bàn giao intake](../specs/rbac-branch-operations/P1-sepay-intake-handoff.md).

V7 Payment thêm live_payment (mặc định false), received_amount NUMERIC(20,0), receipt_proposed và closed_reason; nới transfer_content lên 128, unique một live payment/order, constraint snapshot, bỏ unique một bankTx/payment để cho phép cộng dồn. payment_outbox.live_dispatch mặc định false: dispatcher mới chỉ phát event do luồng live tạo, không vô tình phát outbox legacy. Không sửa V1–V6/không xóa dữ liệu.

V7 Order thêm orders.payment_expires_at và payment_decisions (payment_id unique, event_id unique, order_id FK nội bộ, decision). Deadline 15 phút và quyết định xác nhận/hủy/hết hạn thuộc Order; khóa hàng chung với cancellation. Payment không join/FK sang schema Order. Outbox giữ event/correlation và ACK sau commit. Không suy từ ACK webhook hoặc allocation thành Order đã thanh toán; xem [bàn giao live payment](../specs/rbac-branch-operations/P1-live-payment-handoff.md).

# 5. PROMOTION & LOYALTY SERVICE — promotion_db
| Bảng | Cột chính | Mô tả |
|---|---|---|
| vouchers | id, code (unique), type (PERCENT/AMOUNT), value, min_order_amount, max_discount, total_limit, used_count, start_at, end_at, scope (ALL/STORE), store_id (nullable), status, created_by, approved_by | Voucher toàn chuỗi hoặc riêng chi nhánh (chi nhánh tạo ở trạng thái chờ Admin duyệt) |
| voucher_usages | id, voucher_id, customer_id, order_id, used_at | Lượt dùng voucher |
| banners | id, title, image_url, link_url, position, start_at, end_at, is_active | Banner trang chủ |
| member_points | id, customer_id (unique), total_points, tier (MEMBER/SILVER/GOLD), updated_at | Điểm hiện tại của khách |
| point_transactions | id, customer_id, order_id, change (+/-), balance_after, type (EARN/REDEEM/ADJUST), created_at | Lịch sử điểm |
| loyalty_config | id, earn_rate (VNĐ → điểm), redeem_rate (điểm → VNĐ), updated_by | Cấu hình do Admin đặt (bảng 1 dòng hiệu lực) |

# 6. SHIPPING SERVICE — shipping_db
| Bảng | Cột chính | Mô tả |
|---|---|---|
| shipments | id, order_id, store_id, shipper_id (nullable, Phase 2), customer_name, phone, address, fee, distance_km (nullable), status (CREATED/ASSIGNED/PICKED_UP/SHIPPING/DELIVERED/FAILED), cod_amount, created_at, updated_at | Bản ghi giao hàng — MVP chỉ tạo ở trạng thái CREATED |
| shipment_status_history | id, shipment_id, status, changed_by, note, created_at | Lịch sử giao hàng (Phase 2 dùng đầy đủ) |
| shipping_fee_config | id, store_id (nullable = toàn hệ thống), base_fee, per_km_fee, free_from_amount, area_note | Cấu hình phí ship (Admin đặt, có thể ghi đè theo quán) |

# 7. NOTIFICATION SERVICE — notification_db
| Bảng | Cột chính | Mô tả |
|---|---|---|
| notifications | id, user_id, title, content, type (ORDER/PAYMENT/PROMOTION/SYSTEM), ref_id (order_id...), is_read, created_at | Thông báo in-app |
| email_logs | id, message_id (unique), event_id, to_email, subject, template, provider (GMAIL_SMTP), status (QUEUED/SENDING/SENT/FAILED), retry_count, last_error, sent_at | Nhật ký Mail Sender; không lưu App Password |
| mail_templates | id, template_key (unique), subject_template, body_template, is_active, updated_at | Template email transactional do hệ thống quản lý |

# 8. REVIEW & REPORT SERVICE — review_db
| Bảng | Cột chính | Mô tả |
|---|---|---|
| reviews | id, customer_id, product_id, order_id, rating (1-5), comment, status (VISIBLE/HIDDEN), created_at | Đánh giá món gắn với đơn đã hoàn thành |
| review_replies | id, review_id, responder_id, responder_role, content, created_at | Phản hồi của Staff/Manager/Admin |
| daily_store_stats | id, store_id, stat_date, order_count, revenue, cod_amount, transfer_amount | Số liệu tổng hợp ngày theo quán (consumer Kafka cập nhật) — phục vụ dashboard/báo cáo nhanh |

# 9. AUDIT SERVICE — audit_db
| Bảng | Cột chính | Mô tả |
|---|---|---|
| audit_logs | id, event_id (unique), correlation_id, source_service, actor_id, actor_role, store_id, action, target_type, target_id, detail (JSONB), occurred_at, created_at | Bảng duy nhất tại audit_service.audit_logs; ghi mọi thay đổi thành công trên trang quản trị của Staff/Manager/Admin, tách khỏi Review & Report |

- Backend nghiệp vụ phát sự kiện với actor/role từ ngữ cảnh xác thực, store của đối tượng bị tác động và dữ liệu thay đổi thực tế; không tin thông tin audit do frontend gửi.
- `detail.before` / `detail.after` chỉ chứa trường thay đổi được phép lưu; `detail.reason` lưu lý do nếu nghiệp vụ yêu cầu. Loại mật khẩu/hash, OTP, token và secret trước khi phát sự kiện. `occurred_at` là thời điểm thay đổi; `created_at` là thời điểm lưu audit.
- Audit Service ghi thêm bản ghi, chống trùng bằng `event_id`; không có API sửa/xóa audit. Admin đọc toàn hệ thống; Manager chỉ đọc thao tác Staff thuộc quán mình theo RBAC hiện có.
- Đây là schema đích cho cài mới. Không tự xóa bảng audit cũ trong DB đang chạy; cần kế hoạch chuyển dữ liệu đã đối chiếu và migration mới trước khi ngừng bảng cũ.

# 10. QUY ƯỚC CHUNG
- Mọi bảng có created_at, updated_at; xóa mềm (is_deleted / status) với dữ liệu nghiệp vụ quan trọng (món, chi nhánh, tài khoản) — không xóa cứng đơn hàng và giao dịch.
- Chỉ mục (index) tối thiểu: orders(customer_id), orders(store_id, status), order_items(order_id), payments(order_code), bank_transactions(bank_tx_id unique), vouchers(code unique), store_products(store_id, product_id unique), reviews(product_id).
- Dữ liệu xuyên service (ví dụ Report cần tên món) lấy qua snapshot trong order_items hoặc gọi API nội bộ, không joinข้าม schema.


## 11. CLOUDINARY METADATA

Không lưu binary trong PostgreSQL. Các service chỉ lưu `secure_url` và `public_id` cùng metadata cần thiết. `public_id` là khóa dùng để thay/xóa asset trên Cloudinary; cleanup asset cũ chỉ chạy sau khi metadata mới đã commit.
# Bổ sung S1: phí ship và bán kính (09/11/2026)

- Catalog migration V9: `catalog_service.stores.delivery_radius_km NUMERIC(7,2) NULL CHECK (>0)`, `version BIGINT NOT NULL DEFAULT 0` cho optimistic locking. Không tự suy diễn bán kính từ mô tả delivery_area cũ.
- Shipping migration V5: `shipping_service.shipping_policy` có một dòng id=1, fee NUMERIC(12,0) NULL CHECK (>0), version BIGINT và updated_at TIMESTAMPTZ. Khởi tạo fee NULL, không tự lấy phí seed 15.000 hay ví dụ 20.000. V4 shipment identity/location đã tồn tại trong database, khôi phục nguyên bản từ commit 6d5df8b; không repair checksum.
- `shipping_fee_config` cũ giữ nguyên để bảo toàn lịch sử; luồng tính phí mới không đọc bảng này. Phí đơn/shipment đã tạo không bị cập nhật theo policy mới. Không thêm FK/SQL qua service.

