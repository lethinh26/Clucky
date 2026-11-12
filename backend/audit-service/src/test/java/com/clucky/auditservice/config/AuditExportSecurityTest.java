package com.clucky.auditservice.config;

import com.clucky.auditservice.controller.AuditLogController;
import com.clucky.auditservice.service.AuditLogService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = AuditLogController.class, properties = {
        "spring.config.name=audit-export-test",
        "spring.cloud.config.enabled=false", "eureka.client.enabled=false",
        "clucky.security.jwt.issuer=test", "clucky.security.jwt.audience=test"
})
@Import(SecurityConfig.class)
class AuditExportSecurityTest {
    @Autowired MockMvc mvc;
    @MockitoBean JwtDecoder decoder;
    @MockitoBean AuditLogService service;

    @Test
    void onlyAuthenticatedAdminCanDownloadTheAuditExport() throws Exception {
        String path = "/api/audit-logs/export";
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        for (String role : List.of("STORE_MANAGER", "STAFF", "CUSTOMER", "SHIPPER", "INTERNAL_SERVICE")) {
            when(decoder.decode(role)).thenReturn(token(role));
            mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, "Bearer " + role))
                    .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }
        verifyNoInteractions(service);

        when(decoder.decode("ADMIN")).thenReturn(token("ADMIN"));
        byte[] xlsx = {80, 75, 3, 4};
        when(service.export(any())).thenReturn(xlsx);
        mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, "Bearer ADMIN"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"clucky-nhat-ky-quan-tri.xlsx\""))
                .andExpect(content().bytes(xlsx));
        mvc.perform(post(path).header(HttpHeaders.AUTHORIZATION, "Bearer ADMIN")).andExpect(status().isForbidden());
        mvc.perform(get("/api/audit-logs/unknown").header(HttpHeaders.AUTHORIZATION, "Bearer ADMIN"))
                .andExpect(status().isForbidden());
        verify(service, times(1)).export(any());
    }

    private Jwt token(String role) {
        return Jwt.withTokenValue(role).header("alg", "HS256").subject("1").claim("role", role).build();
    }
}
