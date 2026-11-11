package com.clucky.promotionloyaltyservice.service;

import com.clucky.promotionloyaltyservice.controller.LoyaltyController;
import com.clucky.promotionloyaltyservice.dto.LoyaltyData.*;
import com.clucky.promotionloyaltyservice.exception.BadRequestException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import java.math.BigDecimal;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LoyaltySafetyTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final LoyaltyService service = new LoyaltyService(jdbc, mock(VoucherAuditOutbox.class));

    @AfterEach
    void clearActor() { SecurityContextHolder.clearContext(); }

    @Test
    void overviewUsesAuthenticatedOwnerAndRejectsAnonymous() {
        var loyalty = mock(LoyaltyService.class);
        var controller = new LoyaltyController(loyalty);
        assertThrows(RuntimeException.class, () -> controller.me(0, 10, "ALL"));
        var token = Jwt.withTokenValue("test").header("alg", "HS256").subject("7").claim("role", "CUSTOMER").build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(token, List.of()));
        controller.me(0, 10, "EARN");
        verify(loyalty).overview(7L, 0, 10, "EARN");
    }

    @Test
    void historyRejectsUnboundedAndUnknownFiltersBeforeQuerying() {
        assertThrows(BadRequestException.class, () -> service.overview(7, -1, 10, "ALL"));
        assertThrows(BadRequestException.class, () -> service.overview(7, 0, 51, "ALL"));
        assertThrows(BadRequestException.class, () -> service.overview(7, 0, 10, "UNKNOWN"));
        verifyNoInteractions(jdbc);
    }

    @Test
    void previewCannotDiscountMoreThanTheOrderAndDoesNotWrite() {
        var policy = new Policy(1, 10000, 1000, 1000, 5000, 3, 5);
        when(jdbc.query(anyString(), org.mockito.ArgumentMatchers.<RowMapper<Policy>>any())).thenReturn(List.of(policy));
        when(jdbc.query(anyString(), org.mockito.ArgumentMatchers.<RowMapper<Balance>>any(), eq(7L)))
                .thenReturn(List.of(new Balance(7, 200, 0, 200, 200, "MEMBER")));
        var quote = service.preview(new PreviewInput(7L, 100, new BigDecimal("2500")));
        assertEquals(2, quote.pointsUsed());
        assertEquals(0, new BigDecimal("2000").compareTo(quote.pointsAmount()));
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }
}
