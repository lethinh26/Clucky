package com.clucky.promotionloyaltyservice.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record LoyaltyReleaseRequest(
        @NotNull(message = "customerId không được để trống")
        @Positive(message = "customerId phải là số dương")
        Long customerId,

        @NotNull(message = "points không được để trống")
        @Positive(message = "Số điểm hoàn trả phải lớn hơn 0")
        Integer points,

        @NotNull(message = "orderId không được để trống")
        @Positive(message = "orderId phải là số dương")
        Long orderId
) {}

