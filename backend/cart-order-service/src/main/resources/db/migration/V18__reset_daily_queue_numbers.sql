-- Renumber daily queue_number per store and Vietnam business date starting from 1 every day
WITH numbered AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY store_id, ((created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
            ORDER BY created_at ASC, id ASC
        ) AS daily_seq
    FROM order_service.orders
)
UPDATE order_service.orders o
SET queue_number = (((n.daily_seq - 1) % 999) + 1)
FROM numbered n
WHERE o.id = n.id;
