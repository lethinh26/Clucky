package com.clucky.promotionloyaltyservice.dto;

import com.clucky.promotionloyaltyservice.model.VoucherScope;
import com.clucky.promotionloyaltyservice.model.VoucherStatus;
import com.clucky.promotionloyaltyservice.model.VoucherType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;

public class VoucherRequest {

    @PositiveOrZero
    private Long version;

    public Long getVersion() { return version; }

    public void setVersion(Long version) { this.version = version; }

    @NotBlank(message = "Mã voucher không được để trống")
    @Size(max = 80, message = "Mã voucher tối đa 80 ký tự")
    @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Mã voucher chỉ chứa chữ cái, số, gạch dưới hoặc gạch ngang")
    private String code;

    @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
    private String title;

    private String description;

    @NotNull(message = "Loại voucher (PERCENT hoặc AMOUNT) không được để trống")
    private VoucherType type;

    @NotNull(message = "Giá trị giảm không được để trống")
    @DecimalMin(value = "1.0", message = "Giá trị giảm phải lớn hơn 0")
    @Digits(integer = 12, fraction = 0)
    private BigDecimal value;

    @DecimalMin(value = "0.0", message = "Giá trị đơn hàng tối thiểu không được âm")
    @Digits(integer = 12, fraction = 0)
    private BigDecimal minOrderAmount = BigDecimal.ZERO;

    @DecimalMin(value = "0.0", message = "Mức giảm tối đa không được âm")
    @Digits(integer = 12, fraction = 0)
    private BigDecimal maxDiscount;

    @Min(value = 1, message = "Giới hạn số lượt dùng tối thiểu là 1")
    private Integer totalLimit;

    @NotNull(message = "Thời gian bắt đầu không được để trống")
    private Instant startAt;

    @NotNull(message = "Thời gian kết thúc không được để trống")
    private Instant endAt;

    private VoucherScope scope = VoucherScope.ALL;

    @Positive
    private Long storeId;

    private VoucherStatus status = VoucherStatus.ACTIVE;

    public VoucherRequest() {
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public VoucherType getType() {
        return type;
    }

    public void setType(VoucherType type) {
        this.type = type;
    }

    public BigDecimal getValue() {
        return value;
    }

    public void setValue(BigDecimal value) {
        this.value = value;
    }

    public BigDecimal getMinOrderAmount() {
        return minOrderAmount;
    }

    public void setMinOrderAmount(BigDecimal minOrderAmount) {
        this.minOrderAmount = minOrderAmount;
    }

    public BigDecimal getMaxDiscount() {
        return maxDiscount;
    }

    public void setMaxDiscount(BigDecimal maxDiscount) {
        this.maxDiscount = maxDiscount;
    }

    public Integer getTotalLimit() {
        return totalLimit;
    }

    public void setTotalLimit(Integer totalLimit) {
        this.totalLimit = totalLimit;
    }

    public Instant getStartAt() {
        return startAt;
    }

    public void setStartAt(Instant startAt) {
        this.startAt = startAt;
    }

    public Instant getEndAt() {
        return endAt;
    }

    public void setEndAt(Instant endAt) {
        this.endAt = endAt;
    }

    public VoucherScope getScope() {
        return scope;
    }

    public void setScope(VoucherScope scope) {
        this.scope = scope;
    }

    public Long getStoreId() {
        return storeId;
    }

    public void setStoreId(Long storeId) {
        this.storeId = storeId;
    }

    public VoucherStatus getStatus() {
        return status;
    }

    public void setStatus(VoucherStatus status) {
        this.status = status;
    }
}

