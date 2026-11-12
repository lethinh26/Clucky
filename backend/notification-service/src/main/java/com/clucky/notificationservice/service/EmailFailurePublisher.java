package com.clucky.notificationservice.service;

import com.clucky.notificationservice.config.MailSenderProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.util.concurrent.TimeUnit;

@Service
public class EmailFailurePublisher {
    private final JdbcTemplate jdbc;
    private final KafkaTemplate<String, String> kafka;
    private final ObjectMapper mapper;
    private final MailSenderProperties settings;
    private final TransactionTemplate transactions;
    private final MeterRegistry metrics;

    public EmailFailurePublisher(JdbcTemplate jdbc, KafkaTemplate<String, String> kafka, ObjectMapper mapper,
            MailSenderProperties settings, PlatformTransactionManager manager, MeterRegistry metrics) {
        this.jdbc = jdbc;
        this.kafka = kafka;
        this.mapper = mapper;
        this.settings = settings;
        this.transactions = new TransactionTemplate(manager);
        this.metrics = metrics;
    }

    @Scheduled(fixedDelayString = "${mail-sender.failure-poll-ms}")
    public void publishNext() {
        transactions.executeWithoutResult(transaction -> {
            var rows = jdbc.queryForList("""
                    SELECT failure.*,email.message_id,email.event_id,email.correlation_id
                    FROM notification_service.email_failure_outbox failure
                    JOIN notification_service.email_logs email ON email.id=failure.delivery_id
                    WHERE failure.published_at IS NULL AND failure.next_attempt_at<=now()
                    ORDER BY failure.next_attempt_at,failure.id LIMIT 1 FOR UPDATE OF failure SKIP LOCKED
                    """);
            if (rows.isEmpty()) return;
            var row = rows.getFirst();
            String eventId = row.get("id").toString();
            String correlationId = safeToken(row.get("correlation_id"));
            var event = mapper.createObjectNode().put("eventId", eventId).put("eventType", settings.failureTopic())
                    .put("correlationId", correlationId).put("sourceService", "notification-service")
                    .put("occurredAt", ((Timestamp) row.get("created_at")).toInstant().toString());
            event.putObject("payload").put("deliveryId", ((Number) row.get("delivery_id")).longValue())
                    .put("messageId", safeToken(row.get("message_id"))).put("sourceEventId", safeToken(row.get("event_id")))
                    .put("generation", ((Number) row.get("generation")).intValue())
                    .put("attemptNumber", ((Number) row.get("attempt_number")).intValue())
                    .put("failureCode", EmailLogService.safeFailure((String) row.get("failure_code")));
            var record = new ProducerRecord<String, String>(settings.failureTopic(), eventId, event.toString());
            record.headers().add("X-Event-ID", eventId.getBytes(StandardCharsets.UTF_8));
            record.headers().add("X-Correlation-ID", correlationId.getBytes(StandardCharsets.UTF_8));
            try {
                kafka.send(record).get(10, TimeUnit.SECONDS);
                jdbc.update("UPDATE notification_service.email_failure_outbox SET published_at=now(),publish_attempts=publish_attempts+1 WHERE id=?", row.get("id"));
                metrics.counter("clucky.email.failure.publication", "outcome", "ACKED").increment();
            } catch (Exception unavailable) {
                if (unavailable instanceof InterruptedException) Thread.currentThread().interrupt();
                int attempts = ((Number) row.get("publish_attempts")).intValue();
                long delay = Math.min(settings.retryMaxSeconds(), settings.retryBaseSeconds() * (1L << Math.min(attempts, 20)));
                jdbc.update("""
                        UPDATE notification_service.email_failure_outbox SET publish_attempts=publish_attempts+1,
                        next_attempt_at=now()+(? * interval '1 second') WHERE id=?
                        """, delay, row.get("id"));
                metrics.counter("clucky.email.failure.publication", "outcome", "PENDING").increment();
            }
        });
    }

    public static String safeToken(Object value) {
        String token = value == null ? "unknown" : value.toString();
        return token.matches("[A-Za-z0-9._:-]{1,160}") ? token : "unknown";
    }
}
