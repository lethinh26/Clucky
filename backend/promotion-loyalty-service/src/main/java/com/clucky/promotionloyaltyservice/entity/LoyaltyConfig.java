package com.clucky.promotionloyaltyservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "loyalty_config", schema = "promotion_service")
public class LoyaltyConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "earn_rate", nullable = false, precision = 12, scale = 4)
    private BigDecimal earnRate;

    @Column(name = "redeem_rate", nullable = false, precision = 12, scale = 4)
    private BigDecimal redeemRate;

    @Column(name = "updated_by", nullable = true)
    private Long updatedBy;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public BigDecimal getEarnRate() { return earnRate; }
    public void setEarnRate(BigDecimal earnRate) { this.earnRate = earnRate; }

    public BigDecimal getRedeemRate() { return redeemRate; }
    public void setRedeemRate(BigDecimal redeemRate) { this.redeemRate = redeemRate; }

    public Long getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}
