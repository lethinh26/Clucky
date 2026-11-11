package com.clucky.cartorderservice.dto;

import com.clucky.cartorderservice.cart.CartItemDto;
import java.math.BigDecimal;
import java.util.List;

public record OrderPreviewResponse(
        BigDecimal subtotal,
        BigDecimal discountAmount,
        Integer pointsUsed,
        BigDecimal pointsAmount,
        BigDecimal shippingFee,
        BigDecimal totalAmount,
        boolean voucherValid,
        String voucherMessage,
        List<CartItemDto> items,
        BigDecimal tierDiscount,
        boolean orderValid,
        com.clucky.cartorderservice.service.ShippingClient.ShippingFeeResult shipping
) {
    public OrderPreviewResponse(BigDecimal subtotal, BigDecimal discountAmount, Integer pointsUsed, BigDecimal pointsAmount,
            BigDecimal shippingFee, BigDecimal totalAmount, boolean voucherValid, String voucherMessage, List<CartItemDto> items) {
        this(subtotal, discountAmount, pointsUsed, pointsAmount, shippingFee, totalAmount, voucherValid, voucherMessage, items, BigDecimal.ZERO, false, null);
    }
}
