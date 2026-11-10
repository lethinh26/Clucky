package com.clucky.paymentservice.service;

import com.clucky.paymentservice.dto.BankAccountData.*;
import com.clucky.paymentservice.exception.ApiException;
import com.clucky.paymentservice.exception.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import jakarta.validation.Validation;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.client.RestClient;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BankAccountServiceTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final ObjectMapper mapper = new ObjectMapper();
    private final DiscoveryClient discovery = mock(DiscoveryClient.class);
    private final BankAccountService service = new BankAccountService(jdbc, mapper, discovery, RestClient.builder(), "");
    private final Details request = new Details("Test bank", "TEST", "0012345", "Test holder", true, 0L);

    @AfterEach
    void clearActor() { SecurityContextHolder.clearContext(); }

    @Test
    void nonAdminCannotReadOrMutateBankAccounts() {
        for (String role : List.of("CUSTOMER", "STAFF", "STORE_MANAGER", "SHIPPER")) {
            actor(role);
            assertThrows(AccessDeniedException.class, service::list);
            assertThrows(AccessDeniedException.class, service::banks);
            assertThrows(AccessDeniedException.class, () -> service.save(null, request, UUID.randomUUID()));
            assertThrows(AccessDeniedException.class, () -> service.assign(1, new AssignmentRequest(1L, 0L), UUID.randomUUID()));
        }
        verifyNoInteractions(jdbc, discovery);
    }

    @Test
    void bankDirectoryKeepsOfficialCodeBinAndShortNameWithoutRequiringAKey() throws Exception {
        var response = mapper.readTree("""
                {"data":[{"name":"Ngân hàng TMCP Quân đội","short_name":"MBBank","code":"MB","bin":"970422","supported":true}]}
                """);
        assertEquals(List.of(new Bank("Ngân hàng TMCP Quân đội", "MBBank", "MB", "970422")), BankAccountService.parseBanks(response));
        assertEquals(ErrorCode.UPSTREAM_ERROR, assertThrows(ApiException.class, () -> BankAccountService.parseBanks(null)).getCode());
        assertThrows(ApiException.class, () -> BankAccountService.parseBanks(mapper.readTree("{\"data\":[]}")));
        var entries = (ArrayNode) response.path("data");
        entries.add(entries.get(0).deepCopy());
        assertThrows(ApiException.class, () -> BankAccountService.parseBanks(response));
        entries.remove(1);
        var branch = response.path("data").get(0).deepCopy();
        ((com.fasterxml.jackson.databind.node.ObjectNode) branch).put("code", "OTHER").put("bin", "970455");
        entries.add(branch);
        assertEquals(2, BankAccountService.parseBanks(response).size());
        entries.remove(1);
        ((com.fasterxml.jackson.databind.node.ObjectNode) response.path("data").get(0)).put("bin", "not-a-bin");
        assertThrows(ApiException.class, () -> BankAccountService.parseBanks(response));
    }

    @Test
    void replayReturnsOriginalResultWithoutWritingAgain() throws Exception {
        actor("ADMIN");
        UUID key = UUID.randomUUID();
        Account saved = new Account(9, "Test bank", "TEST", "0012345", "Test holder", true, 0);
        String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(("account:null:" + mapper.writeValueAsString(request)).getBytes(StandardCharsets.UTF_8)));
        when(jdbc.queryForList(anyString(), eq(7L), eq(key))).thenReturn(List.of(Map.of(
                "request_hash", hash, "response", mapper.writeValueAsString(saved))));
        assertEquals(saved, service.save(null, request, key));
        verify(jdbc, never()).update(anyString(), any(Object[].class));
        verifyNoInteractions(discovery);
    }

    @Test
    void reusedKeyWithDifferentPayloadConflicts() {
        actor("ADMIN");
        UUID key = UUID.randomUUID();
        when(jdbc.queryForList(anyString(), eq(7L), eq(key))).thenReturn(List.of(Map.of("request_hash", "different")));
        ApiException failure = assertThrows(ApiException.class, () -> service.save(null, request, key));
        assertEquals(ErrorCode.RESOURCE_CONFLICT, failure.getCode());
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void validatesAccountNumberAndVersionWithoutRemovingLeadingZeros() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertTrue(validator.validate(request).isEmpty());
            assertEquals("0012345", request.accountNo());
            assertFalse(validator.validate(new Details(" ", "?", "1e3", " ", null, -1L)).isEmpty());
            assertFalse(validator.validate(new AssignmentRequest(-1L, -1L)).isEmpty());
            assertTrue(validator.validate(new AssignmentRequest(null, 0L)).isEmpty());
        }
    }

    private void actor(String role) {
        Jwt jwt = Jwt.withTokenValue("test-token").header("alg", "HS256").subject("7")
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60))
                .claim("role", role).claim("storeId", 1).claim("sid", "test-session").build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt,
                List.of(new SimpleGrantedAuthority("ROLE_" + role))));
    }
}
