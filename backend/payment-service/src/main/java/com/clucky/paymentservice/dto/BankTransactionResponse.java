package com.clucky.paymentservice.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.Instant;

public record BankTransactionResponse(
        Long id,
        String bankTxId,
        String bankAccount,
        BigDecimal amount,
        String content,
        Instant receivedAt,
        String matchedOrderCode
) {}
