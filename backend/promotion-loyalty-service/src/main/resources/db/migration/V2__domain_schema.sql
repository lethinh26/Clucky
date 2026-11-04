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
