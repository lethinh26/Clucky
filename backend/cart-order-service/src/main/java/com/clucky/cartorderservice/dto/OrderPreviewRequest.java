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
        @jakarta.validation.constraints.DecimalMin("-90") @jakarta.validation.constraints.DecimalMax("90") Double latitude,
        @jakarta.validation.constraints.DecimalMin("-180") @jakarta.validation.constraints.DecimalMax("180") Double longitude,
        List<@Valid CartItemDto> items
) {
    @jakarta.validation.constraints.AssertTrue
    public boolean isCoordinatePairValid() {
        return (latitude == null && longitude == null) || (latitude != null && longitude != null
                && Double.isFinite(latitude) && Double.isFinite(longitude));
    }
}
