-- Seed default coordinates and delivery radius for initial branches so shipping fee calculation works out of the box
UPDATE catalog_service.stores
SET latitude = 10.7731, longitude = 106.6983, delivery_radius_km = 15.00
WHERE id = 1 AND (latitude IS NULL OR longitude IS NULL OR delivery_radius_km IS NULL);

UPDATE catalog_service.stores
SET latitude = 10.8285, longitude = 106.6881, delivery_radius_km = 15.00
WHERE id = 2 AND (latitude IS NULL OR longitude IS NULL OR delivery_radius_km IS NULL);

UPDATE catalog_service.stores
SET latitude = 10.7588, longitude = 106.6738, delivery_radius_km = 15.00
WHERE id = 3 AND (latitude IS NULL OR longitude IS NULL OR delivery_radius_km IS NULL);

UPDATE catalog_service.stores
SET latitude = 10.8447, longitude = 106.7795, delivery_radius_km = 15.00
WHERE id = 4 AND (latitude IS NULL OR longitude IS NULL OR delivery_radius_km IS NULL);

UPDATE catalog_service.stores
SET latitude = 10.7950, longitude = 106.7218, delivery_radius_km = 15.00
WHERE id = 5 AND (latitude IS NULL OR longitude IS NULL OR delivery_radius_km IS NULL);

UPDATE catalog_service.stores
SET latitude = COALESCE(latitude, 10.7769),
    longitude = COALESCE(longitude, 106.7009),
    delivery_radius_km = COALESCE(delivery_radius_km, 15.00)
WHERE latitude IS NULL OR longitude IS NULL OR delivery_radius_km IS NULL;
