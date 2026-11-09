ALTER TABLE order_service.orders
    DROP CONSTRAINT orders_distance_km_check,
    ADD CONSTRAINT orders_distance_km_check CHECK (distance_km >= 0);
