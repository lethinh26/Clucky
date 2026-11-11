package com.clucky.paymentservice.dto;

import java.math.BigDecimal;

public record ReserveRefundResponse(
        Long id,
        Long refundRequestId,
        Long orderId,
        BigDecimal amount,
        String status
) {}

