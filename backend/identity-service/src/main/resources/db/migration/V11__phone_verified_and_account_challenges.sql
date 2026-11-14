ALTER TABLE identity_service.users
  ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- V2 only allowed REGISTER and RESET. Email binding and signed-in password
-- changes use separate purposes so codes cannot be replayed across flows.
ALTER TABLE identity_service.otp_codes DROP CONSTRAINT IF EXISTS otp_codes_purpose_check;
ALTER TABLE identity_service.otp_codes ADD CONSTRAINT otp_codes_purpose_check
  CHECK (purpose IN ('REGISTER','RESET','EMAIL_BIND','PASSWORD_CHANGE'));

-- Bridge owns SMS codes and verification. Clucky stores only opaque provider challenge IDs.
CREATE TABLE identity_service.sms_otp_challenges (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES identity_service.users(id),
  phone VARCHAR(30) NOT NULL,
  purpose VARCHAR(30) NOT NULL CHECK (purpose IN ('REGISTER','PASSWORD_RESET','PASSWORD_CHANGE')),
  bridge_id VARCHAR(160) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sms_otp_challenges_active
  ON identity_service.sms_otp_challenges(user_id,purpose,expires_at) WHERE NOT used;

-- Email OTP is HMAC-hashed in existing otp_codes. Here we bind the pending
-- challenge to the authenticated user and the exact recipient email.
CREATE TABLE identity_service.email_bind_challenges (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES identity_service.users(id),
  email VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX email_bind_challenges_active
  ON identity_service.email_bind_challenges(user_id,expires_at) WHERE NOT used;
