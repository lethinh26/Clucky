SET search_path TO review_report_service, public;

INSERT INTO reviews (id, customer_id, product_id, order_id, rating, comment, status, created_at)
VALUES
 (1, 4, 1, 1, 5, 'Gà giòn, nóng và giao đúng thời gian. Sốt rất vừa miệng.', 'VISIBLE', now() - interval '1 day'),
 (2, 5, 2, 2, 5, 'Combo ăn ngon, gà giòn sốt cay thơm đậm đà.', 'VISIBLE', now() - interval '12 hours')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('review_report_service.reviews', 'id'), COALESCE((SELECT MAX(id) FROM review_report_service.reviews), 1));
