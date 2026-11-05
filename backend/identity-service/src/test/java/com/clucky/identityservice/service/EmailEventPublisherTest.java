package com.clucky.identityservice.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.clucky.identityservice.config.AuthProperties;
import com.clucky.identityservice.exception.ApiException;
import com.clucky.identityservice.exception.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.junit.jupiter.api.Test;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;

class EmailEventPublisherTest {
    private final KafkaTemplate<String, String> kafka = mock(KafkaTemplate.class);
    private final EmailEventPublisher publisher = new EmailEventPublisher(kafka, new ObjectMapper(),
            new AuthProperties(null, null, null, null, null));

    @Test
    void waitsForBrokerAcknowledgement() throws Exception {
        CompletableFuture<SendResult<String, String>> pending = mock(CompletableFuture.class);
        when(kafka.send(any(ProducerRecord.class))).thenReturn(pending);
        publisher.publishOtpEmail("a@example.com", "register-otp", "123456", Map.of());
        verify(pending).get(10, TimeUnit.SECONDS);
    }

    @Test
    void failedPublishIsNotReportedAsSuccess() {
        when(kafka.send(any(ProducerRecord.class)))
                .thenReturn(CompletableFuture.failedFuture(new IllegalStateException("Unavailable")));
        assertUnavailable();
    }

    @Test
    void publishTimeoutIsNotReportedAsSuccess() throws Exception {
        CompletableFuture<SendResult<String, String>> pending = mock(CompletableFuture.class);
        when(kafka.send(any(ProducerRecord.class))).thenReturn(pending);
        when(pending.get(10, TimeUnit.SECONDS)).thenThrow(new TimeoutException());
        assertUnavailable();
    }

    private void assertUnavailable() {
        assertEquals(ErrorCode.DEPENDENCY_UNAVAILABLE, assertThrows(ApiException.class,
                () -> publisher.publishOtpEmail("a@example.com", "register-otp", "123456", Map.of())).getCode());
    }
}
