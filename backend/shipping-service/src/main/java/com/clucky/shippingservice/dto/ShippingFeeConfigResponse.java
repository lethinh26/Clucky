package com.clucky.shippingservice.dto;

import java.math.BigDecimal;

public record ShippingFeeConfigResponse(
        Long id,
        Long storeId,
        BigDecimal baseFee,
        BigDecimal perKmFee,
        BigDecimal freeFromAmount,
        String areaNote
) {}
