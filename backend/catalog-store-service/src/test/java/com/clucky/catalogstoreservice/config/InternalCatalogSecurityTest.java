package com.clucky.catalogstoreservice.config;

import com.clucky.catalogstoreservice.controller.InternalCatalogController;
import com.clucky.catalogstoreservice.dto.ValidationDto;
import com.clucky.catalogstoreservice.service.ValidationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = InternalCatalogController.class, properties = {
        "spring.config.name=internal-catalog-test",
        "spring.cloud.config.enabled=false", "eureka.client.enabled=false",
        "clucky.security.jwt.issuer=test", "clucky.security.jwt.audience=test"
})
@Import(SecurityConfig.class)
class InternalCatalogSecurityTest {
    @Autowired MockMvc mvc;
    @MockitoBean JwtDecoder decoder;
    @MockitoBean ValidationService validation;

    @Test
    void onlyInternalServiceOrAdminCanValidateItems() throws Exception {
        String path = "/api/catalog/internal/validate-items";
        String body = "{\"storeId\":1,\"items\":[{\"productId\":1,\"quantity\":1}]}";
        mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized());
        when(decoder.decode("customer")).thenReturn(token("CUSTOMER"));
        mvc.perform(post(path).header("Authorization", "Bearer customer")
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        verifyNoInteractions(validation);
        when(validation.validateOrderItems(any())).thenReturn(new ValidationDto.Response());
        for (String role : new String[]{"INTERNAL_SERVICE", "ADMIN"}) {
            when(decoder.decode(role)).thenReturn(token(role));
            mvc.perform(post(path).header("Authorization", "Bearer " + role)
                    .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
        }
        verify(validation, times(2)).validateOrderItems(any());
    }

    private Jwt token(String role) {
        return Jwt.withTokenValue(role).header("alg", "HS256").subject("1").claim("role", role).build();
    }
}
