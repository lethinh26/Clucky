ALTER TABLE catalog_service.product_options ADD CONSTRAINT product_option_owner UNIQUE (product_id, id);
ALTER TABLE catalog_service.combo_items ADD CONSTRAINT combo_option_owner
    FOREIGN KEY (product_id, option_id) REFERENCES catalog_service.product_options(product_id, id);
ALTER TABLE catalog_service.combo_items ADD CONSTRAINT combo_positive_quantity CHECK (quantity > 0);
