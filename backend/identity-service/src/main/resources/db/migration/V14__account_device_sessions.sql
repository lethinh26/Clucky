-- Each sid represents one browser login, not one physical device or staff member.
ALTER TABLE identity_service.users
  ADD COLUMN max_active_sessions INTEGER NOT NULL DEFAULT 3
  CONSTRAINT users_max_active_sessions_range CHECK (max_active_sessions BETWEEN 1 AND 10);

CREATE TABLE identity_service.auth_sessions (
  session_id VARCHAR(36) PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES identity_service.users(id),
  client VARCHAR(12) NOT NULL CHECK (client IN ('admin', 'customer')),
  role_at_login VARCHAR(30) NOT NULL,
  store_id_at_login BIGINT,
  user_agent VARCHAR(240),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  refresh_expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoke_reason VARCHAR(40),
  revoked_by BIGINT
);
CREATE INDEX auth_sessions_active_user_idx ON identity_service.auth_sessions
  (user_id, refresh_expires_at) WHERE revoked_at IS NULL;
CREATE INDEX auth_sessions_store_idx ON identity_service.auth_sessions(store_id_at_login);

-- Nullable only for existing hashed tokens, whose sid cannot be recovered.
-- Internal legacy refresh is rejected and users must log in again after deployment.
ALTER TABLE identity_service.refresh_tokens
  ADD COLUMN session_id VARCHAR(36) REFERENCES identity_service.auth_sessions(session_id);
CREATE INDEX refresh_tokens_session_idx ON identity_service.refresh_tokens(session_id);
