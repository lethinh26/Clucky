ALTER TABLE promotion_service.banners
    ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE promotion_service.banners
    ADD CONSTRAINT chk_banners_display_order CHECK (display_order >= 0),
    ADD CONSTRAINT chk_banners_schedule CHECK (start_at IS NULL OR end_at IS NULL OR end_at > start_at);

CREATE INDEX IF NOT EXISTS idx_banners_active_schedule
    ON promotion_service.banners (is_active, position, display_order, id);

CREATE TABLE IF NOT EXISTS promotion_service.media_assets (
    id BIGSERIAL UNIQUE NOT NULL,
    public_id VARCHAR(255) PRIMARY KEY,
    secure_url TEXT,
    delete_requested BOOLEAN NOT NULL DEFAULT FALSE,
    cleanup_after TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promotion_media_assets_cleanup
    ON promotion_service.media_assets (cleanup_after);
