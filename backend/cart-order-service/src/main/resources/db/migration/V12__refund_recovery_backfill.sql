INSERT INTO order_service.cancellation_refund_work(order_id)
SELECT orders.id FROM order_service.orders orders
WHERE orders.status='CANCELLED' AND orders.payment_method='BANK_TRANSFER'
    AND NOT EXISTS (SELECT 1 FROM order_service.refund_requests refund WHERE refund.order_id=orders.id)
    AND EXISTS (SELECT 1 FROM order_service.order_status_history history WHERE history.order_id=orders.id
        AND history.to_status='CANCELLED' AND history.from_status IN ('PENDING_PAYMENT','CONFIRMED')
        AND history.changed_role IN ('CUSTOMER','STAFF','STORE_MANAGER','ADMIN'))
ON CONFLICT DO NOTHING;
UPDATE order_service.refund_requests SET payment_operation='RELEASE',payment_retry_at=now()
WHERE status='REJECTED' AND payment_operation IS NULL;
