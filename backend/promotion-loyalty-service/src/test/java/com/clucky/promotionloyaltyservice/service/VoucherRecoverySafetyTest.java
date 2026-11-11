package com.clucky.promotionloyaltyservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validator;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class VoucherRecoverySafetyTest {
    @Test
    void transport404CannotReleaseAReservationButAuthoritativeMissingCan() {
        var loyalty = mock(LoyaltyService.class);
        var vouchers = mock(VoucherReservationService.class);
        when(loyalty.pending()).thenReturn(List.of(new LoyaltyService.PendingOrder(8, 7)));
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://orders/internal/loyalty/orders/8"))
                .andExpect(header("Authorization", "Bearer test-service-token")).andRespond(withStatus(HttpStatus.NOT_FOUND));
        server.expect(requestTo("http://orders/internal/loyalty/orders/8"))
                .andExpect(header("Authorization", "Bearer test-service-token")).andRespond(withSuccess(
                "{\"orderId\":8,\"customerId\":null,\"status\":\"MISSING\"}", MediaType.APPLICATION_JSON));
        var credential = mock(InternalServiceCredential.class);
        when(credential.token()).thenReturn("test-service-token");
        var events = new LoyaltyEvents(loyalty, vouchers, new ObjectMapper(), mock(Validator.class), builder, "http://orders", credential);
        events.reconcile();
        verifyNoInteractions(vouchers);
        events.reconcile();
        verify(vouchers).settle(8, 7, "MISSING", null, null);
        verify(loyalty).settle(8, 7, "MISSING", null, null);
        server.verify();
    }
}
