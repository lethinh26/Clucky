package com.clucky.reviewreportservice.config;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.TimeUnit;
import com.clucky.reviewreportservice.logging.KafkaLogging;
import com.clucky.reviewreportservice.logging.SafeLog;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.header.internals.RecordHeader;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.KafkaAdmin;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.ConsumerRecordRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration(proxyBeanMethods = false)
@EnableKafka
public class KafkaConfig {

    private ConsumerRecordRecoverer createDltRecoverer(
            KafkaTemplate<String, String> kafkaTemplate,
            long timeoutSec) {
        return (record, failure) -> {
            String originalTopic = record.topic();
            String targetTopic = originalTopic.endsWith(".DLT") ? originalTopic : originalTopic + ".DLT";

            Long recordTimestamp = record.timestamp() >= 0 ? record.timestamp() : null;
            ProducerRecord<String, String> dltRecord = new ProducerRecord<>(
                    targetTopic,
                    null,
                    recordTimestamp,
                    record.key() != null ? String.valueOf(record.key()) : null,
                    record.value() != null ? String.valueOf(record.value()) : null
            );

            if (record.headers() != null) {
                record.headers().forEach(h -> dltRecord.headers().add(h.key(), h.value()));
            }

            dltRecord.headers().add(new RecordHeader("X-DLT-Original-Topic", originalTopic.getBytes(StandardCharsets.UTF_8)));
            dltRecord.headers().add(new RecordHeader("X-DLT-Original-Partition", String.valueOf(record.partition()).getBytes(StandardCharsets.UTF_8)));
            dltRecord.headers().add(new RecordHeader("X-DLT-Original-Offset", String.valueOf(record.offset()).getBytes(StandardCharsets.UTF_8)));
            dltRecord.headers().add(new RecordHeader("X-DLT-Original-Timestamp", String.valueOf(record.timestamp()).getBytes(StandardCharsets.UTF_8)));

            Throwable root = failure;
            while (root != null && root.getCause() != null && root != root.getCause()) {
                root = root.getCause();
            }
            String rootClass = root != null ? root.getClass().getName() : failure.getClass().getName();
            dltRecord.headers().add(new RecordHeader("X-DLT-Exception-Class", SafeLog.token(rootClass).getBytes(StandardCharsets.UTF_8)));
            dltRecord.headers().add(new RecordHeader("X-DLT-Exception-Message", sanitizeErrorMessage(failure != null ? failure.getMessage() : "Unknown failure").getBytes(StandardCharsets.UTF_8)));
            dltRecord.headers().add(new RecordHeader("X-DLT-Failed-At", Instant.now().toString().getBytes(StandardCharsets.UTF_8)));

            try {
                kafkaTemplate.send(dltRecord).get(timeoutSec, TimeUnit.SECONDS);
            } catch (Exception sendFailure) {
                throw new IllegalStateException("DLQ publish failed for topic " + targetTopic + ", aborting ack", sendFailure);
            }
        };
    }

    private static String sanitizeErrorMessage(String message) {
        if (message == null || message.isBlank()) {
            return "No exception message provided";
        }
        String sanitized = message
                .replaceAll("(?i)(bearer\\s+)[A-Za-z0-9._~+/-]+", "$1***")
                .replaceAll("(?i)(password|secret|token|apiKey|app-password|otp)[\"':=\\s]+[^\\s,;\"'\\}]+", "$1=***");
        if (sanitized.length() > 500) {
            sanitized = sanitized.substring(0, 500) + "...";
        }
        return sanitized;
    }

    @Bean
    DefaultErrorHandler kafkaErrorHandler(
            KafkaTemplate<String, String> kafkaTemplate,
            @Value("${clucky.kafka.retry.backoff-ms:1000}") long backoffMs,
            @Value("${clucky.kafka.retry.max-attempts:3}") long maxAttempts,
            @Value("${clucky.kafka.retry.dlt-timeout-sec:10}") long dltTimeoutSec) {
        ConsumerRecordRecoverer recoverer = createDltRecoverer(kafkaTemplate, dltTimeoutSec);
        DefaultErrorHandler handler = new DefaultErrorHandler(recoverer, new FixedBackOff(backoffMs, maxAttempts));
        handler.setAckAfterHandle(true);
        handler.setCommitRecovered(true);
        handler.setRetryListeners(KafkaLogging::failedDelivery);

        handler.addNotRetryableExceptions(
                IllegalArgumentException.class,
                IllegalStateException.class,
                com.fasterxml.jackson.core.JsonProcessingException.class,
                org.springframework.messaging.converter.MessageConversionException.class,
                org.springframework.kafka.support.serializer.DeserializationException.class,
                ClassCastException.class
        );
        return handler;
    }

    @Bean
    KafkaAdmin.NewTopics domainTopics(@Value("${clucky.kafka.partitions:3}") int partitions,
            @Value("${clucky.kafka.replicas:1}") int replicas) {
        if (partitions < 1 || replicas < 1) { throw new IllegalArgumentException("Invalid topic settings"); }
        NewTopic[] topics = List.of("order.created", "order.status-changed", "order.completed", "order.cancelled",
                "payment.confirmed", "payment.failed", "promotion.approved", "audit.recorded").stream()
                .flatMap(name -> java.util.stream.Stream.of(name, name + ".DLT"))
                .map(name -> TopicBuilder.name(name).partitions(partitions).replicas(replicas).build())
                .toArray(NewTopic[]::new);
        return new KafkaAdmin.NewTopics(topics);
    }
}
