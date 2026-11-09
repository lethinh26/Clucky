package com.clucky.promotionloyaltyservice.service;

import com.clucky.promotionloyaltyservice.dto.LoyaltyData.*;
import java.math.BigDecimal;
import java.math.RoundingMode;

public final class LoyaltyMath {
    private LoyaltyMath() {}
    public static String tier(long lifetime, Policy policy) {
        return lifetime >= policy.goldThreshold() ? "GOLD" : lifetime >= policy.silverThreshold() ? "SILVER" : "MEMBER";
    }
    public static Quote quote(long available, long lifetime, int requested, BigDecimal amount, Policy policy) {
        if (available < 0 || requested < 0 || amount.signum() < 0) throw new IllegalArgumentException("Invalid loyalty input");
        String tier = tier(lifetime, policy);
        int percent = "GOLD".equals(tier) ? policy.goldDiscount() : "SILVER".equals(tier) ? policy.silverDiscount() : 0;
        BigDecimal discount = amount.multiply(BigDecimal.valueOf(percent)).divide(BigDecimal.valueOf(100), 0, RoundingMode.DOWN);
        BigDecimal remaining = amount.subtract(discount);
        long maximum = Math.min(available, remaining.divide(BigDecimal.valueOf(policy.pointValue()), 0, RoundingMode.DOWN).longValueExact());
        int used = Math.toIntExact(Math.min(requested, maximum));
        BigDecimal redeemed = BigDecimal.valueOf(used).multiply(BigDecimal.valueOf(policy.pointValue()));
        int earned = remaining.subtract(redeemed).divide(BigDecimal.valueOf(policy.spendPerPoint()), 0, RoundingMode.DOWN).intValueExact();
        return new Quote(policy.version(), Math.toIntExact(available), used, redeemed, earned, tier, discount);
    }
}
