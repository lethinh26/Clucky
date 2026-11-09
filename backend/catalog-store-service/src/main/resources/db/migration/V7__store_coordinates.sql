SET search_path TO catalog_service, public;

ALTER TABLE stores
    ADD COLUMN latitude NUMERIC,
    ADD COLUMN longitude NUMERIC,
    ADD CONSTRAINT stores_coordinates_valid CHECK (
        (latitude IS NULL AND longitude IS NULL)
        OR (latitude IS NOT NULL AND longitude IS NOT NULL
            AND latitude BETWEEN -90 AND 90
            AND longitude BETWEEN -180 AND 180)
    );
