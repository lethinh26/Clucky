CREATE INDEX IF NOT EXISTS idx_reviews_product_status ON review_report_service.reviews(product_id, status);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON review_report_service.reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order ON review_report_service.reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_review ON review_report_service.review_replies(review_id);
CREATE INDEX IF NOT EXISTS idx_daily_store_stats_date ON review_report_service.daily_store_stats(stat_date);
