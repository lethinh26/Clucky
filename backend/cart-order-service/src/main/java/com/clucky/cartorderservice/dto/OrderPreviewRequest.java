package com.clucky.cartorderservice.dto;

import com.clucky.cartorderservice.cart.CartItemDto;
import java.util.List;

public record OrderPreviewRequest(
        Long storeId,
        String type,
        String voucherCode,
        Integer pointsUsed,
        String receiverAddress,
        Double latitude,
        Double longitude,
        List<CartItemDto> items
) {}
