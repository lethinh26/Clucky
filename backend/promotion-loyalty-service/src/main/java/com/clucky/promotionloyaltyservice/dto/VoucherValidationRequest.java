package com.clucky.promotionloyaltyservice.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record VoucherValidationRequest(
        @NotBlank(message = "Mã voucher không được để trống")
        @Size(max = 80, message = "Mã voucher tối đa 80 ký tự")
        String code,

        @NotNull(message = "storeId không được để trống")
        @Positive(message = "storeId phải là số dương")
        Long storeId,

        @NotNull(message = "Số tiền đơn hàng không được để trống")
        @DecimalMin(value = "0", message = "Số tiền không được âm")
        @Digits(integer = 12, fraction = 0, message = "Số tiền tối đa 12 chữ số nguyên, không có phần lẻ")
        @JsonAlias({"orderAmount", "subtotal"})
        @JsonProperty("subtotal")
        BigDecimal subtotal
) {}
