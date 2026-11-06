package com.clucky.promotionloyaltyservice.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public class ValidateVoucherRequest {

    @NotBlank(message = "Mã voucher không được để trống")
    @Size(max = 80, message = "Mã voucher tối đa 80 ký tự")
    private String code;

    @NotNull(message = "Số tiền đơn hàng không được để trống")
    @DecimalMin(value = "0.0", message = "Số tiền đơn hàng không được âm")
    @Digits(integer = 12, fraction = 0, message = "Số tiền tối đa 12 chữ số nguyên, không có phần lẻ")
    @JsonAlias({"subtotal", "orderAmount"})
    private BigDecimal orderAmount;

    @Positive(message = "storeId phải là số dương")
    private Long storeId;

    private Long customerId;

    public ValidateVoucherRequest() {
    }

    public ValidateVoucherRequest(String code, BigDecimal orderAmount) {
        this.code = code;
        this.orderAmount = orderAmount;
    }

    public ValidateVoucherRequest(String code, BigDecimal orderAmount, Long storeId) {
        this.code = code;
        this.orderAmount = orderAmount;
        this.storeId = storeId;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public BigDecimal getOrderAmount() {
        return orderAmount;
    }

    public void setOrderAmount(BigDecimal orderAmount) {
        this.orderAmount = orderAmount;
    }

    public Long getStoreId() {
        return storeId;
    }

    public void setStoreId(Long storeId) {
        this.storeId = storeId;
    }

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }
}

