-- Repair legacy duplicate/gapped positions before enforcing the global category order.
WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order, id) AS new_sort_order
    FROM catalog_service.categories
)
UPDATE catalog_service.categories AS c
SET sort_order = ranked.new_sort_order,
    version = c.version + 1
FROM ranked
WHERE c.id = ranked.id AND c.sort_order IS DISTINCT FROM ranked.new_sort_order;

ALTER TABLE catalog_service.categories
    ADD CONSTRAINT categories_sort_order_positive CHECK (sort_order > 0),
    ADD CONSTRAINT categories_sort_order_unique UNIQUE (sort_order) DEFERRABLE INITIALLY DEFERRED;
