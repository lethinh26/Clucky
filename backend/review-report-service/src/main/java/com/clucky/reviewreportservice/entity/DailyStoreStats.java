package com.clucky.reviewreportservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(
    name = "daily_store_stats",
    schema = "review_report_service",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_daily_store_stats", columnNames = {"store_id", "stat_date"})
    }
)
public class DailyStoreStats {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "stat_date", nullable = false)
    private LocalDate statDate;

    @Column(name = "order_count", nullable = false)
    private Integer orderCount = 0;

    @Column(name = "revenue", nullable = false, precision = 12, scale = 0)
    private BigDecimal revenue = BigDecimal.ZERO;

    @Column(name = "cod_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal codAmount = BigDecimal.ZERO;

    @Column(name = "transfer_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal transferAmount = BigDecimal.ZERO;

    @Column(name = "reconciled_transfer_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal reconciledTransferAmount = BigDecimal.ZERO;

    @Column(name = "pending_reconciliation_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal pendingReconciliationAmount = BigDecimal.ZERO;

    @Column(name = "excess_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal excessAmount = BigDecimal.ZERO;

    @Column(name = "expired_receipt_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal expiredReceiptAmount = BigDecimal.ZERO;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public DailyStoreStats() {
    }

    public DailyStoreStats(Long storeId, LocalDate statDate) {
        this.storeId = storeId;
        this.statDate = statDate;
        this.orderCount = 0;
        this.revenue = BigDecimal.ZERO;
        this.codAmount = BigDecimal.ZERO;
        this.transferAmount = BigDecimal.ZERO;
        this.reconciledTransferAmount = BigDecimal.ZERO;
        this.pendingReconciliationAmount = BigDecimal.ZERO;
        this.excessAmount = BigDecimal.ZERO;
        this.expiredReceiptAmount = BigDecimal.ZERO;
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getStoreId() {
        return storeId;
    }

    public void setStoreId(Long storeId) {
        this.storeId = storeId;
    }

    public LocalDate getStatDate() {
        return statDate;
    }

    public void setStatDate(LocalDate statDate) {
        this.statDate = statDate;
    }

    public Integer getOrderCount() {
        return orderCount;
    }

    public void setOrderCount(Integer orderCount) {
        this.orderCount = orderCount;
    }

    public BigDecimal getRevenue() {
        return revenue;
    }

    public void setRevenue(BigDecimal revenue) {
        this.revenue = revenue;
    }

    public BigDecimal getCodAmount() {
        return codAmount;
    }

    public void setCodAmount(BigDecimal codAmount) {
        this.codAmount = codAmount;
    }

    public BigDecimal getTransferAmount() {
        return transferAmount;
    }

    public void setTransferAmount(BigDecimal transferAmount) {
        this.transferAmount = transferAmount;
    }

    public BigDecimal getReconciledTransferAmount() {
        return reconciledTransferAmount;
    }

    public void setReconciledTransferAmount(BigDecimal reconciledTransferAmount) {
        this.reconciledTransferAmount = reconciledTransferAmount;
    }

    public BigDecimal getPendingReconciliationAmount() {
        return pendingReconciliationAmount;
    }

    public void setPendingReconciliationAmount(BigDecimal pendingReconciliationAmount) {
        this.pendingReconciliationAmount = pendingReconciliationAmount;
    }

    public BigDecimal getExcessAmount() {
        return excessAmount;
    }

    public void setExcessAmount(BigDecimal excessAmount) {
        this.excessAmount = excessAmount;
    }

    public BigDecimal getExpiredReceiptAmount() {
        return expiredReceiptAmount;
    }

    public void setExpiredReceiptAmount(BigDecimal expiredReceiptAmount) {
        this.expiredReceiptAmount = expiredReceiptAmount;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
