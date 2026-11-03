package com.clucky.reviewreportservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "daily_store_stats", schema = "review_report_service", uniqueConstraints = {@UniqueConstraint(columnNames = {"store_id", "stat_date"})})
public class DailyStoreStats {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "stat_date", nullable = false)
    private LocalDate statDate;

    @Column(name = "order_count", nullable = false)
    private Integer orderCount = 0;

    @Column(name = "revenue", nullable = false, precision = 12, scale = 0)
    private BigDecimal revenue = new BigDecimal("0");

    @Column(name = "cod_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal codAmount = new BigDecimal("0");

    @Column(name = "transfer_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal transferAmount = new BigDecimal("0");

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getStoreId() { return storeId; }
    public void setStoreId(Long storeId) { this.storeId = storeId; }

    public LocalDate getStatDate() { return statDate; }
    public void setStatDate(LocalDate statDate) { this.statDate = statDate; }

    public Integer getOrderCount() { return orderCount; }
    public void setOrderCount(Integer orderCount) { this.orderCount = orderCount; }

    public BigDecimal getRevenue() { return revenue; }
    public void setRevenue(BigDecimal revenue) { this.revenue = revenue; }

    public BigDecimal getCodAmount() { return codAmount; }
    public void setCodAmount(BigDecimal codAmount) { this.codAmount = codAmount; }

    public BigDecimal getTransferAmount() { return transferAmount; }
    public void setTransferAmount(BigDecimal transferAmount) { this.transferAmount = transferAmount; }
}
