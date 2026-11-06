package com.clucky.promotionloyaltyservice.service;

import com.clucky.promotionloyaltyservice.config.CurrentActor;
import com.clucky.promotionloyaltyservice.controller.LoyaltyController;
import com.clucky.promotionloyaltyservice.dto.*;
import com.clucky.promotionloyaltyservice.entity.*;
import com.clucky.promotionloyaltyservice.exception.ApiException;
import com.clucky.promotionloyaltyservice.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LoyaltySafetyTest {
    private final MemberPointsRepository members = mock(MemberPointsRepository.class);
    private final PointTransactionRepository ledger = mock(PointTransactionRepository.class);
    private final LoyaltyConfigRepository configs = mock(LoyaltyConfigRepository.class);
    private final LoyaltyService service = new LoyaltyService(members, ledger, configs);

    @AfterEach
    void clearActor() { SecurityContextHolder.clearContext(); }

    private MemberPoints member(int balance) {
        var member = new MemberPoints();
        member.setCustomerId(7L);
        member.setTotalPoints(balance);
        member.setTier("SILVER");
        when(members.findByCustomerIdForUpdate(7L)).thenReturn(Optional.of(member));
        when(members.findByCustomerId(7L)).thenReturn(Optional.of(member));
        return member;
    }

    @Test
    void internalMutationsRejectAnonymousAndEveryBusinessRole() {
        var controller = new LoyaltyController(service);
        var request = new EarnPointsRequest(7L, 1L, BigDecimal.TEN, null, null, null);
        assertThrows(RuntimeException.class, () -> controller.earnPoints(request));
        for (String role : List.of("CUSTOMER", "STAFF", "STORE_MANAGER", "ADMIN", "SHIPPER")) {
            var token = Jwt.withTokenValue("test").header("alg", "HS256").subject("7").claim("role", role).build();
            SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(token, List.of()));
            assertThrows(ApiException.class, () -> controller.earnPoints(request));
        }
        verifyNoInteractions(members, ledger);
    }

    @Test
    void orderReplayIsLockedAndCannotBeReissuedUnderAnotherKey() {
        var member = member(200);
        var existing = new PointTransaction();
        existing.setCustomerId(7L);
        existing.setChange(10);
        existing.setBalanceAfter(200);
        when(ledger.findByOperationKey("EARN:cus:7:order:1")).thenReturn(Optional.of(existing));
        var result = service.earnPoints(new EarnPointsRequest(7L, 1L, BigDecimal.TEN, 10, "new-key", null));
        assertEquals(200, result.balanceAfter());
        var ordered = inOrder(members, ledger);
        ordered.verify(members).initCustomerPoints(7L);
        ordered.verify(members).findByCustomerIdForUpdate(7L);
        ordered.verify(ledger).findByOperationKey("EARN:cus:7:order:1");
        verify(members, never()).save(any());
        assertEquals("SILVER", member.getTier());
    }

    @Test
    void releaseCannotMintPointsAndReadsLedgerOnlyAfterLocking() {
        member(200);
        assertNull(service.releasePoints(new LoyaltyReleaseRequest(7L, 40, 1L, "release", null)));
        var ordered = inOrder(members, ledger);
        ordered.verify(members).initCustomerPoints(7L);
        ordered.verify(members).findByCustomerIdForUpdate(7L);
        ordered.verify(ledger).findByOperationKey(anyString());
        ordered.verify(ledger).findByCustomerIdAndOrderIdAndType(7L, 1L, "REDEEM");
        verify(members, never()).save(any());
        assertThrows(ApiException.class, () -> service.releasePoints(new LoyaltyReleaseRequest(7L, 40, null, "release", null)));
    }

    @Test
    void previewIsOwnerScopedAndCannotDiscountMoreThanTheOrder() {
        member(200);
        assertThrows(ApiException.class, () -> service.previewLoyalty(new LoyaltyPreviewRequest(100, BigDecimal.TEN, 8L), 7L));
        var preview = service.previewLoyalty(new LoyaltyPreviewRequest(100, new BigDecimal("2500")), 7L);
        assertEquals(2, preview.pointsUsed());
        assertEquals(new BigDecimal("2000"), preview.pointsAmount());
        verify(members, never()).save(any());
    }

    @Test
    void overflowDoesNotWrapTheBalance() {
        var member = member(Integer.MAX_VALUE);
        assertThrows(ArithmeticException.class, () -> service.earnPoints(new EarnPointsRequest(7L, 1L, null, 1, null, null)));
        assertEquals(Integer.MAX_VALUE, member.getTotalPoints());
        verify(members, never()).save(any());
    }
}
