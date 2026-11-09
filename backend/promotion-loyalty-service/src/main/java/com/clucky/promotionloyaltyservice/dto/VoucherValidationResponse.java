package com.clucky.promotionloyaltyservice.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record VoucherValidationResponse(
        String code,
        BigDecimal discountAmount,
        Boolean valid,
        String reason,
        String errorCode
) {
    public VoucherValidationResponse(String code, BigDecimal discountAmount) {
        this(code, discountAmount, true, null, null);
    }

    public static VoucherValidationResponse valid(String code, BigDecimal discountAmount) {
        return new VoucherValidationResponse(code, discountAmount, true, "Đã áp dụng mã giảm giá thành công", null);
    }

    public static VoucherValidationResponse invalid(String code, String errorCode, String reason) {
        return new VoucherValidationResponse(code, BigDecimal.ZERO, false, reason, errorCode);
    }
}
