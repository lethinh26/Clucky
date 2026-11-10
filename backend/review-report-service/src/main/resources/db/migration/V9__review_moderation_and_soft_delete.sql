ALTER TABLE review_report_service.reviews
    ADD COLUMN IF NOT EXISTS store_id BIGINT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by BIGINT;

CREATE INDEX IF NOT EXISTS idx_reviews_store_status_created_at
    ON review_report_service.reviews (store_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_status_created_at
    ON review_report_service.reviews (status, created_at DESC);

CREATE TABLE IF NOT EXISTS review_report_service.review_idempotency (
    id BIGSERIAL PRIMARY KEY,
    operation VARCHAR(64) NOT NULL,
    actor_id BIGINT NOT NULL,
    target_id BIGINT,
    idempotency_key VARCHAR(128) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    response_status INT NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_review_idempotency_op_actor_key UNIQUE (operation, actor_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_review_idempotency_created_at
    ON review_report_service.review_idempotency (created_at);
