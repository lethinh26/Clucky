package com.clucky.shippingservice.dto;

import java.time.Instant;

public record ShipmentStatusHistoryResponse(
        Long id,
        Long shipmentId,
        String status,
        Long changedBy,
        String note,
        Instant createdAt
) {}
