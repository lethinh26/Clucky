ALTER TABLE catalog_service.stores DROP CONSTRAINT account_readiness_values;
ALTER TABLE catalog_service.stores ALTER COLUMN account_readiness SET DEFAULT 'UNPROVISIONED';
UPDATE catalog_service.stores SET account_readiness = 'UNPROVISIONED', version = version + 1 WHERE account_readiness = 'LEGACY';
ALTER TABLE catalog_service.stores ADD CONSTRAINT account_readiness_values
    CHECK (account_readiness IN ('UNPROVISIONED', 'PENDING', 'PROVISIONED', 'READY'));
