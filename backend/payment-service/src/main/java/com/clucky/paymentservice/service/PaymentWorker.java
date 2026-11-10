package com.clucky.paymentservice.service;

import com.clucky.paymentservice.mapper.EventMapper;
import java.util.concurrent.TimeUnit;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class PaymentWorker {
    private final PaymentFlow service;
    private final SepayReceiptService receipts;
    private final PaymentOperations operations;
    private final JdbcTemplate jdbc;
    private final EventMapper mapper;
    private final KafkaTemplate<String, String> kafka;
    private final TransactionTemplate transaction;
    public PaymentWorker(PaymentFlow service, SepayReceiptService receipts, PaymentOperations operations, JdbcTemplate jdbc, EventMapper mapper,
            KafkaTemplate<String, String> kafka, PlatformTransactionManager manager) {
        this.service = service; this.jdbc = jdbc; this.mapper = mapper; this.kafka = kafka;
        this.receipts = receipts;
        this.operations = operations;
        this.transaction = new TransactionTemplate(manager);
    }

    @KafkaListener(topics = {"order.cancelled", "order.payment-resolved"}, groupId = "clucky-payment-lifecycle-v1")
    public void orderEvent(ConsumerRecord<String, String> record, Acknowledgment acknowledgment) {
        var event = mapper.fromJson(record.value(), record.topic());
        try {
            MDC.put("correlationId", event.correlationId()); MDC.put("eventId", event.eventId());
            if ("COLLECTION".equals(event.payload().path("operationType").asText())) operations.resolve(event);
            else service.orderEvent(event);
            acknowledgment.acknowledge();
        } finally { MDC.remove("correlationId"); MDC.remove("eventId"); }
    }

    @Scheduled(fixedDelay = 2000)
    public void reconcile() {
        try { receipts.recover(); }
        catch (RuntimeException failure) { LoggerFactory.getLogger(getClass()).warn("event=payment_receipt_recovery_pending"); }
        try {
            for (Long id : jdbc.queryForList("SELECT payment.id FROM payment_service.payments payment WHERE payment.live_payment AND (EXISTS "
                    + "(SELECT 1 FROM payment_service.bank_transactions receipt WHERE receipt.candidate_payment_id=payment.id "
                    + "AND receipt.status='PENDING_RECONCILIATION' AND receipt.payment_id IS NULL AND receipt.collection_id IS NULL AND receipt.transfer_direction='in' "
                    + "AND receipt.webhook_fingerprint IS NOT NULL AND receipt.conflict_count=0) OR payment.received_amount <> "
                    + "(SELECT coalesce(sum(amount),0) FROM payment_service.bank_transactions WHERE payment_id=payment.id AND transfer_direction='in' "
                    + "AND (conflict_count=0 OR conflict_reviewed))) ORDER BY payment.id LIMIT 50", Long.class)) {
                service.reconcile(id);
            }
        } catch (RuntimeException failure) { LoggerFactory.getLogger(getClass()).warn("event=payment_reconciliation_pending"); }
    }

    @Scheduled(fixedDelay = 2000)
    public void publish() {
        try {
            transaction.executeWithoutResult(status -> {
                var pending = jdbc.queryForList("SELECT * FROM payment_service.payment_outbox WHERE published_at IS NULL AND live_dispatch ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED");
                for (var entry : pending) {
                    try {
                        var event = mapper.fromJson(entry.get("payload").toString(), entry.get("topic").toString());
                        kafka.send(mapper.toRecord(event, entry.get("order_id").toString())).get(5, TimeUnit.SECONDS);
                    } catch (InterruptedException failure) {
                        Thread.currentThread().interrupt(); throw new IllegalStateException("Payment publication pending");
                    } catch (Exception failure) { throw new IllegalStateException("Payment publication pending"); }
                    jdbc.update("UPDATE payment_service.payment_outbox SET published_at=now() WHERE event_id=?", entry.get("event_id"));
                }
            });
        } catch (RuntimeException failure) { LoggerFactory.getLogger(getClass()).warn("event=payment_publication_pending"); }
    }
}
