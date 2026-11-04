ALTER TABLE review_report_service.reviews
    ADD CONSTRAINT uk_reviews_customer_order_product UNIQUE (customer_id, order_id, product_id);
