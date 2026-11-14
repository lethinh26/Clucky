-- Snapshot the amount owed to the merchant for COD rider advance.
-- BANK_TRANSFER at READY is already PAID by the real QR processor: no wallet advance.
-- Existing READY rows stay readable; COD-only legacy rows can use shipment.cod_amount.
-- Never rewrite processor payment receipts or previously applied Flyway migrations.
ALTER TABLE shipping_service.mock_ready_orders
  ADD COLUMN merchant_goods_amount NUMERIC(12,0)
    CHECK (merchant_goods_amount >= 0),
  ADD COLUMN total_amount NUMERIC(12,0)
    CHECK (total_amount >= 0);
