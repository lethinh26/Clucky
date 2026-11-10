package com.clucky.shippingservice.controller;

import com.clucky.shippingservice.config.SecurityConfig;
import com.clucky.shippingservice.config.AccessGuard;
import com.clucky.shippingservice.entity.Shipment;
import com.clucky.shippingservice.repository.ShipmentRepository;
import com.clucky.shippingservice.service.ShipmentServiceTemplate;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestClient;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {ShippingController.class, ShipmentControllerTemplate.class}, properties = {
        "spring.config.name=shipping-security-test", "spring.cloud.config.enabled=false", "eureka.client.enabled=false",
        "clucky.security.jwt.issuer=test", "clucky.security.jwt.audience=test"
})
@Import({SecurityConfig.class, ShippingSecurityTest.ClientConfig.class, ShipmentServiceTemplate.class, AccessGuard.class})
class ShippingSecurityTest {
    @Autowired MockMvc mvc;
    @MockitoBean JwtDecoder decoder;
    @MockitoBean JdbcTemplate jdbc;
    @MockitoBean DiscoveryClient discovery;
    @MockitoBean ShipmentRepository shipments;
    @TestConfiguration static class ClientConfig {
        @Bean RestClient.Builder builder() { return RestClient.builder(); }
    }

    @Test
    void onlyAdminCanAccessOrChangeChainFee() throws Exception {
        mvc.perform(get("/api/shipping/config")).andExpect(status().isUnauthorized());
        for (String role : new String[]{"CUSTOMER", "STAFF", "STORE_MANAGER"}) {
            when(decoder.decode(role)).thenReturn(Jwt.withTokenValue(role).header("alg", "HS256").subject("1").claim("role", role).build());
            mvc.perform(get("/api/shipping/config").header("Authorization", "Bearer " + role)).andExpect(status().isForbidden());
            mvc.perform(put("/api/shipping/config").header("Authorization", "Bearer " + role)
                    .contentType("application/json").content("{\"fee\":20000,\"version\":0}"))
                    .andExpect(status().isForbidden());
        }
        verifyNoInteractions(jdbc);
    }

    @Test
    void shipmentLookupUsesOrderIdAndEnforcesOwnerOrStore() throws Exception {
        Shipment shipment = new Shipment();
        shipment.setId(700L);
        shipment.setOrderId(12L);
        shipment.setCustomerId(20L);
        shipment.setStoreId(2L);
        shipment.setCustomerName("Fixture Customer");
        when(shipments.findByOrderId(12L)).thenReturn(Optional.of(shipment));
        mvc.perform(get("/api/shipping/shipments/12")).andExpect(status().isUnauthorized());
        token("owner", "CUSTOMER", 20, null);
        token("other-customer", "CUSTOMER", 21, null);
        token("staff", "STAFF", 30, 2L);
        token("manager", "STORE_MANAGER", 31, 2L);
        token("other-store", "STAFF", 32, 3L);
        token("no-store", "STAFF", 33, null);
        token("admin", "ADMIN", 1, null);
        for (String token : new String[]{"owner", "staff", "manager", "admin"}) {
            mvc.perform(get("/api/shipping/shipments/12").header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(700))
                    .andExpect(jsonPath("$.orderId").value(12)).andExpect(jsonPath("$.status").value("CREATED"));
        }
        for (String token : new String[]{"other-customer", "other-store", "no-store"}) {
            mvc.perform(get("/api/shipping/shipments/12").header("Authorization", "Bearer " + token))
                    .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"))
                    .andExpect(jsonPath("$.customerName").doesNotExist());
        }
        shipment.setCustomerId(null);
        mvc.perform(get("/api/shipping/shipments/12").header("Authorization", "Bearer owner"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/shipping/shipments/12").header("Authorization", "Bearer admin"))
                .andExpect(status().isOk());
        verify(shipments, never()).findById(anyLong());
    }

    @Test
    void missingShipmentAndInvalidOrderIdHaveDocumentedErrors() throws Exception {
        token("owner", "CUSTOMER", 20, null);
        when(shipments.findByOrderId(13L)).thenReturn(Optional.empty());
        mvc.perform(get("/api/shipping/shipments/13").header("Authorization", "Bearer owner"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
        mvc.perform(get("/api/shipping/shipments/0").header("Authorization", "Bearer owner"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        verify(shipments, never()).findByOrderId(0L);
    }

    private void token(String value, String role, long userId, Long storeId) {
        Jwt.Builder builder = Jwt.withTokenValue(value).header("alg", "HS256").subject(Long.toString(userId)).claim("role", role);
        if (storeId != null) builder.claim("storeId", storeId);
        when(decoder.decode(value)).thenReturn(builder.build());
    }
}
