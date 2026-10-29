CREATE SCHEMA IF NOT EXISTS catalog_service;
SET search_path TO catalog_service, public;

CREATE TABLE IF NOT EXISTS stores (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  address VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  delivery_area TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT NOT NULL REFERENCES categories(id),
  name VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  base_price NUMERIC(12,0) NOT NULL CHECK (base_price >= 0),
  image_url TEXT,
  image_public_id VARCHAR(255),
  kcal INT,
  spicy_level INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS product_options (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  group_name VARCHAR(80) NOT NULL,
  name VARCHAR(100) NOT NULL,
  extra_price NUMERIC(12,0) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_toppings (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  topping_name VARCHAR(120) NOT NULL,
  extra_price NUMERIC(12,0) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS combos (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  combo_price NUMERIC(12,0) NOT NULL,
  image_url TEXT,
  image_public_id VARCHAR(255),
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS combo_items (
  id BIGSERIAL PRIMARY KEY,
  combo_id BIGINT NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity INT NOT NULL DEFAULT 1,
  option_id BIGINT
);

CREATE TABLE IF NOT EXISTS store_products (
  id BIGSERIAL PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_price NUMERIC(12,0),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  is_sold_out BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(store_id, product_id)
);

CREATE TABLE IF NOT EXISTS store_inventory (
  id BIGSERIAL PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_available INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 10,
  updated_by BIGINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_options_product ON product_options(product_id);
CREATE INDEX IF NOT EXISTS idx_product_toppings_product ON product_toppings(product_id);
CREATE INDEX IF NOT EXISTS idx_combo_items_combo ON combo_items(combo_id);
CREATE INDEX IF NOT EXISTS idx_store_products_store ON store_products(store_id);
CREATE INDEX IF NOT EXISTS idx_store_products_product ON store_products(product_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_store ON store_inventory(store_id);

