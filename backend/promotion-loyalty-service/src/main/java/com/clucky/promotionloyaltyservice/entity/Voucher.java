package com.clucky.promotionloyaltyservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "vouchers", schema = "promotion_service")
public class Voucher {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "code", nullable = false, length = 80, unique = true)
    private String code;

    @Column(name = "type", nullable = false, length = 20)
    private String type;

    @Column(name = "value", nullable = false, precision = 12, scale = 0)
    private BigDecimal value;

    @Column(name = "min_order_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal minOrderAmount = new BigDecimal("0");

    @Column(name = "max_discount", nullable = true, precision = 12, scale = 0)
    private BigDecimal maxDiscount;

    @Column(name = "total_limit", nullable = true)
    private Integer totalLimit;

    @Column(name = "used_count", nullable = false)
    private Integer usedCount = 0;

    @Column(name = "start_at", nullable = false)
    private Instant startAt;

    @Column(name = "end_at", nullable = false)
    private Instant endAt;

    @Column(name = "scope", nullable = false, length = 20)
    private String scope = "ALL";

    @Column(name = "store_id", nullable = true)
    private Long storeId;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "ACTIVE";

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public BigDecimal getValue() { return value; }
    public void setValue(BigDecimal value) { this.value = value; }

    public BigDecimal getMinOrderAmount() { return minOrderAmount; }
    public void setMinOrderAmount(BigDecimal minOrderAmount) { this.minOrderAmount = minOrderAmount; }

    public BigDecimal getMaxDiscount() { return maxDiscount; }
    public void setMaxDiscount(BigDecimal maxDiscount) { this.maxDiscount = maxDiscount; }

    public Integer getTotalLimit() { return totalLimit; }
    public void setTotalLimit(Integer totalLimit) { this.totalLimit = totalLimit; }

    public Integer getUsedCount() { return usedCount; }
    public void setUsedCount(Integer usedCount) { this.usedCount = usedCount; }

    public Instant getStartAt() { return startAt; }
    public void setStartAt(Instant startAt) { this.startAt = startAt; }

    public Instant getEndAt() { return endAt; }
    public void setEndAt(Instant endAt) { this.endAt = endAt; }

    public String getScope() { return scope; }
    public void setScope(String scope) { this.scope = scope; }

    public Long getStoreId() { return storeId; }
    public void setStoreId(Long storeId) { this.storeId = storeId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
