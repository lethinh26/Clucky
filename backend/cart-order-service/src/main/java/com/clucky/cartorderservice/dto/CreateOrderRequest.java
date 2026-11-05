package com.clucky.cartorderservice.dto;

import com.clucky.cartorderservice.cart.CartItemDto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;

public record CreateOrderRequest(
        @NotNull(message = "storeId is required") Long storeId,
        @NotBlank(message = "type is required") String type,
        @NotBlank(message = "receiverName is required") String receiverName,
        @NotBlank(message = "receiverPhone is required") String receiverPhone,
        String deliveryAddress,
        String note,
        @NotBlank(message = "paymentMethod is required") String paymentMethod,
        String voucherCode,
        Integer pointsUsed,
        Instant scheduledAt,
        List<CartItemDto> items
) {}
