package com.clucky.paymentservice.service;

import java.util.concurrent.TimeUnit;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

@Component
@EnableScheduling
public class BankAuditOutbox {
    private final JdbcTemplate jdbc;
    private final KafkaTemplate<String, String> kafka;
    private final TransactionTemplate transaction;

    public BankAuditOutbox(JdbcTemplate jdbc, KafkaTemplate<String, String> kafka,
            org.springframework.transaction.PlatformTransactionManager manager) {
        this.jdbc = jdbc;
        this.kafka = kafka;
        this.transaction = new TransactionTemplate(manager);
    }

    @Scheduled(fixedDelay = 5000)
    public void publish() {
        try {
            transaction.executeWithoutResult(status -> {
                var events = jdbc.queryForList("SELECT event_id,event::text FROM payment_service.bank_audit_outbox "
                        + "WHERE NOT published ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED");
                for (var event : events) {
                    try {
                        kafka.send("audit.recorded", event.get("event_id").toString(), (String) event.get("event")).get(5, TimeUnit.SECONDS);
                    } catch (InterruptedException failure) {
                        Thread.currentThread().interrupt();
                        throw new IllegalStateException("Audit publication pending");
                    } catch (Exception failure) { throw new IllegalStateException("Audit publication pending"); }
                    jdbc.update("UPDATE payment_service.bank_audit_outbox SET published=TRUE WHERE event_id=?", event.get("event_id"));
                }
            });
        } catch (RuntimeException failure) {
            LoggerFactory.getLogger(getClass()).warn("event=bank_audit_publication_pending");
        }
    }
}
