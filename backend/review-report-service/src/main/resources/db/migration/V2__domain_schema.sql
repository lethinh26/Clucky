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
