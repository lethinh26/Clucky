package com.clucky.shippingservice.config;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.TimeUnit;
import com.clucky.shippingservice.logging.KafkaLogging;
import com.clucky.shippingservice.logging.SafeLog;
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
String raw = String.valueOf(record.value());
                var quarantine = mapper.createObjectNode().put("sourceTopic",record.topic()).put("partition",record.partition())
                        .put("offset",record.offset()).put("consumerService","shipping-service");
                quarantine.put("sha256",java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                        .digest(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8))));
                try {
                    var original=mapper.reader().with(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                            .with(com.fasterxml.jackson.databind.DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
                            .with(com.fasterxml.jackson.core.JsonParser.Feature.STRICT_DUPLICATE_DETECTION).readTree(raw);
                    var event=mapper.createObjectNode();
                    for(String name:List.of("eventId","correlationId","eventType","sourceService","occurredAt")) {
                        if(original.path(name).isTextual()) event.set(name,original.get(name));
                    }
                    var payload=event.putObject("payload");
                    for(String name:List.of("orderId","orderCode","orderSource","customerId","storeId","paymentId","collectionId","operationType","actorId","actorRole",
                            "orderVersion","amount","receivedAmount","totalAmount","cashAmount","declaredTransfer","expiresAt","status","previousStatus","paymentStatus",
                            "decision","reason","paymentExpired","orderDecisionFinal","outcome","type","method","paymentMethod","shippingFee",
                            "receiverName","receiverPhone","deliveryAddress","latitude","longitude","customerName","customerEmail","email","statDate")) {
                        var value=original.path("payload").get(name);
                        if(value!=null && value.isValueNode())payload.set(name,value);
                    }
                    if(event.path("eventId").asText().matches("[A-Za-z0-9._-]{1,160}") && record.topic().equals(event.path("eventType").asText())) quarantine.set("event",event);
                } catch(com.fasterxml.jackson.core.JsonProcessingException ignored) { quarantine.put("replayable",false); }
                String key=record.key()==null?null:record.key().toString();
                if(key!=null&&!key.matches("[A-Za-z0-9._:-]{1,160}"))key=null;
                quarantine.put("sourceKey",key);
                kafka.send(record.topic()+".DLT",key,quarantine.toString()).get(10,java.util.concurrent.TimeUnit.SECONDS);
            } catch(InterruptedException interrupted) {
                Thread.currentThread().interrupt(); throw new IllegalStateException("DLQ publication interrupted");
            } catch(Exception unavailable) { throw new IllegalStateException("DLQ publication pending"); }
        }, new FixedBackOff(delay, attempts));
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

