ALTER TABLE catalog_service.products ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE catalog_service.combos ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE catalog_service.categories ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

CREATE TABLE catalog_service.catalog_event_outbox (
    event_id UUID PRIMARY KEY,
    topic VARCHAR(100) NOT NULL,
    partition_key VARCHAR(100) NOT NULL,
    envelope JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ
);
CREATE INDEX catalog_event_pending ON catalog_service.catalog_event_outbox(next_attempt_at) WHERE published_at IS NULL;

CREATE TABLE catalog_service.media_assets (
    id BIGSERIAL UNIQUE NOT NULL,
    public_id VARCHAR(255) PRIMARY KEY,
    secure_url TEXT,
    cleanup_after TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
