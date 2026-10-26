-- Clucky database bootstrap
-- PostgreSQL 16 / local development
-- The dump keeps one schema per bounded context. Cross-service links are IDs only.

CREATE SCHEMA IF NOT EXISTS identity_service;
CREATE SCHEMA IF NOT EXISTS catalog_service;
CREATE SCHEMA IF NOT EXISTS order_service;
CREATE SCHEMA IF NOT EXISTS payment_service;
CREATE SCHEMA IF NOT EXISTS promotion_service;
CREATE SCHEMA IF NOT EXISTS shipping_service;
CREATE SCHEMA IF NOT EXISTS notification_service;
CREATE SCHEMA IF NOT EXISTS review_report_service;

CREATE TABLE IF NOT EXISTS identity_service.users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(30) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  avatar_url TEXT,
  avatar_public_id VARCHAR(255),
  role VARCHAR(30) NOT NULL CHECK (role IN ('CUSTOMER','STAFF','STORE_MANAGER','ADMIN','SHIPPER')),
  store_id BIGINT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','LOCKED')),
  email_verified BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS identity_service.addresses (
  id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES identity_service.users(id),
  receiver_name VARCHAR(160) NOT NULL, phone VARCHAR(30) NOT NULL,
  province VARCHAR(100) NOT NULL, district VARCHAR(100) NOT NULL, ward VARCHAR(100) NOT NULL,
  detail VARCHAR(255) NOT NULL, is_default BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS identity_service.refresh_tokens (
  id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES identity_service.users(id),
  token_hash VARCHAR(255) NOT NULL UNIQUE, expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS identity_service.otp_codes (
  id BIGSERIAL PRIMARY KEY, identifier VARCHAR(255) NOT NULL, code_hash VARCHAR(255) NOT NULL,
  purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('REGISTER','RESET')), expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS identity_service.shifts (
  id BIGSERIAL PRIMARY KEY, store_id BIGINT NOT NULL, name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL, end_time TIME NOT NULL
);
CREATE TABLE IF NOT EXISTS identity_service.staff_schedules (
  id BIGSERIAL PRIMARY KEY, staff_id BIGINT NOT NULL REFERENCES identity_service.users(id),
  store_id BIGINT NOT NULL, shift_id BIGINT NOT NULL REFERENCES identity_service.shifts(id),
  work_date DATE NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED'
);

CREATE TABLE IF NOT EXISTS catalog_service.stores (
  id BIGSERIAL PRIMARY KEY, name VARCHAR(160) NOT NULL, address VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL, open_time TIME NOT NULL, close_time TIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', delivery_area TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS catalog_service.categories (
  id BIGSERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL, image_url TEXT, sort_order INT NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS catalog_service.products (
  id BIGSERIAL PRIMARY KEY, category_id BIGINT NOT NULL REFERENCES catalog_service.categories(id),
  name VARCHAR(180) NOT NULL, description TEXT NOT NULL, base_price NUMERIC(12,0) NOT NULL CHECK (base_price >= 0),
  image_url TEXT, image_public_id VARCHAR(255), kcal INT, spicy_level INT DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS catalog_service.product_options (
  id BIGSERIAL PRIMARY KEY, product_id BIGINT NOT NULL REFERENCES catalog_service.products(id),
  group_name VARCHAR(80) NOT NULL, name VARCHAR(100) NOT NULL, extra_price NUMERIC(12,0) NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS catalog_service.product_toppings (
  id BIGSERIAL PRIMARY KEY, product_id BIGINT NOT NULL REFERENCES catalog_service.products(id),
  topping_name VARCHAR(120) NOT NULL, extra_price NUMERIC(12,0) NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS catalog_service.combos (
  id BIGSERIAL PRIMARY KEY, name VARCHAR(180) NOT NULL, description TEXT NOT NULL,
  combo_price NUMERIC(12,0) NOT NULL, image_url TEXT, image_public_id VARCHAR(255),
  start_at TIMESTAMPTZ, end_at TIMESTAMPTZ, is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS catalog_service.combo_items (
  id BIGSERIAL PRIMARY KEY, combo_id BIGINT NOT NULL REFERENCES catalog_service.combos(id),
  product_id BIGINT NOT NULL REFERENCES catalog_service.products(id), quantity INT NOT NULL DEFAULT 1, option_id BIGINT
);
CREATE TABLE IF NOT EXISTS catalog_service.store_products (
  id BIGSERIAL PRIMARY KEY, store_id BIGINT NOT NULL REFERENCES catalog_service.stores(id),
  product_id BIGINT NOT NULL REFERENCES catalog_service.products(id), store_price NUMERIC(12,0),
  is_available BOOLEAN NOT NULL DEFAULT TRUE, is_sold_out BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(store_id, product_id)
);
CREATE TABLE IF NOT EXISTS catalog_service.store_inventory (
  id BIGSERIAL PRIMARY KEY, store_id BIGINT NOT NULL REFERENCES catalog_service.stores(id),
  product_id BIGINT NOT NULL REFERENCES catalog_service.products(id), quantity_available INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 10, updated_by BIGINT, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, product_id)
);

CREATE TABLE IF NOT EXISTS order_service.orders (
  id BIGSERIAL PRIMARY KEY, order_code VARCHAR(40) NOT NULL UNIQUE, customer_id BIGINT NOT NULL, store_id BIGINT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('DELIVERY','PICKUP')), status VARCHAR(30) NOT NULL,
  subtotal NUMERIC(12,0) NOT NULL, discount_amount NUMERIC(12,0) NOT NULL DEFAULT 0,
  points_used INT NOT NULL DEFAULT 0, points_amount NUMERIC(12,0) NOT NULL DEFAULT 0,
  shipping_fee NUMERIC(12,0) NOT NULL DEFAULT 0, total_amount NUMERIC(12,0) NOT NULL,
  voucher_code VARCHAR(80), receiver_name VARCHAR(160), receiver_phone VARCHAR(30), delivery_address TEXT,
  note TEXT, scheduled_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_service.order_items (
  id BIGSERIAL PRIMARY KEY, order_id BIGINT NOT NULL REFERENCES order_service.orders(id), item_type VARCHAR(20) NOT NULL,
  product_id BIGINT, combo_id BIGINT, item_name VARCHAR(180) NOT NULL, unit_price NUMERIC(12,0) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0), options_snapshot JSONB, toppings_snapshot JSONB, note TEXT, line_total NUMERIC(12,0) NOT NULL
);
CREATE TABLE IF NOT EXISTS order_service.order_status_history (
  id BIGSERIAL PRIMARY KEY, order_id BIGINT NOT NULL REFERENCES order_service.orders(id), from_status VARCHAR(30),
  to_status VARCHAR(30) NOT NULL, changed_by BIGINT, changed_role VARCHAR(30), reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_service.refund_requests (
  id BIGSERIAL PRIMARY KEY, order_id BIGINT NOT NULL REFERENCES order_service.orders(id), customer_id BIGINT NOT NULL,
  amount NUMERIC(12,0) NOT NULL, reason TEXT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'PENDING', reviewed_by BIGINT, reviewed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS order_service.party_orders (
  id BIGSERIAL PRIMARY KEY, customer_id BIGINT NOT NULL, store_id BIGINT NOT NULL, contact_name VARCHAR(160) NOT NULL,
  phone VARCHAR(30) NOT NULL, expected_date DATE NOT NULL, guest_count INT NOT NULL, content TEXT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'NEW'
);

CREATE TABLE IF NOT EXISTS payment_service.payments (
  id BIGSERIAL PRIMARY KEY, order_id BIGINT NOT NULL, order_code VARCHAR(40) NOT NULL, method VARCHAR(20) NOT NULL,
  amount NUMERIC(12,0) NOT NULL, status VARCHAR(30) NOT NULL, qr_content TEXT, expires_at TIMESTAMPTZ, paid_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS payment_service.bank_transactions (
  id BIGSERIAL PRIMARY KEY, bank_tx_id VARCHAR(160) NOT NULL UNIQUE, bank_account VARCHAR(80), amount NUMERIC(12,0) NOT NULL,
  content TEXT, received_at TIMESTAMPTZ NOT NULL, matched_order_code VARCHAR(40), raw_payload JSONB
);
CREATE TABLE IF NOT EXISTS payment_service.webhook_logs (
  id BIGSERIAL PRIMARY KEY, provider VARCHAR(20) NOT NULL, signature_valid BOOLEAN NOT NULL,
  payload JSONB NOT NULL, processed BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS payment_service.bank_accounts_config (
  id BIGSERIAL PRIMARY KEY, bank_name VARCHAR(100) NOT NULL, account_no VARCHAR(80) NOT NULL,
  account_name VARCHAR(160) NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS promotion_service.vouchers (
  id BIGSERIAL PRIMARY KEY, code VARCHAR(80) NOT NULL UNIQUE, type VARCHAR(20) NOT NULL, value NUMERIC(12,0) NOT NULL,
  min_order_amount NUMERIC(12,0) NOT NULL DEFAULT 0, max_discount NUMERIC(12,0), total_limit INT, used_count INT NOT NULL DEFAULT 0,
  start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, scope VARCHAR(20) NOT NULL DEFAULT 'ALL', store_id BIGINT, status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);
CREATE TABLE IF NOT EXISTS promotion_service.voucher_usages (
  id BIGSERIAL PRIMARY KEY, voucher_id BIGINT NOT NULL REFERENCES promotion_service.vouchers(id), customer_id BIGINT NOT NULL, order_id BIGINT NOT NULL, used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS promotion_service.banners (
  id BIGSERIAL PRIMARY KEY, title VARCHAR(180) NOT NULL, image_url TEXT NOT NULL, image_public_id VARCHAR(255), link_url TEXT,
  position VARCHAR(50), start_at TIMESTAMPTZ, end_at TIMESTAMPTZ, is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS promotion_service.member_points (
  id BIGSERIAL PRIMARY KEY, customer_id BIGINT NOT NULL UNIQUE, total_points INT NOT NULL DEFAULT 0, tier VARCHAR(20) NOT NULL DEFAULT 'MEMBER', updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS promotion_service.point_transactions (
  id BIGSERIAL PRIMARY KEY, customer_id BIGINT NOT NULL, order_id BIGINT, change INT NOT NULL, balance_after INT NOT NULL, type VARCHAR(20) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS promotion_service.loyalty_config (
  id BIGSERIAL PRIMARY KEY, earn_rate NUMERIC(12,4) NOT NULL, redeem_rate NUMERIC(12,4) NOT NULL, updated_by BIGINT
);

CREATE TABLE IF NOT EXISTS shipping_service.shipments (
  id BIGSERIAL PRIMARY KEY, order_id BIGINT NOT NULL UNIQUE, store_id BIGINT NOT NULL, shipper_id BIGINT,
  customer_name VARCHAR(160) NOT NULL, phone VARCHAR(30) NOT NULL, address TEXT NOT NULL, fee NUMERIC(12,0) NOT NULL,
  distance_km NUMERIC(8,2), status VARCHAR(20) NOT NULL DEFAULT 'CREATED', cod_amount NUMERIC(12,0) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS shipping_service.shipment_status_history (
  id BIGSERIAL PRIMARY KEY, shipment_id BIGINT NOT NULL REFERENCES shipping_service.shipments(id), status VARCHAR(20) NOT NULL, changed_by BIGINT, note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS shipping_service.shipping_fee_config (
  id BIGSERIAL PRIMARY KEY, store_id BIGINT, base_fee NUMERIC(12,0) NOT NULL, per_km_fee NUMERIC(12,0) NOT NULL,
  free_from_amount NUMERIC(12,0), area_note TEXT
);

CREATE TABLE IF NOT EXISTS notification_service.notifications (
  id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL, title VARCHAR(180) NOT NULL, content TEXT NOT NULL,
  type VARCHAR(30) NOT NULL, ref_id BIGINT, is_read BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notification_service.email_logs (
  id BIGSERIAL PRIMARY KEY, message_id VARCHAR(160) NOT NULL UNIQUE, event_id VARCHAR(160), to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL, template VARCHAR(100) NOT NULL, provider VARCHAR(30) NOT NULL DEFAULT 'GMAIL_SMTP',
  status VARCHAR(20) NOT NULL, retry_count INT NOT NULL DEFAULT 0, last_error TEXT, sent_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notification_service.mail_templates (
  id BIGSERIAL PRIMARY KEY, template_key VARCHAR(100) NOT NULL UNIQUE, subject_template TEXT NOT NULL, body_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS review_report_service.reviews (
  id BIGSERIAL PRIMARY KEY, customer_id BIGINT NOT NULL, product_id BIGINT NOT NULL, order_id BIGINT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5), comment TEXT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'VISIBLE', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS review_report_service.review_replies (
  id BIGSERIAL PRIMARY KEY, review_id BIGINT NOT NULL REFERENCES review_report_service.reviews(id), responder_id BIGINT NOT NULL, responder_role VARCHAR(30) NOT NULL, content TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS review_report_service.daily_store_stats (
  id BIGSERIAL PRIMARY KEY, store_id BIGINT NOT NULL, stat_date DATE NOT NULL, order_count INT NOT NULL DEFAULT 0,
  revenue NUMERIC(12,0) NOT NULL DEFAULT 0, cod_amount NUMERIC(12,0) NOT NULL DEFAULT 0, transfer_amount NUMERIC(12,0) NOT NULL DEFAULT 0,
  UNIQUE(store_id, stat_date)
);
CREATE TABLE IF NOT EXISTS review_report_service.audit_logs (
  id BIGSERIAL PRIMARY KEY, actor_id BIGINT, actor_role VARCHAR(30), store_id BIGINT, action VARCHAR(100) NOT NULL,
  target_type VARCHAR(100), target_id BIGINT, detail JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON order_service.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_status ON order_service.orders(store_id,status);
CREATE INDEX IF NOT EXISTS idx_payments_order_code ON payment_service.payments(order_code);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON notification_service.email_logs(status, created_at);
