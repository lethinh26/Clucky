package com.clucky.notificationservice;

import com.clucky.notificationservice.consumer.NotificationConsumer;
import com.clucky.notificationservice.dto.DomainEvent;
import com.clucky.notificationservice.entity.Notification;
import com.clucky.notificationservice.mapper.EventMapper;
import com.clucky.notificationservice.repository.NotificationRepository;
import com.clucky.notificationservice.service.EmailSenderService;
import com.clucky.notificationservice.service.CustomerContactClient;
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
    private final CustomerContactClient contacts = mock(CustomerContactClient.class);
    @Test
    void inboxUsesTheOwnerForFilteringAndTheGlobalUnreadCount() {
        var repository = mock(NotificationRepository.class);
        var pageable = org.springframework.data.domain.PageRequest.of(1, 20);
        when(repository.findInbox(7L, true, "ORDER", pageable))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(java.util.List.of(), pageable, 20));
        when(repository.countByUserIdAndIsReadFalse(7L)).thenReturn(25L);
        var inbox = new NotificationService(repository).inbox(7L, pageable, true, "ORDER");
        assertEquals(25, inbox.unreadCount());
        assertEquals(1, inbox.page());
        verify(repository).findInbox(7L, true, "ORDER", pageable);
        assertThrows(ApiException.class, () -> new NotificationService(repository).inbox(7L, pageable, false, "PRIVATE"));
    }

    @Test
    void eventReplayPreservesReadStateAndAcknowledgesOnlyAfterCommit() {
        var mapper = mock(EventMapper.class);
        var repository = mock(NotificationRepository.class);
        var sender = mock(EmailSenderService.class);
        when(contacts.verifiedEmail(7L)).thenReturn("customer@example.com");
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
            new NotificationConsumer(mapper, repository, sender, mock(org.springframework.jdbc.core.JdbcTemplate.class), "https://clucky.example", contacts).consume(new ConsumerRecord<>("order.completed", 0, 0, "1", "event"), ack);
            verifyNoInteractions(ack);
            verify(repository, never()).save(any());
            assertTrue(existing.getIsRead());
            verify(sender).processEmailIntent(argThat(key -> key.length() <= 160), eq(event.eventId()), eq("correlation"), eq("customer@example.com"), eq("ORDER_COMPLETED"), anyMap(), isNull(), isNull());
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
        new NotificationConsumer(mapper,repository,sender,jdbc,"https://clucky.example",contacts).consume(new ConsumerRecord<>("payment.failed",0,0,"10","event"),null);
        verifyNoInteractions(repository,sender);
    }

    @Test
    void malformedEventIsNotAcknowledged() {
        var mapper = mock(EventMapper.class);
        var ack = mock(Acknowledgment.class);
        when(mapper.fromJson(anyString(), anyString())).thenThrow(new IllegalArgumentException());
        var consumer = new NotificationConsumer(mapper, mock(NotificationRepository.class), mock(EmailSenderService.class), mock(org.springframework.jdbc.core.JdbcTemplate.class), "https://clucky.example", contacts);
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

    @Test
    void transactionalEventsUseTheVerifiedOwnerAndExpectedTemplate() {
        String[][] scenarios = {
                {"order.created", "PENDING_PAYMENT", "ORDER_CREATED"}, {"order.created", "CONFIRMED", "ORDER_CONFIRMED"},
                {"order.status-changed", "CONFIRMED", "ORDER_CONFIRMED"}, {"order.status-changed", "PREPARING", "ORDER_PREPARING"},
                {"order.status-changed", "READY", "ORDER_READY"}, {"order.completed", "COMPLETED", "ORDER_COMPLETED"},
                {"order.cancelled", "CANCELLED", "ORDER_CANCELLED"}, {"payment.confirmed", "PAID", "PAYMENT_CONFIRMED"},
                {"payment.failed", "EXPIRED", "PAYMENT_FAILED"}, {"refund.approved", "APPROVED", "REFUND_APPROVED"},
                {"refund.rejected", "REJECTED", "REFUND_REJECTED"}, {"refund.waiting-bank-details", "WAITING_BANK_DETAILS", "REFUND_WAITING_BANK_DETAILS"},
                {"refund.processed", "REFUNDED", "REFUND_PROCESSED"}, {"refund.confirmed", "REFUNDED", "REFUND_PROCESSED"}
        };
        for (String[] scenario : scenarios) {
            var mapper = mock(EventMapper.class);
            var jdbc = mock(org.springframework.jdbc.core.JdbcTemplate.class);
            var sender = mock(EmailSenderService.class);
            var json = new ObjectMapper();
            var payload = json.createObjectNode().put("orderId", 42).put("customerId", 7).put("storeId", 3)
                    .put("refundId", 5).put("orderCode", "CLK-42").put("amount", 25000).put("totalAmount", 25000)
                    .put("status", scenario[1]).put("type", "PICKUP").put("email", "attacker@example.com");
            payload.putObject("recipient").put("userId", 7).put("role", "CUSTOMER").put("emailVerified", true).put("email", "owner@example.com");
            payload.putArray("items").addObject().put("itemName", "Gà giòn").put("quantity", 1).put("lineTotal", 25000);
            when(contacts.verifiedEmail(7L)).thenReturn("owner@example.com");
            when(mapper.fromJson("event", scenario[0])).thenReturn(new DomainEvent("event-42", "trace", scenario[0],
                    scenario[0].startsWith("payment.") ? "payment-service" : "cart-order-service", Instant.now(), payload));
            new NotificationConsumer(mapper, mock(NotificationRepository.class), sender, jdbc, "https://clucky.example", contacts)
                    .consume(new ConsumerRecord<>(scenario[0], 0, 0, "42", "event"), null);
            verify(sender).processEmailIntent(anyString(), eq("event-42"), eq("trace"), eq("owner@example.com"), eq(scenario[2]),
                    argThat(variables -> "42".equals(variables.get("orderId")) && (!scenario[0].startsWith("order.")
                            || variables.get("orderItems").contains("Gà giòn"))), eq(3L), isNull());
        }
    }

    @Test
    void contactFailureIsNotAcknowledgedAndCommittedDeliveryDoesNotResolveAgain() {
        var mapper = mock(EventMapper.class);
        var jdbc = mock(org.springframework.jdbc.core.JdbcTemplate.class);
        var sender = mock(EmailSenderService.class);
        var ack = mock(Acknowledgment.class);
        var payload = new ObjectMapper().createObjectNode().put("orderId", 42).put("customerId", 7).put("storeId", 3);
        when(mapper.fromJson("event", "order.completed")).thenReturn(new DomainEvent("event-42", "trace", "order.completed", "cart-order-service", Instant.now(), payload));
        when(contacts.verifiedEmail(7L)).thenThrow(new IllegalStateException("Verified customer contact unavailable"));
        var consumer = new NotificationConsumer(mapper, mock(NotificationRepository.class), sender, jdbc, "https://clucky.example", contacts);
        assertThrows(IllegalStateException.class, () -> consumer.consume(new ConsumerRecord<>("order.completed", 0, 0, "42", "event"), ack));
        verifyNoInteractions(ack, sender);
        clearInvocations(contacts);
        when(jdbc.queryForList(contains("email_logs"), anyString(), eq("event-42"), eq("ORDER_COMPLETED")))
                .thenReturn(java.util.List.of(java.util.Map.of("id", 1L)));
        consumer.consume(new ConsumerRecord<>("order.completed", 0, 0, "42", "event"), null);
        verifyNoInteractions(contacts, sender);
    }

    @Test
    void emailItemTableIsBoundedAndDoesNotCopyPrivateOrderNotes() {
        var mapper = mock(EventMapper.class);
        var sender = mock(EmailSenderService.class);
        var payload = new ObjectMapper().createObjectNode().put("orderId", 42).put("customerId", 7).put("storeId", 3)
                .put("paymentStatus", "PENDING").put("paymentMethod", "COD").put("type", "PICKUP")
                .put("subtotal", 310000).put("totalAmount", 310000).put("note", "PRIVATE_ORDER_NOTE");
        var items = payload.putArray("items");
        for (int index = 0; index < 31; index++) {
            items.addObject().put("itemName", "Món " + index).put("quantity", 1).put("unitPrice", 10000)
                    .put("lineTotal", 10000).put("note", "PRIVATE_ITEM_NOTE");
        }
        when(mapper.fromJson("event", "order.completed")).thenReturn(new DomainEvent("event-42", "trace", "order.completed",
                "cart-order-service", Instant.now(), payload));
        when(contacts.verifiedEmail(7L)).thenReturn("owner@example.com");
        new NotificationConsumer(mapper, mock(NotificationRepository.class), sender, mock(org.springframework.jdbc.core.JdbcTemplate.class),
                "https://clucky.example", contacts).consume(new ConsumerRecord<>("order.completed", 0, 0, "42", "event"), null);
        verify(sender).processEmailIntent(anyString(), anyString(), anyString(), eq("owner@example.com"), eq("ORDER_COMPLETED"),
                argThat(variables -> "true".equals(variables.get("moreItems")) && variables.get("orderItems").length() < 10000
                        && variables.get("orderItems").contains("Món 29") && !variables.get("orderItems").contains("Món 30")
                        && !variables.toString().contains("PRIVATE_") && "310000".equals(variables.get("totalAmount"))
                        && "PENDING".equals(variables.get("paymentStatus"))), eq(3L), isNull());
    }

    @Test
    void completionStatusAndCollectionEventsDoNotDuplicateOrOverstatePayment() {
        for (String type : java.util.List.of("order.status-changed", "payment.confirmed")) {
            var mapper = mock(EventMapper.class);
            var sender = mock(EmailSenderService.class);
            var payload = new ObjectMapper().createObjectNode().put("orderId", 42).put("customerId", 7).put("storeId", 3)
                    .put("status", "COMPLETED").put("operationType", "COLLECTION");
            when(mapper.fromJson("event", type)).thenReturn(new DomainEvent("event-42", "trace", type,
                    type.startsWith("order.") ? "cart-order-service" : "payment-service", Instant.now(), payload));
            new NotificationConsumer(mapper, mock(NotificationRepository.class), sender, mock(org.springframework.jdbc.core.JdbcTemplate.class),
                    "https://clucky.example", contacts).consume(new ConsumerRecord<>(type, 0, 0, "42", "event"), null);
            verifyNoInteractions(contacts, sender);
        }
    }
}
