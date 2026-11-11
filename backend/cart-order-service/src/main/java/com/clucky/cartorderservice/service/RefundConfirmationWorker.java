package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.repository.RefundRequestRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
public class RefundConfirmationWorker {
    private final RefundRequestRepository refunds;
    private final RefundRequestService service;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;
    private final CustomerProfileClient profiles;

    public RefundConfirmationWorker(RefundRequestRepository refunds, RefundRequestService service, org.springframework.jdbc.core.JdbcTemplate jdbc, CustomerProfileClient profiles) {
        this.refunds = refunds; this.service = service;
        this.jdbc = jdbc;
        this.profiles = profiles;
    }

    @Scheduled(fixedDelay = 5000)
    public void recover() {
        for (Long id : refunds.pendingConfirmations(PageRequest.of(0, 50))) {
            try { service.recoverPayment(id); }
            catch (RuntimeException failure) {
                service.deferPayment(id, failure);
                org.slf4j.LoggerFactory.getLogger(getClass()).warn("event=refund_payment_pending refundId={}", id);
            }
        }
        for (Long orderId : jdbc.queryForList("SELECT order_id FROM order_service.cancellation_refund_work WHERE next_attempt_at<=now() ORDER BY next_attempt_at LIMIT 50", Long.class)) {
            try {
                if (service.automaticRefund(orderId)) {
                    jdbc.update("DELETE FROM order_service.cancellation_refund_work WHERE order_id=?", orderId);
                    continue;
                }
            } catch (RuntimeException failure) {
                org.slf4j.LoggerFactory.getLogger(getClass()).warn("event=automatic_refund_pending orderId={}", orderId);
            }
            jdbc.update("UPDATE order_service.cancellation_refund_work SET next_attempt_at=now()+interval '5 minutes' WHERE order_id=?", orderId);
        }
        for (Long id : refunds.untrackedReservations(java.time.Instant.now().minusSeconds(300), PageRequest.of(0, 50))) {
            try { service.recoverUntrackedReservation(id); }
            catch (RuntimeException failure) {
                jdbc.update("UPDATE order_service.refund_requests SET payment_retry_at=now()+interval '5 minutes' WHERE id=? AND payment_operation IS NULL", id);
                org.slf4j.LoggerFactory.getLogger(getClass()).warn("event=refund_hold_reconciliation_pending refundId={}", id);
            }
        }
        for (var order : jdbc.queryForList("""
                SELECT orders.id,orders.customer_id FROM order_service.orders orders JOIN order_service.outbox_events event
                  ON event.payload->'payload'->>'orderId'=orders.id::text
                WHERE event.status='WAITING_RECIPIENT' AND event.recipient_retry_at<=now() AND NOT orders.customer_email_verified
                  AND orders.customer_id IS NOT NULL
                GROUP BY orders.id,orders.customer_id ORDER BY min(event.recipient_retry_at) LIMIT 50
                """)) {
            Long orderId = ((Number) order.get("id")).longValue();
            try {
                var contact = profiles.verifiedContact(((Number) order.get("customer_id")).longValue());
                jdbc.update("UPDATE order_service.orders SET customer_email=?,customer_email_verified=TRUE WHERE id=? AND customer_id=?",
                        contact.email(), orderId, contact.userId());
            } catch (RuntimeException failure) {
                jdbc.update("UPDATE order_service.outbox_events SET recipient_retry_at=now()+interval '5 minutes' WHERE status='WAITING_RECIPIENT' AND payload->'payload'->>'orderId'=?", orderId.toString());
                org.slf4j.LoggerFactory.getLogger(getClass()).warn("event=refund_recipient_pending orderId={}", orderId);
            }
        }
        jdbc.update("""
                UPDATE order_service.outbox_events event SET payload=jsonb_set(jsonb_set(event.payload,'{payload,customerEmail}',to_jsonb(orders.customer_email)),
                    '{payload,recipient}',jsonb_build_object('userId',orders.customer_id,'role','CUSTOMER','email',orders.customer_email,'emailVerified',true)),
                    status='PENDING',last_error=NULL
                FROM order_service.orders orders WHERE event.status='WAITING_RECIPIENT'
                  AND event.payload->'payload'->>'orderId'=orders.id::text AND orders.customer_email IS NOT NULL AND orders.customer_email_verified
                """);
        jdbc.update("""
                UPDATE order_service.outbox_events event SET status='PENDING',last_error=NULL
                FROM order_service.orders orders WHERE event.status='WAITING_RECIPIENT'
                  AND event.payload->'payload'->>'orderId'=orders.id::text AND orders.customer_id IS NULL
                """);
    }
}
