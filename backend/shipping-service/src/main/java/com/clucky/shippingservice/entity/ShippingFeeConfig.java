package com.clucky.shippingservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "shipping_fee_config", schema = "shipping_service")
public class ShippingFeeConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "store_id", nullable = true)
    private Long storeId;

    @Column(name = "base_fee", nullable = false, precision = 12, scale = 0)
    private BigDecimal baseFee;

    @Column(name = "per_km_fee", nullable = false, precision = 12, scale = 0)
    private BigDecimal perKmFee;

    @Column(name = "free_from_amount", nullable = true, precision = 12, scale = 0)
    private BigDecimal freeFromAmount;

    @Column(name = "area_note", nullable = true, columnDefinition = "text")
    private String areaNote;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getStoreId() { return storeId; }
    public void setStoreId(Long storeId) { this.storeId = storeId; }

    public BigDecimal getBaseFee() { return baseFee; }
    public void setBaseFee(BigDecimal baseFee) { this.baseFee = baseFee; }

    public BigDecimal getPerKmFee() { return perKmFee; }
    public void setPerKmFee(BigDecimal perKmFee) { this.perKmFee = perKmFee; }

    public BigDecimal getFreeFromAmount() { return freeFromAmount; }
    public void setFreeFromAmount(BigDecimal freeFromAmount) { this.freeFromAmount = freeFromAmount; }

    public String getAreaNote() { return areaNote; }
    public void setAreaNote(String areaNote) { this.areaNote = areaNote; }
}
