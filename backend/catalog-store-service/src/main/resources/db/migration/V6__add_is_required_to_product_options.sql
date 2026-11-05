SET search_path TO catalog_service, public;

ALTER TABLE product_options ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT TRUE;
