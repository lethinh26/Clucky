package com.clucky.identityservice.service;

import com.clucky.identityservice.entity.OutboxEvent;
import com.clucky.identityservice.logging.SafeLog;
import com.clucky.identityservice.repository.OutboxEventRepository;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Delivers committed account events. Consumers must deduplicate by immutable eventId. */
@Component
public class CustomerAccountOutboxPublisher {
    public static final String TOPIC = "customer.locked";
    private static final Logger LOG = LoggerFactory.getLogger(CustomerAccountOutboxPublisher.class);
    private final OutboxEventRepository events;
    private final KafkaTemplate<String, String> kafka;

    public CustomerAccountOutboxPublisher(OutboxEventRepository events, KafkaTemplate<String, String> kafka) {
        this.events = events; this.kafka = kafka;
    }

    @Scheduled(fixedDelayString = "${clucky.outbox.customer.fixed-delay-ms:5000}")
    @Transactional
    public void publishCommittedEvents() {
        for (OutboxEvent event : events.findNextUnpublished()) {
            try {
                ProducerRecord<String, String> record = new ProducerRecord<>(TOPIC, String.valueOf(event.getAggregateId()), event.getPayload());
                record.headers().add("X-Event-ID", event.getEventId().getBytes(StandardCharsets.UTF_8));
                record.headers().add("X-Correlation-ID", event.getCorrelationId().getBytes(StandardCharsets.UTF_8));
                kafka.send(record).get();
                event.setPublishedAt(Instant.now());
            } catch (Exception failure) {
                event.setAttempts(event.getAttempts() + 1);
                LOG.warn("event=customer_account_outbox_publish_failed correlationId={} eventId={} attempts={} trace={}",
                        event.getCorrelationId(), event.getEventId(), event.getAttempts(), SafeLog.trace(failure));
            }
        }
    }
}
