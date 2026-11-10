package com.clucky.paymentservice.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record ReserveRefundRequest(
        @NotNull Long refundRequestId,
        @NotNull Long orderId,
        String orderCode,
        @NotNull @Positive BigDecimal amount
) {}

