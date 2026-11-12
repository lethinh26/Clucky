package com.clucky.paymentservice.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ShiftSummaryResponse(
    Long storeId,
    LocalDate date,
    BigDecimal totalCashCollected,
    BigDecimal totalCashChangeGiven,
    BigDecimal netCashInDrawer,
    BigDecimal totalBankReconciled,
    BigDecimal totalBankPending,
    BigDecimal totalDiscrepancy,
    long transactionCount
) {}
