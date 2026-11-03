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
