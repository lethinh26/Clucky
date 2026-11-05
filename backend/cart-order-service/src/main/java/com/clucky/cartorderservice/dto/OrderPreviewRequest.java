package com.clucky.cartorderservice.dto;

import com.clucky.cartorderservice.cart.CartItemDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.List;

public record OrderPreviewRequest(
        @Positive Long storeId,
        String type,
        String voucherCode,
        @PositiveOrZero Integer pointsUsed,
        String receiverAddress,
        Double latitude,
        Double longitude,
        List<@Valid CartItemDto> items
) {}
