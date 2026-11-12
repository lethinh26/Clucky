package com.clucky.cartorderservice.config;

import java.nio.charset.StandardCharsets;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.TimeUnit;
import com.clucky.cartorderservice.logging.KafkaLogging;
import com.clucky.cartorderservice.logging.SafeLog;
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

    ConsumerRecordRecoverer createDltRecoverer(
            KafkaTemplate<String, String> kafkaTemplate,
            ObjectMapper mapper,
            long timeoutSec) {
        return (record, failure) -> {
            String originalTopic = record.topic();
            String targetTopic = originalTopic.endsWith(".DLT") ? originalTopic : originalTopic + ".DLT";

            String raw = String.valueOf(record.value());
            String key = record.key() == null ? null : record.key().toString();
            if (key != null && !key.matches("[A-Za-z0-9._:-]{1,160}")) key = null;
            var quarantine = mapper.createObjectNode().put("sourceTopic", originalTopic)
                    .put("partition", record.partition()).put("offset", record.offset())
                    .put("consumerService", "cart-order-service").put("sourceKey", key).put("replayable", false);
            try {
                quarantine.put("sha256", java.util.HexFormat.of().formatHex(java.security.MessageDigest
                        .getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8))));
            } catch (java.security.NoSuchAlgorithmException unavailable) {
                throw new IllegalStateException("SHA-256 unavailable");
            }
            try {
                var original = raw.length() > 1_000_000 ? null : mapper.reader()
                        .with(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                        .with(com.fasterxml.jackson.databind.DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
                        .with(com.fasterxml.jackson.core.JsonParser.Feature.STRICT_DUPLICATE_DETECTION).readTree(raw);
                if (original != null && original.isObject() && original.path("payload").isObject()
                        && original.path("eventId").asText().matches("[A-Za-z0-9._-]{1,160}")
                        && original.path("correlationId").asText().matches("[A-Za-z0-9._-]{1,128}")
                        && originalTopic.equals(original.path("eventType").asText())
                        && original.path("sourceService").asText().matches("[a-z][a-z-]{0,63}")) {
                    Instant.parse(original.path("occurredAt").asText());
                    var event = mapper.createObjectNode();
                    for (String name : List.of("eventId", "correlationId", "eventType", "sourceService", "occurredAt")) {
                        event.set(name, original.get(name));
                    }
                    var payload = event.putObject("payload");
                    for (String name : List.of("orderId", "customerId", "storeId", "paymentId", "collectionId", "actorId",
                            "orderVersion", "amount", "receivedAmount", "totalAmount", "cashAmount", "declaredTransfer",
                            "paymentExpired", "orderDecisionFinal", "shippingFee")) {
                        var value = original.path("payload").get(name);
                        if (value != null && (value.isNumber() || value.isBoolean())) payload.set(name, value);
                    }
                    quarantine.set("event", event);
                    quarantine.put("replayable", key != null);
                }
            } catch (com.fasterxml.jackson.core.JsonProcessingException | java.time.format.DateTimeParseException invalid) {
                quarantine.put("replayable", false);
            }

            Long recordTimestamp = record.timestamp() >= 0 ? record.timestamp() : null;
            ProducerRecord<String, String> dltRecord = new ProducerRecord<>(
                    targetTopic,
                    null,
                    recordTimestamp,
                    key,
                    quarantine.toString()
            );

            if (record.headers() != null) {
                for (String name : List.of("X-Event-ID", "X-Correlation-ID")) {
                    var header = record.headers().lastHeader(name);
                    int limit = "X-Event-ID".equals(name) ? 160 : 128;
                    if (header != null && header.value() != null && header.value().length <= limit
                            && new String(header.value(), StandardCharsets.UTF_8).matches("[A-Za-z0-9._-]+")) {
                        dltRecord.headers().add(name, header.value());
                    }
                }
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
            dltRecord.headers().add(new RecordHeader("X-DLT-Exception-Message", "Consumer processing failed".getBytes(StandardCharsets.UTF_8)));
            dltRecord.headers().add(new RecordHeader("X-DLT-Failed-At", Instant.now().toString().getBytes(StandardCharsets.UTF_8)));

            try {
                kafkaTemplate.send(dltRecord).get(timeoutSec, TimeUnit.SECONDS);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("DLQ publication interrupted");
            } catch (Exception sendFailure) {
                throw new IllegalStateException("DLQ publication pending");
            }
        };
    }


    @Bean
    DefaultErrorHandler kafkaErrorHandler(
            KafkaTemplate<String, String> kafkaTemplate,
            ObjectMapper mapper,
            @Value("${clucky.kafka.retry.backoff-ms:1000}") long backoffMs,
            @Value("${clucky.kafka.retry.max-attempts:3}") long maxAttempts,
            @Value("${clucky.kafka.retry.dlt-timeout-sec:10}") long dltTimeoutSec) {
        if (backoffMs < 0 || maxAttempts < 0 || maxAttempts > 20 || dltTimeoutSec < 1) {
            throw new IllegalArgumentException("Invalid retry policy");
        }
        ConsumerRecordRecoverer recoverer = createDltRecoverer(kafkaTemplate, mapper, dltTimeoutSec);
        DefaultErrorHandler handler = new DefaultErrorHandler(recoverer, new FixedBackOff(backoffMs, maxAttempts));
        handler.setAckAfterHandle(true);
        handler.setCommitRecovered(true);
        handler.setRetryListeners(KafkaLogging::failedDelivery);

        handler.addNotRetryableExceptions(
                IllegalArgumentException.class,
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
                "payment.confirmed", "payment.received", "order.payment-resolved", "payment.failed", "promotion.approved", "audit.recorded").stream()
                .flatMap(name -> java.util.stream.Stream.of(name, name + ".DLT"))
                .map(name -> TopicBuilder.name(name).partitions(partitions).replicas(replicas).build())
                .toArray(NewTopic[]::new);
        return new KafkaAdmin.NewTopics(topics);
    }
}
