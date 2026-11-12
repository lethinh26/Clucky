-- Ensure default chain shipping policy fee is configured (15,000 VND) when not yet set
INSERT INTO shipping_service.shipping_policy (id, fee, version, updated_at)
VALUES (1, 15000, 1, now())
ON CONFLICT (id) DO UPDATE
SET fee = COALESCE(shipping_service.shipping_policy.fee, 15000),
    version = CASE WHEN shipping_service.shipping_policy.fee IS NULL THEN GREATEST(shipping_service.shipping_policy.version, 1) ELSE shipping_service.shipping_policy.version END,
    updated_at = now();
