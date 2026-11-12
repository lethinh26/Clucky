package com.clucky.promotionloyaltyservice.dto;

import com.clucky.promotionloyaltyservice.model.Voucher;
import com.clucky.promotionloyaltyservice.model.VoucherScope;
import com.clucky.promotionloyaltyservice.model.VoucherStatus;
import com.clucky.promotionloyaltyservice.model.VoucherType;

import java.math.BigDecimal;
import java.time.Instant;

public class VoucherResponse {

    private Long id;
    private String code;
    private String title;
    private String description;
    private VoucherType type;
    private BigDecimal value;
    private BigDecimal minOrderAmount;
    private BigDecimal maxDiscount;
    private Integer totalLimit;
    private Integer usedCount;
    private int reservedCount;
    private long version;
    private Instant startAt;
    private Instant endAt;
    private VoucherScope scope;
    private Long storeId;
    private String storeName;
    private VoucherStatus status;
    private VoucherStatus effectiveStatus;
    private Long createdBy;
    private Long approvedBy;
    private String rejectionReason;
    private Long rejectedBy;
    private Instant rejectedAt;
    private Instant createdAt;
    private Instant updatedAt;

    public VoucherResponse() {
    }

    public int getReservedCount() { return reservedCount; }

    public long getVersion() { return version; }

    public String getRejectionReason() { return rejectionReason; }
    public Long getRejectedBy() { return rejectedBy; }
    public Instant getRejectedAt() { return rejectedAt; }

    public static VoucherResponse fromEntity(Voucher v) {
        return fromEntity(v, Instant.now());
    }

    public static VoucherResponse fromEntity(Voucher v, Instant now) {
        if (v == null) {
            return null;
        }
        VoucherResponse dto = new VoucherResponse();
        dto.setId(v.getId());
        dto.setCode(v.getCode());
        dto.setTitle(v.getTitle());
        dto.setDescription(v.getDescription());
        dto.setType(v.getType());
        dto.setValue(v.getValue());
        dto.setMinOrderAmount(v.getMinOrderAmount());
        dto.setMaxDiscount(v.getMaxDiscount());
        dto.setTotalLimit(v.getTotalLimit());
        dto.setUsedCount(v.getUsedCount());
        dto.reservedCount = v.getReservedCount();
        dto.version = v.getVersion();
        dto.setStartAt(v.getStartAt());
        dto.setEndAt(v.getEndAt());
        dto.setScope(v.getScope());
        dto.setStoreId(v.getStoreId());
        dto.setStatus(v.getStatus());
        dto.setEffectiveStatus(v.computeEffectiveStatus(now));
        dto.setCreatedBy(v.getCreatedBy());
        dto.setApprovedBy(v.getApprovedBy());
        dto.rejectionReason = v.getRejectionReason();
        dto.rejectedBy = v.getRejectedBy();
        dto.rejectedAt = v.getRejectedAt();
        dto.setCreatedAt(v.getCreatedAt());
        dto.setUpdatedAt(v.getUpdatedAt());
        return dto;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public Integer getUsedCount() {
        return usedCount;
    }

    public void setUsedCount(Integer usedCount) {
        this.usedCount = usedCount;
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

    public String getStoreName() {
        return storeName;
    }

    public void setStoreName(String storeName) {
        this.storeName = storeName;
    }

    public VoucherStatus getStatus() {
        return status;
    }

    public void setStatus(VoucherStatus status) {
        this.status = status;
    }

    public VoucherStatus getEffectiveStatus() {
        return effectiveStatus;
    }

    public void setEffectiveStatus(VoucherStatus effectiveStatus) {
        this.effectiveStatus = effectiveStatus;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }

    public Long getApprovedBy() {
        return approvedBy;
    }

    public void setApprovedBy(Long approvedBy) {
        this.approvedBy = approvedBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
