ALTER TABLE catalog_service.stores
    ADD COLUMN delivery_radius_km NUMERIC(7,2) CHECK (delivery_radius_km > 0),
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
