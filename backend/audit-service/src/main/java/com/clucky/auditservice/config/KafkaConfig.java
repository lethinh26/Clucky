package com.clucky.auditservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
public class KafkaConfig {
    @Bean
    DefaultErrorHandler kafkaErrorHandler() {
        var handler = new DefaultErrorHandler((record, failure) -> {
            throw new IllegalStateException("Audit persistence requires retry");
        }, new FixedBackOff(1000L, 2L));
        handler.setAckAfterHandle(false);
        return handler;
    }
}
