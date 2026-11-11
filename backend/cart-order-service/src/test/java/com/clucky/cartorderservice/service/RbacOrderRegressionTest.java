package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.config.AccessGuard;
import com.clucky.cartorderservice.dto.CancelOrderRequest;
import com.clucky.cartorderservice.dto.UpdateOrderStatusRequest;
import com.clucky.cartorderservice.entity.Order;
import com.clucky.cartorderservice.entity.OrderStatusHistory;
import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import com.clucky.cartorderservice.repository.OrderRepository;
import com.clucky.cartorderservice.repository.OrderItemRepository;
import com.clucky.cartorderservice.repository.OrderStatusHistoryRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RbacOrderRegressionTest {
    private final OrderRepository orders = mock(OrderRepository.class);
    private final OrderStatusHistoryRepository history = mock(OrderStatusHistoryRepository.class);
    private final OrderEventPublisher events = mock(OrderEventPublisher.class);
    private final OrderService service = new OrderService(orders, mock(OrderItemRepository.class), history,
            null, new AccessGuard(), null, events, null, null, null, null, mock(VoucherCheckoutRecovery.class), mock(CustomerProfileClient.class));

    @AfterEach
    void clearActor() { SecurityContextHolder.clearContext(); }

    private void actor(String role, Long storeId) {
        var builder = Jwt.withTokenValue("test").header("alg", "HS256").subject("1").claim("role", role);
        if (storeId != null) builder.claim("storeId", storeId);
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(builder.build(), List.of()));
    }

    private Order order(String status) {
        Order order = new Order();
        order.setId(1L);
        order.setCustomerId(1L);
        order.setStoreId(10L);
        order.setStatus(status);
        when(orders.lockById(1L)).thenReturn(Optional.of(order));
        when(orders.save(order)).thenReturn(order);
        return order;
    }

    @Test
    void internalActorsCannotCheckoutEvenWithTheSameCustomerId() {
        for (String role : List.of("STAFF", "STORE_MANAGER", "ADMIN")) {
            actor(role, 10L);
            assertThrows(AccessDeniedException.class, () -> service.createOrder(null));
            assertThrows(AccessDeniedException.class, () -> service.previewOrder(null, null));
            order("CONFIRMED");
            assertThrows(AccessDeniedException.class, () -> service.cancelOrder(1L, new CancelOrderRequest("Reason")));
        }
        verify(orders, never()).save(any());
    }

    @Test
    void everyCancellationEntryRejectsPreparationAndLaterStates() {
        for (String status : List.of("PREPARING", "READY", "SHIPPING", "COMPLETED", "CANCELLED")) {
            Order order = order(status);
            actor("CUSTOMER", null);
            assertEquals(ErrorCode.RESOURCE_CONFLICT, assertThrows(ApiException.class,
                    () -> service.cancelOrder(1L, new CancelOrderRequest("Reason"))).getCode());
            for (String role : List.of("STAFF", "STORE_MANAGER", "ADMIN")) {
                actor(role, 10L);
                assertEquals(ErrorCode.RESOURCE_CONFLICT, assertThrows(ApiException.class,
                        () -> service.rejectOrder(1L, new CancelOrderRequest("Reason"))).getCode());
                assertEquals(ErrorCode.RESOURCE_CONFLICT, assertThrows(ApiException.class,
                        () -> service.updateStatus(1L, new UpdateOrderStatusRequest("CANCELLED", "Reason"))).getCode());
            }
            assertEquals(status, order.getStatus());
        }
        verifyNoInteractions(history, events);
        verify(orders, never()).save(any());
    }

    @Test
    void cancellationRequiresBoundedReasonAndPersistsVerifiedActor() {
        order("CONFIRMED");
        actor("STAFF", 10L);
        for (String reason : List.of("", "   ", "x".repeat(1001))) {
            assertEquals(ErrorCode.VALIDATION_ERROR, assertThrows(ApiException.class,
                    () -> service.rejectOrder(1L, new CancelOrderRequest(reason))).getCode());
            assertEquals(ErrorCode.VALIDATION_ERROR, assertThrows(ApiException.class,
                    () -> service.updateStatus(1L, new UpdateOrderStatusRequest("CANCELLED", reason))).getCode());
        }
        var saved = service.rejectOrder(1L, new CancelOrderRequest("  Unavailable item  "));
        assertEquals("CANCELLED", saved.status());
        assertEquals("PENDING", saved.paymentStatus());
        var captured = ArgumentCaptor.forClass(OrderStatusHistory.class);
        verify(history).save(captured.capture());
        assertEquals("Unavailable item", captured.getValue().getReason());
        assertEquals(1L, captured.getValue().getChangedBy());
        assertEquals("STAFF", captured.getValue().getChangedRole());
    }

    @Test
    void missingOrForeignStoreCannotMutateAndAdminCannotInventPayment() {
        Order order = order("READY");
        for (Long storeId : new Long[] { null, 20L }) {
            actor("STAFF", storeId);
            assertThrows(AccessDeniedException.class,
                    () -> service.updateStatus(1L, new UpdateOrderStatusRequest("COMPLETED", null)));
        }
        actor("ADMIN", null);
        assertEquals(ErrorCode.RESOURCE_CONFLICT, assertThrows(ApiException.class,
                () -> service.updateStatus(1L, new UpdateOrderStatusRequest("COMPLETED", null))).getCode());
        assertEquals("READY", order.getStatus());
        order("PENDING_PAYMENT");
        assertEquals(ErrorCode.RESOURCE_CONFLICT, assertThrows(ApiException.class,
                () -> service.updateStatus(1L, new UpdateOrderStatusRequest("CONFIRMED", null))).getCode());
        verifyNoInteractions(history, events);
    }
}
