package com.clucky.paymentservice.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CounterCollectionRequest(
    @NotNull Long orderId,
    @NotBlank String orderCode,
    Integer queueNumber,
    @NotNull Long storeId,
    @NotNull @DecimalMin("0") BigDecimal totalDue,
    @NotBlank String method,
    BigDecimal cashAmount,
    BigDecimal cashTendered,
    BigDecimal bankAmount,
    String bankRefCode,
    Boolean manualAcceptance,
    String exceptionReason,
    String staffNotes
) {}
