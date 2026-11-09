CREATE TABLE identity_service.branch_migrations (
    store_id BIGINT PRIMARY KEY REFERENCES identity_service.branch_accounts(store_id),
    request_hash VARCHAR(64) NOT NULL,
    actor_id BIGINT NOT NULL,
    backup_reference VARCHAR(160) NOT NULL,
    report JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
