ALTER TABLE identity_service.users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE identity_service.users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE identity_service.users ADD COLUMN login_name VARCHAR(80) UNIQUE;
ALTER TABLE identity_service.users ADD COLUMN current_branch_account BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE identity_service.users ADD CONSTRAINT branch_account_shape CHECK
    (NOT current_branch_account OR (store_id IS NOT NULL AND login_name IS NOT NULL AND role IN ('STORE_MANAGER','STAFF')));
CREATE UNIQUE INDEX current_branch_role ON identity_service.users(store_id, role) WHERE current_branch_account;

CREATE TABLE identity_service.branch_accounts (
    store_id BIGINT PRIMARY KEY, request_key UUID NOT NULL UNIQUE, request_hash VARCHAR(64) NOT NULL,
    recovery_email VARCHAR(255) NOT NULL, email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    version BIGINT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE identity_service.branch_challenges (
    id UUID PRIMARY KEY, target_id BIGINT NOT NULL REFERENCES identity_service.users(id),
    store_id BIGINT, purpose VARCHAR(30) NOT NULL CHECK (purpose IN ('ACTIVATE','RESET','RECOVERY','ADMIN_RESET','ADMIN_RECOVERY')),
    actor_id BIGINT, session_id VARCHAR(160), branch_version BIGINT,
    recipient VARCHAR(255) NOT NULL, new_email VARCHAR(255),
    expires_at TIMESTAMPTZ NOT NULL, used BOOLEAN NOT NULL DEFAULT FALSE,
    sent_primary BOOLEAN NOT NULL DEFAULT FALSE, sent_secondary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX branch_challenges_pending ON identity_service.branch_challenges(expires_at) WHERE NOT used;
CREATE TABLE identity_service.branch_outbox (
    event_id UUID PRIMARY KEY, correlation_id VARCHAR(128) NOT NULL, payload JSONB NOT NULL,
    published BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
