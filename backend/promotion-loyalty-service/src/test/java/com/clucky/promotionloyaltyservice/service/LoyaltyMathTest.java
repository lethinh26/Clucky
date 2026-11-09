package com.clucky.promotionloyaltyservice.service;

import com.clucky.promotionloyaltyservice.dto.LoyaltyData.Policy;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class LoyaltyMathTest {
    private final Policy policy = new Policy(1, 10000, 1000, 1000, 5000, 3, 5);
    @Test void tiersUseLifetimeAndDiscountPrecedesRedemption() {
        assertEquals("MEMBER", LoyaltyMath.tier(999, policy));
        assertEquals("SILVER", LoyaltyMath.tier(1000, policy));
        assertEquals("GOLD", LoyaltyMath.tier(5000, policy));
        var quote = LoyaltyMath.quote(100, 1000, 50, new BigDecimal("250000"), policy);
        assertEquals(new BigDecimal("7500"), quote.tierDiscount());
        assertEquals(new BigDecimal("50000"), quote.pointsAmount());
        assertEquals(19, quote.pointsToEarn());
    }
    @Test void redemptionCannotExceedAvailableBalanceOrFoodAmount() {
        assertEquals(9, LoyaltyMath.quote(100, 0, 100, new BigDecimal("9999"), policy).pointsUsed());
        assertEquals(2, LoyaltyMath.quote(2, 0, 100, new BigDecimal("100000"), policy).pointsUsed());
        assertEquals(0, LoyaltyMath.quote(0, 0, 0, new BigDecimal("9999"), policy).pointsToEarn());
        assertThrows(IllegalArgumentException.class, () -> LoyaltyMath.quote(10, 0, -1, BigDecimal.TEN, policy));
    }
}
