CREATE TABLE IF NOT EXISTS identity_service.users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(30) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  avatar_url TEXT,
  avatar_public_id VARCHAR(255),
  role VARCHAR(30) NOT NULL CHECK (role IN ('CUSTOMER','STAFF','STORE_MANAGER','ADMIN','SHIPPER')),
  store_id BIGINT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','LOCKED')),
  email_verified BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity_service.addresses (
  id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES identity_service.users(id),
  receiver_name VARCHAR(160) NOT NULL, phone VARCHAR(30) NOT NULL,
  province VARCHAR(100) NOT NULL, district VARCHAR(100) NOT NULL, ward VARCHAR(100) NOT NULL,
  detail VARCHAR(255) NOT NULL, is_default BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS identity_service.refresh_tokens (
  id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES identity_service.users(id),
  token_hash VARCHAR(255) NOT NULL UNIQUE, expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity_service.otp_codes (
  id BIGSERIAL PRIMARY KEY, identifier VARCHAR(255) NOT NULL, code_hash VARCHAR(255) NOT NULL,
  purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('REGISTER','RESET')), expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity_service.shifts (
  id BIGSERIAL PRIMARY KEY, store_id BIGINT NOT NULL, name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL, end_time TIME NOT NULL
);

CREATE TABLE IF NOT EXISTS identity_service.staff_schedules (
  id BIGSERIAL PRIMARY KEY, staff_id BIGINT NOT NULL REFERENCES identity_service.users(id),
  store_id BIGINT NOT NULL, shift_id BIGINT NOT NULL REFERENCES identity_service.shifts(id),
  work_date DATE NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED'
);
