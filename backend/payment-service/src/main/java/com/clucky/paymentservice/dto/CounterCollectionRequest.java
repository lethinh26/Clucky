package com.clucky.paymentservice.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record CounterCollectionRequest(
    @NotNull @Positive Long orderId,
    @NotBlank @Size(max = 40) String orderCode,
    @Positive Integer queueNumber,
    @NotNull @Positive Long storeId,
    @NotNull @DecimalMin("1") @Digits(integer = 12, fraction = 0) BigDecimal totalDue,
    @NotBlank @Size(max = 30) String method,
    @DecimalMin("0") @Digits(integer = 12, fraction = 0) BigDecimal cashAmount,
    @DecimalMin("0") @Digits(integer = 12, fraction = 0) BigDecimal cashTendered,
    @DecimalMin("0") @Digits(integer = 12, fraction = 0) BigDecimal bankAmount,
    @Size(max = 100) String bankRefCode,
    Boolean manualAcceptance,
    String exceptionReason,
    String staffNotes
) {}
