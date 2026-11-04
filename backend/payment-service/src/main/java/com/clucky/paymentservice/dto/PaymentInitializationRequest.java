package com.clucky.paymentservice.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record PaymentInitializationRequest(@NotNull @Positive Long orderId,
        @NotBlank @Size(max = 40) String orderCode,
        @NotNull @DecimalMin("0") @Digits(integer = 12, fraction = 0) BigDecimal amount,
        @NotNull PaymentMethod method) {}
