package com.clucky.shippingservice.config;

import java.util.List;
import com.clucky.shippingservice.logging.KafkaLogging;
import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.KafkaAdmin;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration(proxyBeanMethods = false)
@EnableKafka
public class KafkaConfig {
    @Bean
    DefaultErrorHandler kafkaErrorHandler(org.springframework.kafka.core.KafkaTemplate<String,String> kafka,
            com.fasterxml.jackson.databind.ObjectMapper mapper,
            @Value("${clucky.kafka.retry-delay-ms:2000}") long delay,
            @Value("${clucky.kafka.retry-attempts:5}") long attempts) {
        if (delay < 1 || attempts < 1 || attempts > 20) throw new IllegalArgumentException("Invalid retry policy");
        DefaultErrorHandler handler = new DefaultErrorHandler((record, failure) -> {
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
        return handler;
    }

    @Bean
    KafkaAdmin.NewTopics domainTopics(@Value("${clucky.kafka.partitions:3}") int partitions,
            @Value("${clucky.kafka.replicas:1}") int replicas) {
        if (partitions < 1 || replicas < 1) { throw new IllegalArgumentException("Invalid topic settings"); }
        NewTopic[] topics = List.of("order.created", "order.status-changed", "order.completed", "order.cancelled",
                "payment.confirmed", "payment.failed", "promotion.approved", "audit.recorded").stream()
                .flatMap(name -> java.util.stream.Stream.of(name,name+".DLT"))
                .map(name -> TopicBuilder.name(name).partitions(partitions).replicas(replicas).build())
                .toArray(NewTopic[]::new);
        return new KafkaAdmin.NewTopics(topics);
    }
}
