package com.clucky.cartorderservice.service;

import com.clucky.cartorderservice.config.JwtSettings;
import com.clucky.cartorderservice.entity.Order;
import com.clucky.cartorderservice.entity.OutboxEvent;
import com.clucky.cartorderservice.entity.RefundRequest;
import com.clucky.cartorderservice.exception.ApiException;
import com.clucky.cartorderservice.exception.ErrorCode;
import com.clucky.cartorderservice.repository.OutboxEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.http.client.MockClientHttpResponse;
import org.springframework.web.client.RestClient;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RefundRecipientSafetyTest {
    @Test
    void profileLookupSignsCustomerIdentityAndRejectsUnverifiedOrDifferentOwners() {
        for (String body : new String[]{
                "{\"userId\":8,\"role\":\"CUSTOMER\",\"email\":\"other@example.com\",\"emailVerified\":true}",
                "{\"userId\":7,\"role\":\"CUSTOMER\",\"email\":\"customer@example.com\",\"emailVerified\":false}"}) {
            var client = RestClient.builder().requestInterceptor((request, bytes, execution) -> {
                assertEquals("/api/auth/internal/customers/7/notification-contact", request.getURI().getPath());
                assertNotNull(request.getHeaders().getFirst("X-Contact-Time"));
                assertTrue(request.getHeaders().getFirst("X-Contact-Signature").matches("[a-f0-9]{64}"));
                var response = new MockClientHttpResponse(body.getBytes(StandardCharsets.UTF_8), HttpStatus.OK);
                response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
                return response;
            }).build();
            var profiles = new CustomerProfileClient(client, "http://identity", new JwtSettings("test-key-".repeat(4), "test", "test"));
            assertEquals(ErrorCode.UPSTREAM_ERROR, assertThrows(ApiException.class, () -> profiles.verifiedContact(7L)).getCode());
        }
    }

    @Test
    void eventUsesVerifiedStoredRecipientAndOtherwiseRemainsDurable() throws Exception {
        var repository = mock(OutboxEventRepository.class);
        when(repository.save(any())).thenAnswer(call -> call.getArgument(0));
        var applicationEvents = mock(ApplicationEventPublisher.class);
        var mapper = new ObjectMapper().findAndRegisterModules();
        var publisher = new OrderEventPublisher(repository, applicationEvents, mapper, mock(JdbcTemplate.class));
        var order = new Order(); order.setId(1L); order.setCustomerId(7L); order.setStoreId(2L); order.setOrderCode("CLU-1");
        order.setCustomerEmail("customer@example.com"); order.setCustomerEmailVerified(true);
        var refund = new RefundRequest(); refund.setId(3L); refund.setOrderId(1L); refund.setCustomerId(7L);
        refund.setAmount(BigDecimal.valueOf(100)); refund.setStatus("APPROVED");
        publisher.publishRefundEvent("refund.approved", refund, order, null);
        var capture = ArgumentCaptor.forClass(OutboxEvent.class);
        verify(repository).save(capture.capture());
        var recipient = mapper.readTree(capture.getValue().getPayload()).path("payload").path("recipient");
        assertEquals(7, recipient.path("userId").asLong()); assertEquals("CUSTOMER", recipient.path("role").asText());
        assertEquals("customer@example.com", recipient.path("email").asText()); assertTrue(recipient.path("emailVerified").asBoolean());
        clearInvocations(repository, applicationEvents);
        order.setCustomerEmailVerified(false);
        publisher.publishRefundEvent("refund.approved", refund, order, null);
        verify(repository, times(2)).save(capture.capture());
        assertEquals("WAITING_RECIPIENT", capture.getValue().getStatus());
        verifyNoInteractions(applicationEvents);
    }
}
