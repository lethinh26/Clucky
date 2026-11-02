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

CREATE INDEX IF NOT EXISTS idx_orders_customer ON order_service.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_status ON order_service.orders(store_id,status);
