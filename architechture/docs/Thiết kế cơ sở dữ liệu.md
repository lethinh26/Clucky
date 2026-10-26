# THIẾT KẾ CƠ SỞ DỮ LIỆU
## Hệ thống website bán hàng thức ăn nhanh

Nguyên tắc: mỗi microservice sở hữu schema riêng; không khóa ngoại (foreign key)ข้าม schema — liên kết xuyên service bằng ID và qua API/sự kiện. Trong môi trường đồ án, tất cả schema nằm chung 1 instance PostgreSQL trên VPS. Sơ đồ quan hệ tổng quát xem tại diagrams/ERD_TongQuat.svg.

Kiểu dữ liệu quy ước: khóa chính `id` kiểu BIGINT (identity) hoặc UUID tùy service (thống nhất BIGINT trong tài liệu này); tiền tệ `amount` kiểu NUMERIC(12,0) — đơn vị VND, không dùng số thực; thời gian `TIMESTAMPTZ`; trạng thái dùng ENUM (lưu dạng VARCHAR có check constraint).

---

# 1. IDENTITY SERVICE — identity_db
| Bảng | Cột chính | Mô tả |
|---|---|---|
| users | id, email (unique), phone (unique), password_hash, full_name, avatar_url, avatar_public_id, role (CUSTOMER/STAFF/STORE_MANAGER/ADMIN/SHIPPER), store_id (nullable, với STAFF/MANAGER/SHIPPER), status (ACTIVE/LOCKED), created_at, updated_at | Tài khoản mọi role; store_id là căn cứ ép phạm vi dữ liệu |
| addresses | id, user_id, receiver_name, phone, province, district, ward, detail, is_default | Sổ địa chỉ của khách |
| refresh_tokens | id, user_id, token_hash, expires_at, revoked | Quản lý refresh token |
| otp_codes | id, identifier (email/phone), code_hash, purpose (REGISTER/RESET), expires_at, used | Hoặc lưu Redis thay cho bảng này |
| shifts | id, store_id, name, start_time, end_time | Ca làm việc do Manager định nghĩa |
| staff_schedules | id, staff_id, store_id, shift_id, work_date, status | Lịch phân ca cho Staff |
| audit_logs | id, actor_id, actor_role, action, target_type, target_id, store_id, detail (JSONB), created_at | Nhật ký thao tác quản trị (service khác gửi sự kiện ghi vào đây qua Report/Identity tùy triển khai — mặc định: Review & Report Service lưu trữ, bảng tương tự) |

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
| payments | id, order_id, order_code, method (BANK_TRANSFER/COD), amount, status (PENDING/PAID/EXPIRED/MISMATCH/COLLECTED/REFUND_PENDING/REFUNDED), qr_content, expires_at, paid_at | Giao dịch thanh toán theo đơn (1 đơn có thể có nhiều bản ghi nếu tạo lại QR) |
| bank_transactions | id, bank_tx_id (unique — khóa idempotency), bank_account, amount, content, received_at, matched_order_code, raw_payload (JSONB) | Giao dịch ngân hàng nhận từ webhook SePay/Casso |
| webhook_logs | id, provider (SEPAY/CASSO), signature_valid, payload (JSONB), processed, created_at | Nhật ký webhook phục vụ đối soát và debug (Admin xem) |
| bank_accounts_config | id, bank_name, account_no, account_name, is_active | Tài khoản nhận tiền do Admin cấu hình (có thể chuyển thành biến môi trường) |

Quy tắc đối chiếu: một bank_transactions.bank_tx_id chỉ được xử lý 1 lần; khớp khi nội dung chứa order_code và amount bằng payments.amount của giao dịch PENDING tương ứng.

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
| audit_logs | id, actor_id, actor_role, store_id, action, target_type, target_id, detail (JSONB), created_at | Nhật ký thao tác quản trị toàn hệ thống (nếu không lưu ở Identity Service) |

# 9. QUY ƯỚC CHUNG
- Mọi bảng có created_at, updated_at; xóa mềm (is_deleted / status) với dữ liệu nghiệp vụ quan trọng (món, chi nhánh, tài khoản) — không xóa cứng đơn hàng và giao dịch.
- Chỉ mục (index) tối thiểu: orders(customer_id), orders(store_id, status), order_items(order_id), payments(order_code), bank_transactions(bank_tx_id unique), vouchers(code unique), store_products(store_id, product_id unique), reviews(product_id).
- Dữ liệu xuyên service (ví dụ Report cần tên món) lấy qua snapshot trong order_items hoặc gọi API nội bộ, không joinข้าม schema.


## 10. CLOUDINARY METADATA

Không lưu binary trong PostgreSQL. Các service chỉ lưu `secure_url` và `public_id` cùng metadata cần thiết. `public_id` là khóa dùng để thay/xóa asset trên Cloudinary; cleanup asset cũ chỉ chạy sau khi metadata mới đã commit.
