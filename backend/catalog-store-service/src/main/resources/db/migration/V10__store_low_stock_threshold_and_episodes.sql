SET search_path TO catalog_service, public;

ALTER TABLE catalog_service.stores
    ADD COLUMN IF NOT EXISTS low_stock_threshold INT NOT NULL DEFAULT 20;

ALTER TABLE catalog_service.store_inventory
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS catalog_service.low_stock_episodes (
    id BIGSERIAL PRIMARY KEY,
    episode_id VARCHAR(64) NOT NULL UNIQUE,
    store_id BIGINT NOT NULL REFERENCES catalog_service.stores(id),
    product_id BIGINT NOT NULL REFERENCES catalog_service.products(id),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    trigger_quantity INT NOT NULL,
    threshold INT NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ,
    closed_by_quantity INT
);

CREATE INDEX IF NOT EXISTS idx_low_stock_episodes_lookup
    ON catalog_service.low_stock_episodes(store_id, product_id, status);

-- Baseline rollout: register existing items with quantity <= 20 as OPEN episodes
-- so no retroactive alerts are spammed.
INSERT INTO catalog_service.low_stock_episodes (episode_id, store_id, product_id, status, trigger_quantity, threshold, opened_at)
SELECT md5(random()::text || clock_timestamp()::text)::text, si.store_id, si.product_id, 'OPEN', si.quantity_available, 20, now()
FROM catalog_service.store_inventory si
WHERE si.quantity_available <= 20
ON CONFLICT DO NOTHING;
