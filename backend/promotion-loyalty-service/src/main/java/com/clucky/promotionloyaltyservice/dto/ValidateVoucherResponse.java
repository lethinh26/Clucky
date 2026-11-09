package com.clucky.promotionloyaltyservice.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ValidateVoucherResponse {

    private boolean valid;
    private String code;
    private BigDecimal discountAmount = BigDecimal.ZERO;
    private String errorCode;
    private String reason;
    private VoucherResponse voucher;

    public ValidateVoucherResponse() {
    }

    public static ValidateVoucherResponse invalid(String reason) {
        return invalid(null, null, reason);
    }

    public static ValidateVoucherResponse invalid(String code, String errorCode, String reason) {
        ValidateVoucherResponse res = new ValidateVoucherResponse();
        res.setValid(false);
        res.setCode(code);
        res.setErrorCode(errorCode);
        res.setDiscountAmount(BigDecimal.ZERO);
        res.setReason(reason);
        return res;
    }

    public static ValidateVoucherResponse valid(BigDecimal discountAmount, VoucherResponse voucher) {
        ValidateVoucherResponse res = new ValidateVoucherResponse();
        res.setValid(true);
        res.setCode(voucher != null ? voucher.getCode() : null);
        res.setDiscountAmount(discountAmount);
        res.setVoucher(voucher);
        return res;
    }

    public boolean isValid() {
        return valid;
    }

    public void setValid(boolean valid) {
        this.valid = valid;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public BigDecimal getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(BigDecimal discountAmount) {
        this.discountAmount = discountAmount;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public VoucherResponse getVoucher() {
        return voucher;
    }

    public void setVoucher(VoucherResponse voucher) {
        this.voucher = voucher;
    }
}

