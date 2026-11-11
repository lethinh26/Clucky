package com.clucky.notificationservice;

import com.clucky.notificationservice.consumer.NotificationConsumer;
import com.clucky.notificationservice.dto.DomainEvent;
import com.clucky.notificationservice.entity.Notification;
import com.clucky.notificationservice.mapper.EventMapper;
import com.clucky.notificationservice.repository.NotificationRepository;
import com.clucky.notificationservice.service.EmailSenderService;
import com.clucky.notificationservice.service.NotificationService;
import com.clucky.notificationservice.exception.ApiException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.Test;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class NotificationSafetyTest {
    @Test
    void eventReplayPreservesReadStateAndAcknowledgesOnlyAfterCommit() {
        var mapper = mock(EventMapper.class);
        var repository = mock(NotificationRepository.class);
        var sender = mock(EmailSenderService.class);
        var ack = mock(Acknowledgment.class);
        var payload = new ObjectMapper().createObjectNode().put("customerId", 7).put("orderId", 1)
                .put("customerEmail", "customer@example.com").put("status", "COMPLETED");
        var event = new DomainEvent("e".repeat(160), "correlation", "order.completed", "cart-order-service", Instant.now(), payload);
        when(mapper.fromJson("event", "order.completed")).thenReturn(event);
        var existing = new Notification();
        existing.setIsRead(true);
        when(repository.findByOperationKey(anyString())).thenReturn(Optional.of(existing));
        TransactionSynchronizationManager.initSynchronization();
        try {
            new NotificationConsumer(mapper, repository, sender, mock(org.springframework.jdbc.core.JdbcTemplate.class), "https://clucky.example").consume(new ConsumerRecord<>("order.completed", 0, 0, "1", "event"), ack);
            verifyNoInteractions(ack);
            verify(repository, never()).save(any());
            assertTrue(existing.getIsRead());
            verify(sender).processEmailIntent(argThat(key -> key.length() <= 160), eq(event.eventId()), eq("correlation"), eq("customer@example.com"), eq("ORDER_COMPLETED"), anyMap());
            TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCommit());
            verify(ack).acknowledge();
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void failureAfterConfirmationDoesNotNotifyAgain() {
        var mapper=mock(EventMapper.class);
        var jdbc=mock(org.springframework.jdbc.core.JdbcTemplate.class);
        var repository=mock(NotificationRepository.class);
        var sender=mock(EmailSenderService.class);
        var payload=new ObjectMapper().createObjectNode().put("orderId",10L).put("customerId",7L);
        var event=new DomainEvent("late-failure","trace","payment.failed","payment-service",Instant.now(),payload);
        when(mapper.fromJson("event","payment.failed")).thenReturn(event);
        when(jdbc.queryForMap(anyString(),eq(10L))).thenReturn(java.util.Map.of("confirmed",true,"failed",false));
        new NotificationConsumer(mapper,repository,sender,jdbc,"https://clucky.example").consume(new ConsumerRecord<>("payment.failed",0,0,"10","event"),null);
        verifyNoInteractions(repository,sender);
    }

    @Test
    void malformedEventIsNotAcknowledged() {
        var mapper = mock(EventMapper.class);
        var ack = mock(Acknowledgment.class);
        when(mapper.fromJson(anyString(), anyString())).thenThrow(new IllegalArgumentException());
        var consumer = new NotificationConsumer(mapper, mock(NotificationRepository.class), mock(EmailSenderService.class), mock(org.springframework.jdbc.core.JdbcTemplate.class), "https://clucky.example");
        assertThrows(IllegalArgumentException.class, () -> consumer.consume(new ConsumerRecord<>("order.created", 0, 0, "1", "invalid"), ack));
        verifyNoInteractions(ack);
    }

    @Test
    void markingAnotherUsersNotificationIsRejected() {
        var repository = mock(NotificationRepository.class);
        assertThrows(ApiException.class, () -> new NotificationService(repository).markRead(1L, 7L));
        verify(repository).findByIdAndUserId(1L, 7L);
        verify(repository, never()).save(any());
    }
}
