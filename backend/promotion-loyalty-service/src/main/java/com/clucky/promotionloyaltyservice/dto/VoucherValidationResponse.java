package com.clucky.promotionloyaltyservice.dto;

import java.math.BigDecimal;

public record VoucherValidationResponse(String code, BigDecimal discountAmount) {}
