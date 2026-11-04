SET search_path TO catalog_service, public;

ALTER TABLE stores
    ADD COLUMN IF NOT EXISTS district VARCHAR(120),
    ADD COLUMN IF NOT EXISTS city VARCHAR(120);
