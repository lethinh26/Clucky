package com.clucky.paymentservice.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record ReserveRefundRequest(
        @NotNull @Positive Long refundRequestId,
        @NotNull @Positive Long orderId,
        @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=40) String orderCode,
        @NotNull @Positive @jakarta.validation.constraints.Digits(integer=12,fraction=0) BigDecimal amount
) {}

