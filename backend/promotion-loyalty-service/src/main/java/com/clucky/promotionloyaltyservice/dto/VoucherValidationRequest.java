package com.clucky.promotionloyaltyservice.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record VoucherValidationRequest(@NotBlank @Size(max = 80) String code,
        @NotNull @Positive Long storeId,
        @NotNull @DecimalMin("0") @Digits(integer = 12, fraction = 0) BigDecimal subtotal) {}
