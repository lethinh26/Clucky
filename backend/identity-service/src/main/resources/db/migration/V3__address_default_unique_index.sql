-- V3: enforce single default address per user at the database level.
-- Partial unique index; only applies to default rows.
CREATE UNIQUE INDEX IF NOT EXISTS ux_addresses_single_default
    ON identity_service.addresses (user_id)
    WHERE is_default = true;

