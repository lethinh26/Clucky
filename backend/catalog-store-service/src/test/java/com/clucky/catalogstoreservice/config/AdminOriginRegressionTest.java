package com.clucky.catalogstoreservice.config;

import com.clucky.catalogstoreservice.controller.StoreController;
import com.clucky.catalogstoreservice.service.BranchProvisioning;
import com.clucky.catalogstoreservice.service.StoreService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = StoreController.class, properties = {
        "spring.config.name=admin-origin-test", "spring.cloud.config.enabled=false", "eureka.client.enabled=false",
        "clucky.security.jwt.issuer=test", "clucky.security.jwt.audience=test"
})
@Import(SecurityConfig.class)
class AdminOriginRegressionTest {
    @Autowired MockMvc mvc;
    @MockitoBean JwtDecoder decoder;
    @MockitoBean StoreService stores;
    @MockitoBean BranchProvisioning branches;
    @MockitoBean AccessGuard access;

    @Test
    void forwardedAdminOriginDoesNotGetRejectedOrDuplicateGatewayCorsHeaders() throws Exception {
        when(decoder.decode("admin")).thenReturn(token("ADMIN"));
        mvc.perform(get("/api/stores").header(HttpHeaders.ORIGIN, "http://localhost:3001")
                .header(HttpHeaders.AUTHORIZATION, "Bearer admin"))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
        verify(stores).getAllStores(false);
    }

    @Test
    void adminOriginDoesNotGrantAdminPermissions() throws Exception {
        mvc.perform(post("/api/stores/1/accounts-retry").header(HttpHeaders.ORIGIN, "http://localhost:3001"))
                .andExpect(status().isUnauthorized());
        for (String role : new String[]{"CUSTOMER", "STAFF", "STORE_MANAGER"}) {
            when(decoder.decode(role)).thenReturn(token(role));
            mvc.perform(post("/api/stores/1/accounts-retry").header(HttpHeaders.ORIGIN, "http://localhost:3001")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + role)).andExpect(status().isForbidden());
        }
        verifyNoInteractions(branches);
    }

    private Jwt token(String role) {
        return Jwt.withTokenValue(role).header("alg", "HS256").subject("1").claim("role", role).build();
    }

    @Test
    void deliveryRadiusRequiresAdminOrScopedManager() throws Exception {
        for (String role : new String[]{"CUSTOMER", "STAFF"}) {
            when(decoder.decode(role)).thenReturn(token(role));
            mvc.perform(put("/api/stores/1/delivery-settings").header(HttpHeaders.AUTHORIZATION, "Bearer " + role)
                    .contentType("application/json").content("{\"radiusKm\":5,\"version\":0}"))
                    .andExpect(status().isForbidden());
        }
        when(decoder.decode("STORE_MANAGER")).thenReturn(token("STORE_MANAGER"));
        doThrow(new org.springframework.security.access.AccessDeniedException("scope")).when(access).requireStore(2L);
        mvc.perform(put("/api/stores/2/delivery-settings").header(HttpHeaders.AUTHORIZATION, "Bearer STORE_MANAGER")
                .contentType("application/json").content("{\"radiusKm\":5,\"version\":0}"))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/stores/1/delivery-settings").header(HttpHeaders.AUTHORIZATION, "Bearer STORE_MANAGER")
                .contentType("application/json").content("{\"radiusKm\":5,\"version\":0}"))
                .andExpect(status().isOk());
        verify(access).requireStore(1L);
    }
}
