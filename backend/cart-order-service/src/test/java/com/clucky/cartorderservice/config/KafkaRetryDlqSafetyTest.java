package com.clucky.cartorderservice.config;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.header.internals.RecordHeader;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.support.SendResult;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class KafkaRetryDlqSafetyTest {

    @Test
    @DisplayName("KAFKA-08/AC-01 & AC-03: Transient failure exhausts retries and publishes to DLT with headers")
    void transientFailureExhaustsRetriesAndPublishesToDlt() {
        @SuppressWarnings("unchecked")
        KafkaTemplate<String, String> kafkaTemplate = mock(KafkaTemplate.class);
        CompletableFuture<SendResult<String, String>> future = CompletableFuture.completedFuture(mock(SendResult.class));
        when(kafkaTemplate.send(any(ProducerRecord.class))).thenReturn(future);

        KafkaConfig kafkaConfig = new KafkaConfig();
        DefaultErrorHandler handler = kafkaConfig.kafkaErrorHandler(kafkaTemplate, 10L, 2L, 5L);

        ConsumerRecord<Object, Object> record = new ConsumerRecord<>("order.created", 0, 100L, "ord-1", "{\"orderId\": 1}");
        record.headers().add(new RecordHeader("X-Event-ID", "evt-12345".getBytes(StandardCharsets.UTF_8)));
        record.headers().add(new RecordHeader("X-Correlation-ID", "corr-999".getBytes(StandardCharsets.UTF_8)));

        RuntimeException transientError = new RuntimeException("DB Connection timeout");

        // Mô phỏng container gọi handler khi listener gặp transient error
        handler.handleOne(transientError, record, mock(org.apache.kafka.clients.consumer.Consumer.class), mock(org.springframework.kafka.listener.MessageListenerContainer.class));

        // Xác nhận đã publish vào DLT
        @SuppressWarnings("unchecked")
        ArgumentCaptor<ProducerRecord<String, String>> captor = ArgumentCaptor.forClass(ProducerRecord.class);
        verify(kafkaTemplate, times(1)).send(captor.capture());

        ProducerRecord<String, String> dltRecord = captor.getValue();
        assertEquals("order.created.DLT", dltRecord.topic());
        assertEquals("ord-1", dltRecord.key());
        assertEquals("{\"orderId\": 1}", dltRecord.value());

        // Kiểm tra headers chẩn đoán
        assertEquals("order.created", new String(dltRecord.headers().lastHeader("X-DLT-Original-Topic").value(), StandardCharsets.UTF_8));
        assertEquals("0", new String(dltRecord.headers().lastHeader("X-DLT-Original-Partition").value(), StandardCharsets.UTF_8));
        assertEquals("100", new String(dltRecord.headers().lastHeader("X-DLT-Original-Offset").value(), StandardCharsets.UTF_8));
        assertEquals("evt-12345", new String(dltRecord.headers().lastHeader("X-Event-ID").value(), StandardCharsets.UTF_8));
        assertEquals("corr-999", new String(dltRecord.headers().lastHeader("X-Correlation-ID").value(), StandardCharsets.UTF_8));
        assertNotNull(dltRecord.headers().lastHeader("X-DLT-Failed-At"));
        assertTrue(new String(dltRecord.headers().lastHeader("X-DLT-Exception-Message").value(), StandardCharsets.UTF_8).contains("DB Connection timeout"));
    }

    @Test
    @DisplayName("KAFKA-08/AC-02: Permanent / malformed error bypasses retry loop directly to DLT")
    void permanentMalformedErrorRoutesImmediatelyToDlt() {
        @SuppressWarnings("unchecked")
        KafkaTemplate<String, String> kafkaTemplate = mock(KafkaTemplate.class);
        CompletableFuture<SendResult<String, String>> future = CompletableFuture.completedFuture(mock(SendResult.class));
        when(kafkaTemplate.send(any(ProducerRecord.class))).thenReturn(future);

        KafkaConfig kafkaConfig = new KafkaConfig();
        // Cấu hình max-attempts = 5
        DefaultErrorHandler handler = kafkaConfig.kafkaErrorHandler(kafkaTemplate, 10L, 5L, 5L);

        ConsumerRecord<Object, Object> record = new ConsumerRecord<>("order.created", 1, 200L, "ord-2", "{invalid-json}");
        IllegalArgumentException malformedError = new IllegalArgumentException("Malformed payload syntax");

        // Gọi handleOne với non-retryable exception
        handler.handleOne(malformedError, record, mock(org.apache.kafka.clients.consumer.Consumer.class), mock(org.springframework.kafka.listener.MessageListenerContainer.class));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<ProducerRecord<String, String>> captor = ArgumentCaptor.forClass(ProducerRecord.class);
        verify(kafkaTemplate, times(1)).send(captor.capture());

        ProducerRecord<String, String> dltRecord = captor.getValue();
        assertEquals("order.created.DLT", dltRecord.topic());
        assertTrue(new String(dltRecord.headers().lastHeader("X-DLT-Exception-Class").value(), StandardCharsets.UTF_8).contains("IllegalArgumentException"));
    }

    @Test
    @DisplayName("KAFKA-08/AC-04: DLQ publish failure throws exception to prevent false ACK")
    void dlqPublishFailureAbortsAck() {
        @SuppressWarnings("unchecked")
        KafkaTemplate<String, String> kafkaTemplate = mock(KafkaTemplate.class);
        CompletableFuture<SendResult<String, String>> failedFuture = new CompletableFuture<>();
        failedFuture.completeExceptionally(new ExecutionException("Broker unreachable", new RuntimeException()));
        when(kafkaTemplate.send(any(ProducerRecord.class))).thenReturn(failedFuture);

        KafkaConfig kafkaConfig = new KafkaConfig();
        DefaultErrorHandler handler = kafkaConfig.kafkaErrorHandler(kafkaTemplate, 10L, 1L, 2L);

        ConsumerRecord<Object, Object> record = new ConsumerRecord<>("order.created", 0, 50L, "ord-3", "value");

        // Khi DLT publish lỗi, handler phải ném exception để container không commit offset
        assertThrows(IllegalStateException.class, () ->
                handler.handleOne(new RuntimeException("Crash"), record, mock(org.apache.kafka.clients.consumer.Consumer.class), mock(org.springframework.kafka.listener.MessageListenerContainer.class)));
    }

    @Test
    @DisplayName("KAFKA-08/AC-08 & AC-13: DLT header sanitizes secrets and tokens")
    void dltHeaderSanitizesSecrets() {
        @SuppressWarnings("unchecked")
        KafkaTemplate<String, String> kafkaTemplate = mock(KafkaTemplate.class);
        CompletableFuture<SendResult<String, String>> future = CompletableFuture.completedFuture(mock(SendResult.class));
        when(kafkaTemplate.send(any(ProducerRecord.class))).thenReturn(future);

        KafkaConfig kafkaConfig = new KafkaConfig();
        DefaultErrorHandler handler = kafkaConfig.kafkaErrorHandler(kafkaTemplate, 10L, 1L, 2L);

        ConsumerRecord<Object, Object> record = new ConsumerRecord<>("order.created", 0, 10L, "ord-4", "payload");
        RuntimeException leakException = new RuntimeException("Authentication failed for token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 and password=SuperSecretPassword123");

        handler.handleOne(leakException, record, mock(org.apache.kafka.clients.consumer.Consumer.class), mock(org.springframework.kafka.listener.MessageListenerContainer.class));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<ProducerRecord<String, String>> captor = ArgumentCaptor.forClass(ProducerRecord.class);
        verify(kafkaTemplate).send(captor.capture());

        String dltMessageHeader = new String(captor.getValue().headers().lastHeader("X-DLT-Exception-Message").value(), StandardCharsets.UTF_8);
        assertFalse(dltMessageHeader.contains("SuperSecretPassword123"), "Password must be sanitized");
        assertFalse(dltMessageHeader.contains("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"), "Token must be sanitized");
        assertTrue(dltMessageHeader.contains("***"), "Sanitized placeholder must be present");
    }
}

