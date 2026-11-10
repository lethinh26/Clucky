package com.clucky.cartorderservice.service;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class ShippingClientTest {
    @Test
    void pickupDoesNotCallShippingAndDeliverySendsCoordinatesInsteadOfClientDistance() {
        var builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var client = new ShippingClient(builder.build(), "http://shipping-service");
        assertEquals(BigDecimal.ZERO, client.calculateShippingFee("PICKUP", 1L, null, null).fee());
        server.verify();
        server.expect(requestTo("http://shipping-service/api/shipping/calculate-fee"))
                .andExpect(content().json("{\"storeId\":1,\"latitude\":0,\"longitude\":0.01}"))
                .andRespond(withSuccess("{\"available\":false,\"fee\":20000,\"reason\":\"OUT_OF_RANGE\",\"distanceKm\":6,\"radiusKm\":5,\"policyVersion\":1}", org.springframework.http.MediaType.APPLICATION_JSON));
        var quote = client.calculateShippingFee("DELIVERY", 1L, 0.0, 0.01);
        assertFalse(quote.available());
        assertEquals("OUT_OF_RANGE", quote.reason());
        server.verify();
    }
}
