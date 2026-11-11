package com.clucky.cartorderservice.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class VoucherCheckoutRecovery {
    private final JdbcTemplate jdbc;
    private final LoyaltyClient loyalty;
    private final TransactionTemplate transaction;

    public VoucherCheckoutRecovery(JdbcTemplate jdbc, LoyaltyClient loyalty,
            org.springframework.transaction.PlatformTransactionManager manager) {
        this.jdbc = jdbc; this.loyalty = loyalty; this.transaction = new TransactionTemplate(manager);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void lock(long orderId) {
        jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?,0))", Object.class, "checkout:" + orderId);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void track(long orderId) {
        jdbc.update("INSERT INTO order_service.voucher_release_work(order_id,next_attempt_at) VALUES (?,now()+interval '5 minutes') ON CONFLICT DO NOTHING", orderId);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void cancelled(long orderId) {
        jdbc.update("INSERT INTO order_service.voucher_release_work(order_id) VALUES (?) ON CONFLICT (order_id) DO UPDATE SET next_attempt_at=now()", orderId);
    }

    @Scheduled(fixedDelay = 10000)
    public void recover() {
        for (Long orderId : jdbc.queryForList("SELECT order_id FROM order_service.voucher_release_work WHERE next_attempt_at<=now() ORDER BY next_attempt_at LIMIT 50", Long.class)) {
            try {
                transaction.executeWithoutResult(status -> {
                    Boolean locked = jdbc.queryForObject("SELECT pg_try_advisory_xact_lock(hashtextextended(?,0))", Boolean.class, "checkout:" + orderId);
                    if (!Boolean.TRUE.equals(locked)) return;
                    var orders = jdbc.queryForList("SELECT status FROM order_service.orders WHERE id=? FOR UPDATE", orderId);
                    var work = jdbc.queryForList("SELECT order_id FROM order_service.voucher_release_work WHERE order_id=? FOR UPDATE SKIP LOCKED", orderId);
                    if (work.isEmpty()) return;
                    if (orders.isEmpty() || "CANCELLED".equals(orders.getFirst().get("status"))) loyalty.releaseVoucher(orderId);
                    jdbc.update("DELETE FROM order_service.voucher_release_work WHERE order_id=?", orderId);
                });
            } catch (RuntimeException failure) {
                jdbc.update("UPDATE order_service.voucher_release_work SET next_attempt_at=now()+interval '1 minute' WHERE order_id=?", orderId);
                org.slf4j.LoggerFactory.getLogger(getClass()).warn("event=voucher_release_pending orderId={}", orderId);
            }
        }
    }
}
