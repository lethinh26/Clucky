package com.clucky.auditservice.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.concurrent.CompletableFuture;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.MessageListenerContainer;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AuditRecoveryTest {
    @Test
    @SuppressWarnings("unchecked")
    void invalidEventIsQuarantinedOnlyAfterBrokerAckWithoutLeakingPayload() {
        KafkaTemplate<String, String> kafka = mock(KafkaTemplate.class);
        when(kafka.send(anyString(), isNull(), anyString())).thenReturn(CompletableFuture.completedFuture(null));
        var handler = new KafkaConfig().kafkaErrorHandler(kafka, new ObjectMapper());
        var record = new ConsumerRecord<Object, Object>("audit.recorded", 1, 19L, "secret-key", "password=secret");
        record.headers().add("Authorization", "Bearer secret".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        Consumer<?, ?> consumer = mock(Consumer.class);
        MessageListenerContainer container = mock(MessageListenerContainer.class);
        assertTrue(handler.handleOne(new IllegalArgumentException("secret-error"), record, consumer, container));
        var payload = ArgumentCaptor.forClass(String.class);
        verify(kafka).send(eq("audit.recorded.DLT"), isNull(), payload.capture());
        assertFalse(payload.getValue().contains("secret"));
        assertTrue(payload.getValue().contains("\"offset\":19"));
        assertTrue(payload.getValue().contains("sha256"));
        when(kafka.send(anyString(), isNull(), anyString()))
                .thenReturn(CompletableFuture.failedFuture(new IllegalStateException("Broker unavailable")));
        assertFalse(handler.handleOne(new IllegalArgumentException("Invalid audit event"), record, consumer, container));
    }

    @Test
    @SuppressWarnings("unchecked")
    void databaseFailureNeverCommitsRecoveryOrDiscardsTheAuditIntent() {
        KafkaTemplate<String, String> kafka = mock(KafkaTemplate.class);
        var handler = new KafkaConfig().kafkaErrorHandler(kafka, new ObjectMapper());
        var record = new ConsumerRecord<Object, Object>("audit.recorded", 0, 2L, "event-id", "{}");
        Consumer<?, ?> consumer = mock(Consumer.class);
        MessageListenerContainer container = mock(MessageListenerContainer.class);
        for (int attempt = 0; attempt < 3; attempt++) {
            assertFalse(handler.handleOne(new IllegalStateException("Audit persistence pending"), record, consumer, container));
        }
        verifyNoInteractions(kafka);
    }
}
