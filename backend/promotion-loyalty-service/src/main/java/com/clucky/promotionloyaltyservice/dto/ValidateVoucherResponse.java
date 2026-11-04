package com.clucky.promotionloyaltyservice.dto;

import java.math.BigDecimal;

public class ValidateVoucherResponse {

    private boolean valid;
    private BigDecimal discountAmount = BigDecimal.ZERO;
    private String reason;
    private VoucherResponse voucher;

    public ValidateVoucherResponse() {
    }

    public static ValidateVoucherResponse invalid(String reason) {
        ValidateVoucherResponse res = new ValidateVoucherResponse();
        res.setValid(false);
        res.setDiscountAmount(BigDecimal.ZERO);
        res.setReason(reason);
        return res;
    }

    public static ValidateVoucherResponse valid(BigDecimal discountAmount, VoucherResponse voucher) {
        ValidateVoucherResponse res = new ValidateVoucherResponse();
        res.setValid(true);
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

    public BigDecimal getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(BigDecimal discountAmount) {
        this.discountAmount = discountAmount;
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

