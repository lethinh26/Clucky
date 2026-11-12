package com.clucky.auditservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
public class KafkaConfig {
    @Bean
    DefaultErrorHandler kafkaErrorHandler(org.springframework.kafka.core.KafkaTemplate<String, String> kafka,
            com.fasterxml.jackson.databind.ObjectMapper mapper) {
        var handler = new DefaultErrorHandler((record, failure) -> {
            Throwable cause = failure;
            while (cause.getCause() != null && cause.getCause() != cause) cause = cause.getCause();
            if (!(cause instanceof IllegalArgumentException)) {
                throw new IllegalStateException("Audit persistence requires retry");
            }
            try {
                var quarantine = mapper.createObjectNode().put("sourceTopic", record.topic())
                        .put("partition", record.partition()).put("offset", record.offset())
                        .put("category", "INVALID_AUDIT_EVENT").put("replayable", false);
                quarantine.put("sha256", java.util.HexFormat.of().formatHex(
                        java.security.MessageDigest.getInstance("SHA-256").digest(
                                String.valueOf(record.value()).getBytes(java.nio.charset.StandardCharsets.UTF_8))));
                kafka.send(record.topic() + ".DLT", null, quarantine.toString())
                        .get(10, java.util.concurrent.TimeUnit.SECONDS);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Audit quarantine interrupted");
            } catch (Exception unavailable) {
                throw new IllegalStateException("Audit quarantine pending");
            }
        }, new FixedBackOff(1000L, 2L));
        handler.addNotRetryableExceptions(IllegalArgumentException.class);
        handler.setAckAfterHandle(true);
        handler.setCommitRecovered(true);
        return handler;
    }
}
