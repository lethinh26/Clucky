package com.clucky.reviewreportservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "order_projection_trackers", schema = "review_report_service")
public class OrderProjectionTracker {

    @Id
    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "order_code", length = 64)
    private String orderCode;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "stat_date", nullable = false)
    private LocalDate statDate;

    @Column(name = "payment_method", length = 30)
    private String paymentMethod;

    @Column(name = "revenue_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal revenueAmount = BigDecimal.ZERO;

    @Column(name = "cod_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal codAmount = BigDecimal.ZERO;

    @Column(name = "transfer_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal transferAmount = BigDecimal.ZERO;

    @Column(name = "order_completed", nullable = false)
    private boolean orderCompleted = false;

    @Column(name = "payment_confirmed", nullable = false)
    private boolean paymentConfirmed = false;

    @Column(name = "contributed", nullable = false)
    private boolean contributed = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public OrderProjectionTracker() {
    }

    public OrderProjectionTracker(Long orderId, String orderCode, Long storeId, LocalDate statDate,
                                  String paymentMethod, BigDecimal revenueAmount, BigDecimal codAmount,
                                  BigDecimal transferAmount, boolean orderCompleted, boolean paymentConfirmed,
                                  boolean contributed) {
        this.orderId = orderId;
        this.orderCode = orderCode;
        this.storeId = storeId;
        this.statDate = statDate;
        this.paymentMethod = paymentMethod;
        this.revenueAmount = revenueAmount != null ? revenueAmount : BigDecimal.ZERO;
        this.codAmount = codAmount != null ? codAmount : BigDecimal.ZERO;
        this.transferAmount = transferAmount != null ? transferAmount : BigDecimal.ZERO;
        this.orderCompleted = orderCompleted;
        this.paymentConfirmed = paymentConfirmed;
        this.contributed = contributed;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public String getOrderCode() {
        return orderCode;
    }

    public void setOrderCode(String orderCode) {
        this.orderCode = orderCode;
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

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public BigDecimal getRevenueAmount() {
        return revenueAmount;
    }

    public void setRevenueAmount(BigDecimal revenueAmount) {
        this.revenueAmount = revenueAmount;
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

    public boolean isOrderCompleted() {
        return orderCompleted;
    }

    public void setOrderCompleted(boolean orderCompleted) {
        this.orderCompleted = orderCompleted;
    }

    public boolean isPaymentConfirmed() {
        return paymentConfirmed;
    }

    public void setPaymentConfirmed(boolean paymentConfirmed) {
        this.paymentConfirmed = paymentConfirmed;
    }

    public boolean isContributed() {
        return contributed;
    }

    public void setContributed(boolean contributed) {
        this.contributed = contributed;
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
