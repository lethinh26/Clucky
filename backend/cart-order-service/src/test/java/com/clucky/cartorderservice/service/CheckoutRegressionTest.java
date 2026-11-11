package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.cart.CartDto;
import com.clucky.cartorderservice.cart.CartItemDto;
import com.clucky.cartorderservice.cart.CartService;
import com.clucky.cartorderservice.config.AccessGuard;
import com.clucky.cartorderservice.dto.CreateOrderRequest;
import com.clucky.cartorderservice.dto.DomainEvent;
import com.clucky.cartorderservice.entity.OutboxEvent;
import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import com.clucky.cartorderservice.mapper.EventMapper;
import com.clucky.cartorderservice.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.clients.producer.RecordMetadata;
import org.apache.kafka.common.TopicPartition;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class CheckoutRegressionTest {
    @Test
    void checkoutTracksReservationBeforeCallingPromotionWithExactVoucherDiscount() {
        var orders = mock(OrderRepository.class);
        var carts = mock(CartService.class);
        var catalog = mock(CatalogClient.class);
        var promotion = mock(PromotionClient.class);
        var shipping = mock(ShippingClient.class);
        var loyalty = mock(LoyaltyClient.class);
        var recovery = mock(VoucherCheckoutRecovery.class);
        var profiles = mock(CustomerProfileClient.class);
        var item = new CartItemDto(1L, null, "Chicken", 1, BigDecimal.valueOf(100), List.of(), List.of(), null, 1L);
        when(carts.getCart(anyString())).thenReturn(CartDto.of(List.of(item)));
        when(catalog.validateItems(anyLong(), anyList())).thenReturn(new CatalogClient.CatalogValidationResponse(true, true, null,
                BigDecimal.valueOf(100), List.of()));
        when(shipping.calculateShippingFee(anyString(), anyLong(), any(), any())).thenReturn(
                new ShippingClient.ShippingFeeResult(true, BigDecimal.ZERO, "PICKUP", null, null, null));
        when(promotion.validateVoucher(anyString(), anyLong(), any())).thenReturn(new PromotionClient.VoucherResult(true, null, BigDecimal.TEN));
        when(loyalty.preview(any(), any())).thenReturn(new LoyaltyClient.Quote(1, 0, 0, BigDecimal.ZERO, 0, "MEMBER", BigDecimal.valueOf(5)));
        when(orders.save(any())).thenAnswer(call -> {
            com.clucky.cartorderservice.entity.Order order = call.getArgument(0); order.setId(8L); return order;
        });
        doThrow(new ApiException(ErrorCode.RESOURCE_CONFLICT)).when(loyalty).reserveVoucher(8, 1, 1, "SAVE", BigDecimal.valueOf(100), BigDecimal.TEN);
        var service = new OrderService(orders, mock(OrderItemRepository.class), mock(OrderStatusHistoryRepository.class), carts,
                new AccessGuard(), new ObjectMapper(), mock(OrderEventPublisher.class), catalog, promotion, shipping, loyalty, recovery, profiles);
        var jwt = Jwt.withTokenValue("test").header("alg", "HS256").subject("1").claim("role", "CUSTOMER").build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt, List.of()));
        try {
            var request = new CreateOrderRequest(1L, "PICKUP", "Customer", "0900000000", null, null, "BANK_TRANSFER", "SAVE", 0, null, null, null, null, null);
            assertEquals(ErrorCode.RESOURCE_CONFLICT, assertThrows(ApiException.class, () -> service.createOrder(request)).getCode());
            var sequence = inOrder(recovery, loyalty);
            sequence.verify(loyalty).preview(0, BigDecimal.valueOf(90));
            sequence.verify(recovery).lock(8);
            sequence.verify(recovery).track(8);
            sequence.verify(loyalty).reserveVoucher(8, 1, 1, "SAVE", BigDecimal.valueOf(100), BigDecimal.TEN);
            verify(carts, never()).clearCart(anyString());
            verify(loyalty, never()).reserve(anyLong(), anyLong(), any(), any());
        } finally { SecurityContextHolder.clearContext(); }
    }
    @Test
    void guestCheckoutCannotRedeemPointsWithoutAnAuthenticatedOwner() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        var client = new LoyaltyClient(RestClient.builder().build(), "http://promotion", mock(InternalServiceCredential.class));
        assertEquals(ErrorCode.UNAUTHENTICATED,
                assertThrows(ApiException.class, () -> client.preview(100, new BigDecimal("200000"))).getCode());
        assertEquals(0, client.preview(0, new BigDecimal("200000")).pointsUsed());
    }
    @Test
    void voucherUsesOrderAmountAndDoesNotHideDependencyFailures() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        PromotionClient client = new PromotionClient(builder.build(), "http://promotion");
        server.expect(requestTo("http://promotion/api/promotions/vouchers/validate"))
                .andExpect(content().json("{\"code\":\"SAVE\",\"storeId\":1,\"orderAmount\":100000}", true))
                .andRespond(withSuccess("{\"valid\":true,\"discountAmount\":20000}", MediaType.APPLICATION_JSON));
        assertEquals(new BigDecimal("20000"), client.validateVoucher("save", 1L, new BigDecimal("100000")).discountAmount());
        server.verify();
        server.reset();
        server.expect(anything()).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
        assertEquals(ErrorCode.DEPENDENCY_UNAVAILABLE,
                assertThrows(ApiException.class, () -> client.validateVoucher("save", 1L, BigDecimal.TEN)).getCode());
        server.verify();
        server.reset();
        server.expect(anything()).andRespond(withSuccess("{\"valid\":false,\"discountAmount\":0,\"reason\":\"Expired\"}", MediaType.APPLICATION_JSON));
        assertFalse(client.validateVoucher("save", 1L, BigDecimal.TEN).valid());
        server.verify();
    }

    @Test
    void catalogUsesServiceCredentialAndRejectsIncompleteSnapshots() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        InternalServiceCredential credential = mock(InternalServiceCredential.class);
        when(credential.token()).thenReturn("test-service-token");
        CatalogClient client = new CatalogClient(builder.build(), "http://catalog", credential);
        CartItemDto item = new CartItemDto(1L, null, "Client name", 1, BigDecimal.ONE, List.of(11L), List.of(22L), null, 1L);
        server.expect(requestTo("http://catalog/api/catalog/internal/validate-items"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer test-service-token"))
                .andExpect(jsonPath("$.items[0].optionIds[0]").value(11))
                .andExpect(jsonPath("$.items[0].toppingIds[0]").value(22))
                .andRespond(withSuccess("{\"valid\":true,\"subtotal\":100,\"items\":[]}", MediaType.APPLICATION_JSON));
        assertEquals(ErrorCode.UPSTREAM_ERROR, assertThrows(ApiException.class, () -> client.validateItems(1L, List.of(item))).getCode());
        server.verify();
        CatalogClient missingCredential = new CatalogClient(builder.build(), "http://catalog", mock(InternalServiceCredential.class));
        assertEquals(ErrorCode.DEPENDENCY_UNAVAILABLE,
                assertThrows(ApiException.class, () -> missingCredential.validateItems(1L, List.of(item))).getCode());
    }

    @Test
    void rejectedVoucherDoesNotSaveOrderOrClearCart() {
        OrderRepository orders = mock(OrderRepository.class);
        CartService carts = mock(CartService.class);
        CatalogClient catalog = mock(CatalogClient.class);
        PromotionClient promotion = mock(PromotionClient.class);
        ShippingClient shipping = mock(ShippingClient.class);
        CartItemDto item = new CartItemDto(1L, null, "Chicken", 1, BigDecimal.TEN, List.of(), List.of(), null, 1L);
        when(carts.getCart(anyString())).thenReturn(CartDto.of(List.of(item)));
        when(catalog.validateItems(anyLong(), anyList())).thenReturn(
                new CatalogClient.CatalogValidationResponse(true, true, null, BigDecimal.TEN, List.of()));
        when(shipping.calculateShippingFee(anyString(), anyLong(), any(), any()))
                .thenReturn(new ShippingClient.ShippingFeeResult(true, BigDecimal.ZERO, "PICKUP", null, null, null));
        when(promotion.validateVoucher(anyString(), anyLong(), any()))
                .thenReturn(new PromotionClient.VoucherResult(false, "Expired", BigDecimal.ZERO));
        OrderService service = new OrderService(orders, mock(OrderItemRepository.class), mock(OrderStatusHistoryRepository.class),
                carts, mock(AccessGuard.class), new ObjectMapper(), mock(OrderEventPublisher.class), catalog, promotion, shipping, mock(LoyaltyClient.class),
                mock(VoucherCheckoutRecovery.class), mock(CustomerProfileClient.class));
        Jwt jwt = Jwt.withTokenValue("test").header("alg", "HS256").subject("1").claim("role", "CUSTOMER").build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt, List.of()));
        try {
            CreateOrderRequest request = new CreateOrderRequest(1L, "PICKUP", "Customer", "0900000000", null, null, "COD", "SAVE", 0, null, null, null, null, null);
            assertEquals(ErrorCode.VOUCHER_INACTIVE, assertThrows(ApiException.class, () -> service.createOrder(request)).getCode());
            verifyNoInteractions(orders);
            verify(carts, never()).clearCart(anyString());
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    @SuppressWarnings("unchecked")
    void afterCommitAndPollingBothOpenNewTransactionsAndReuseEventIdentity() {
        OutboxEventRepository repository = mock(OutboxEventRepository.class);
        KafkaTemplate<String, String> kafka = mock(KafkaTemplate.class);
        EventMapper mapper = mock(EventMapper.class);
        PlatformTransactionManager manager = mock(PlatformTransactionManager.class);
        when(manager.getTransaction(any())).thenAnswer(invocation -> {
            TransactionDefinition definition = invocation.getArgument(0);
            assertEquals(TransactionDefinition.PROPAGATION_REQUIRES_NEW, definition.getPropagationBehavior());
            return new SimpleTransactionStatus();
        });
        OutboxEvent outbox = new OutboxEvent("event-1", "Order", "CLU-1", "order.created", "order.created", "{}");
        outbox.setId(1L);
        when(repository.findById(1L)).thenReturn(Optional.of(outbox));
        when(repository.findTop50ByStatusOrderByCreatedAtAsc("PENDING")).thenReturn(List.of(outbox));
        DomainEvent event = mock(DomainEvent.class);
        ProducerRecord<String, String> record = new ProducerRecord<>("order.created", "CLU-1", "{}");
        when(mapper.fromJson("{}", "order.created")).thenReturn(event);
        when(mapper.toRecord(event, "CLU-1")).thenReturn(record);
        when(kafka.send(record)).thenReturn(CompletableFuture.failedFuture(new IllegalStateException("offline")),
                CompletableFuture.completedFuture(new SendResult<>(record,
                        new RecordMetadata(new TopicPartition("order.created", 0), 0, 0, 0, 0, 0))));
        OutboxProcessor processor = new OutboxProcessor(repository, kafka, mapper, manager);
        processor.onOrderEventCreated(new OrderEventPublisher.OutboxEventCreatedEvent(1L, "order.created", "CLU-1"));
        assertEquals("PENDING", outbox.getStatus());
        assertEquals(1, outbox.getRetryCount());
        processor.pollPendingOutboxEvents();
        assertEquals("PROCESSED", outbox.getStatus());
        assertEquals("event-1", outbox.getEventId());
        verify(manager, times(2)).commit(any());
        verify(repository, times(2)).save(outbox);
    }
}
