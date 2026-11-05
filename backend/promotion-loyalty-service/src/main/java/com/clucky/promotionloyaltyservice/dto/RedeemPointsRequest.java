package com.clucky.promotionloyaltyservice.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record RedeemPointsRequest(
        @NotNull(message = "customerId không được để trống")
        @Positive(message = "customerId phải là số dương")
        Long customerId,

        @NotNull(message = "orderId không được để trống")
        @Positive(message = "orderId phải là số dương")
        Long orderId,

        @NotNull(message = "points không được để trống")
        @Positive(message = "Số điểm quy đổi phải lớn hơn 0")
        Integer points,

        @NotNull(message = "orderAmount không được để trống")
        @DecimalMin(value = "0", message = "orderAmount không được âm")
        @Digits(integer = 12, fraction = 0, message = "Số tiền tối đa 12 chữ số nguyên, không phần lẻ")
        BigDecimal orderAmount
) {}

