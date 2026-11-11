package com.clucky.paymentservice.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record ConfirmRefundRequest(@NotNull @Positive Long orderId, @NotNull @Positive @Digits(integer=12,fraction=0) BigDecimal amount,
        @NotBlank @Pattern(regexp="[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}") String attemptId,
        @NotBlank @Pattern(regexp="[a-f0-9]{64}") String evidenceReference) {}
