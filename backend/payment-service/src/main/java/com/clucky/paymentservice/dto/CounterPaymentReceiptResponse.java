package com.clucky.paymentservice.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CounterPaymentReceiptResponse(
    Long id,
    String receiptCode,
    Long orderId,
    String orderCode,
    Integer queueNumber,
    Long storeId,
    String method,
    BigDecimal totalDue,
    BigDecimal cashAmount,
    BigDecimal cashTendered,
    BigDecimal cashChange,
    BigDecimal roundingDifference,
    BigDecimal bankAmountDeclared,
    BigDecimal bankAmountReconciled,
    String bankRefCode,
    String bankTxId,
    UUID collectionId,
    String collectionStatus,
    String status,
    Boolean manualAcceptance,
    BigDecimal discrepancyAmount,
    String exceptionReason,
    Long staffId,
    String staffName,
    Integer printCount,
    Instant createdAt,
    Instant updatedAt
) {}
