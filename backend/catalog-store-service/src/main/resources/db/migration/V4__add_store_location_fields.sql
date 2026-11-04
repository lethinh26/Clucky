SET search_path TO catalog_service, public;

ALTER TABLE stores
    ADD COLUMN district VARCHAR(120),
    ADD COLUMN city VARCHAR(120);
