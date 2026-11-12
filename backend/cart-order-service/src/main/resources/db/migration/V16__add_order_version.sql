SET search_path TO order_service, public;

-- V12: Add version column to orders for optimistic concurrency control
ALTER TABLE order_service.orders 
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
