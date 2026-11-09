ALTER TABLE catalog_service.stores ADD COLUMN account_readiness VARCHAR(30) NOT NULL DEFAULT 'LEGACY';
ALTER TABLE catalog_service.stores ADD CONSTRAINT account_readiness_values CHECK (account_readiness IN ('LEGACY','PENDING','PROVISIONED','READY'));
CREATE TABLE catalog_service.account_provisioning (
    store_id BIGINT PRIMARY KEY REFERENCES catalog_service.stores(id),
    request_key UUID NOT NULL UNIQUE, request_hash VARCHAR(64) NOT NULL,
    recovery_email VARCHAR(255) NOT NULL, actor_id BIGINT NOT NULL, session_id VARCHAR(160) NOT NULL,
    correlation_id VARCHAR(128) NOT NULL, last_error VARCHAR(60), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
