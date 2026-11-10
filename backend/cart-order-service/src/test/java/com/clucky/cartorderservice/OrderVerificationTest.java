package com.clucky.cartorderservice;

import com.clucky.cartorderservice.controller.OrderVerificationController;
import com.clucky.cartorderservice.entity.Order;
import com.clucky.cartorderservice.entity.OrderItem;
import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import com.clucky.cartorderservice.repository.OrderItemRepository;
import com.clucky.cartorderservice.repository.OrderRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OrderVerificationTest {
    private final OrderRepository orders = mock(OrderRepository.class);
    private final OrderItemRepository items = mock(OrderItemRepository.class);
    private final OrderVerificationController controller = new OrderVerificationController(orders, items);

    @BeforeEach
    void authenticate() {
        Jwt jwt = Jwt.withTokenValue("test-token").header("alg", "HS256")
                .subject("7").claim("role", "CUSTOMER").build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void rejectsForgedCustomerAndOrdersNotOwnedByJwtSubject() {
        assertEquals(ErrorCode.FORBIDDEN,
                assertThrows(ApiException.class, () -> controller.verify(10L, 8L)).getCode());
        verifyNoInteractions(orders, items);
        when(orders.findByIdAndCustomerId(10L, 7L)).thenReturn(Optional.empty());
        assertEquals(ErrorCode.RESOURCE_NOT_FOUND,
                assertThrows(ApiException.class, () -> controller.verify(10L, 7L)).getCode());
        verifyNoInteractions(items);
    }

    @Test
    void returnsActualStatusAndOnlyDistinctProductItems() {
        Order order = new Order();
        order.setId(10L);
        order.setCustomerId(7L);
        order.setStoreId(2L);
        order.setOrderCode("ORD-10");
        order.setStatus("PENDING");
        OrderItem product = new OrderItem();
        product.setItemType("PRODUCT");
        product.setProductId(20L);
        OrderItem combo = new OrderItem();
        combo.setItemType("COMBO");
        combo.setComboId(30L);
        when(orders.findByIdAndCustomerId(10L, 7L)).thenReturn(Optional.of(order));
        when(items.findByOrderId(10L)).thenReturn(List.of(product, product, combo));
        var response = controller.verify(10L, 7L);
        assertEquals("PENDING", response.status());
        assertEquals(7L, response.customerId());
        assertEquals(2L, response.storeId());
        assertEquals(List.of(20L), response.productIds());
    }

    @Test
    void storeLookupRejectsCustomersAndUsesJwtStoreForStaff() {
        assertEquals(ErrorCode.FORBIDDEN,
                assertThrows(ApiException.class, () -> controller.getStore(10L)).getCode());
        Jwt jwt = Jwt.withTokenValue("test-token").header("alg", "HS256")
                .subject("9").claim("role", "STAFF").claim("storeId", 2L).build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt,
                List.of(new SimpleGrantedAuthority("ROLE_STAFF"))));
        when(orders.findByIdAndStoreId(10L, 2L)).thenReturn(Optional.empty());
        assertEquals(ErrorCode.RESOURCE_NOT_FOUND,
                assertThrows(ApiException.class, () -> controller.getStore(10L)).getCode());
        Order order = new Order();
        order.setId(10L);
        order.setStoreId(2L);
        when(orders.findByIdAndStoreId(10L, 2L)).thenReturn(Optional.of(order));
        assertEquals(2L, controller.getStore(10L).storeId());
        verify(orders, never()).findById(anyLong());
    }

    @Test
    void storeLookupRejectsStaffAndManagerWithoutStoreId() {
        for (String role : List.of("STAFF", "STORE_MANAGER")) {
            Jwt jwt = Jwt.withTokenValue("test-token").header("alg", "HS256")
                    .subject("9").claim("role", role).build();
            SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt,
                    List.of(new SimpleGrantedAuthority("ROLE_" + role))));
            assertEquals(ErrorCode.FORBIDDEN,
                    assertThrows(ApiException.class, () -> controller.getStore(10L)).getCode());
        }
        verifyNoInteractions(orders);
    }
}
