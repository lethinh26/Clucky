package com.clucky.cartorderservice.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;

public record OrderItemResponse(
        Long id,
        Long orderId,
        String itemType,
        Long productId,
        Long comboId,
        String itemName,
        BigDecimal unitPrice,
        Integer quantity,
        JsonNode optionsSnapshot,
        JsonNode toppingsSnapshot,
        String note,
        BigDecimal lineTotal
) {}
