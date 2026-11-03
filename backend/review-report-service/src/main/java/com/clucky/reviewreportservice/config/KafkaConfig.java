package com.clucky.reviewreportservice.config;

import java.util.List;
import com.clucky.reviewreportservice.logging.KafkaLogging;
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
    DefaultErrorHandler kafkaErrorHandler() {
        DefaultErrorHandler handler = new DefaultErrorHandler((record, failure) -> {
            throw new IllegalStateException("Event recovery requires a configured durable DLQ handler");
        }, new FixedBackOff(1000L, 2L));
        handler.setAckAfterHandle(false);
        handler.setRetryListeners(KafkaLogging::failedDelivery);
        return handler;
    }

    @Bean
    KafkaAdmin.NewTopics domainTopics(@Value("${clucky.kafka.partitions:3}") int partitions,
            @Value("${clucky.kafka.replicas:1}") int replicas) {
        if (partitions < 1 || replicas < 1) { throw new IllegalArgumentException("Invalid topic settings"); }
        NewTopic[] topics = List.of("order.created", "order.status-changed", "order.completed", "order.cancelled",
                "payment.confirmed", "payment.failed", "promotion.approved", "audit.recorded").stream()
                .map(name -> TopicBuilder.name(name).partitions(partitions).replicas(replicas).build())
                .toArray(NewTopic[]::new);
        return new KafkaAdmin.NewTopics(topics);
    }
}
