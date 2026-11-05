package com.clucky.promotionloyaltyservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record VoucherReleaseRequest(
        @NotBlank(message = "Mã voucher không được để trống")
        @Size(max = 80, message = "Mã voucher tối đa 80 ký tự")
        String code,

        @NotNull(message = "orderId không được để trống")
        @Positive(message = "orderId phải là số dương")
        Long orderId,

        @NotNull(message = "customerId không được để trống")
        @Positive(message = "customerId phải là số dương")
        Long customerId
) {}

