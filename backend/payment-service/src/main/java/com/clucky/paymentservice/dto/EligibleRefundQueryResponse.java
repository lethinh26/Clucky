package com.clucky.paymentservice.dto;

import java.math.BigDecimal;

public record EligibleRefundQueryResponse(
        boolean eligible,
        BigDecimal receivedAmount,
        BigDecimal eligibleAmount,
        BigDecimal heldAmount,
        BigDecimal refundableAmount,
        String reason
) {}

