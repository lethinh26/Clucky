package com.clucky.paymentservice.dto;

import java.math.BigDecimal;

public record BankWebhookPayload(
    String id,
    String gateway,
    BigDecimal transferAmount,
    String content,
    String referenceCode
) {}
