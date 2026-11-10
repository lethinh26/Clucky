package com.clucky.paymentservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "counter_payment_receipts", schema = "payment_service")
public class CounterPaymentReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "receipt_code", nullable = false, length = 60, unique = true)
    private String receiptCode;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "order_code", nullable = false, length = 40)
    private String orderCode;

    @Column(name = "queue_number")
    private Integer queueNumber;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "method", nullable = false, length = 30)
    private String method;

    @Column(name = "total_due", nullable = false, precision = 12, scale = 0)
    private BigDecimal totalDue;

    @Column(name = "cash_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal cashAmount = BigDecimal.ZERO;

    @Column(name = "cash_tendered", precision = 12, scale = 0)
    private BigDecimal cashTendered = BigDecimal.ZERO;

    @Column(name = "cash_change", precision = 12, scale = 0)
    private BigDecimal cashChange = BigDecimal.ZERO;

    @Column(name = "rounding_difference", nullable = false, precision = 12, scale = 0)
    private BigDecimal roundingDifference = BigDecimal.ZERO;

    @Column(name = "bank_amount_declared", nullable = false, precision = 12, scale = 0)
    private BigDecimal bankAmountDeclared = BigDecimal.ZERO;

    @Column(name = "bank_amount_reconciled", nullable = false, precision = 12, scale = 0)
    private BigDecimal bankAmountReconciled = BigDecimal.ZERO;

    @Column(name = "bank_ref_code", length = 100)
    private String bankRefCode;

    @Column(name = "bank_tx_id", length = 160)
    private String bankTxId;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "manual_acceptance", nullable = false)
    private Boolean manualAcceptance = Boolean.FALSE;

    @Column(name = "discrepancy_amount", precision = 12, scale = 0)
    private BigDecimal discrepancyAmount = BigDecimal.ZERO;

    @Column(name = "exception_reason", columnDefinition = "text")
    private String exceptionReason;

    @Column(name = "staff_id", nullable = false)
    private Long staffId;

    @Column(name = "staff_name", length = 120)
    private String staffName;

    @Column(name = "print_count", nullable = false)
    private Integer printCount = 0;

    @Column(name = "idempotency_key", nullable = false, length = 128, unique = true)
    private String idempotencyKey;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (updatedAt == null) {
            updatedAt = Instant.now();
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getReceiptCode() { return receiptCode; }
    public void setReceiptCode(String receiptCode) { this.receiptCode = receiptCode; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public String getOrderCode() { return orderCode; }
    public void setOrderCode(String orderCode) { this.orderCode = orderCode; }

    public Integer getQueueNumber() { return queueNumber; }
    public void setQueueNumber(Integer queueNumber) { this.queueNumber = queueNumber; }

    public Long getStoreId() { return storeId; }
    public void setStoreId(Long storeId) { this.storeId = storeId; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public BigDecimal getTotalDue() { return totalDue; }
    public void setTotalDue(BigDecimal totalDue) { this.totalDue = totalDue; }

    public BigDecimal getCashAmount() { return cashAmount; }
    public void setCashAmount(BigDecimal cashAmount) { this.cashAmount = cashAmount; }

    public BigDecimal getCashTendered() { return cashTendered; }
    public void setCashTendered(BigDecimal cashTendered) { this.cashTendered = cashTendered; }

    public BigDecimal getCashChange() { return cashChange; }
    public void setCashChange(BigDecimal cashChange) { this.cashChange = cashChange; }

    public BigDecimal getRoundingDifference() { return roundingDifference; }
    public void setRoundingDifference(BigDecimal roundingDifference) { this.roundingDifference = roundingDifference; }

    public BigDecimal getBankAmountDeclared() { return bankAmountDeclared; }
    public void setBankAmountDeclared(BigDecimal bankAmountDeclared) { this.bankAmountDeclared = bankAmountDeclared; }

    public BigDecimal getBankAmountReconciled() { return bankAmountReconciled; }
    public void setBankAmountReconciled(BigDecimal bankAmountReconciled) { this.bankAmountReconciled = bankAmountReconciled; }

    public String getBankRefCode() { return bankRefCode; }
    public void setBankRefCode(String bankRefCode) { this.bankRefCode = bankRefCode; }

    public String getBankTxId() { return bankTxId; }
    public void setBankTxId(String bankTxId) { this.bankTxId = bankTxId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getManualAcceptance() { return manualAcceptance; }
    public void setManualAcceptance(Boolean manualAcceptance) { this.manualAcceptance = manualAcceptance; }

    public BigDecimal getDiscrepancyAmount() { return discrepancyAmount; }
    public void setDiscrepancyAmount(BigDecimal discrepancyAmount) { this.discrepancyAmount = discrepancyAmount; }

    public String getExceptionReason() { return exceptionReason; }
    public void setExceptionReason(String exceptionReason) { this.exceptionReason = exceptionReason; }

    public Long getStaffId() { return staffId; }
    public void setStaffId(Long staffId) { this.staffId = staffId; }

    public String getStaffName() { return staffName; }
    public void setStaffName(String staffName) { this.staffName = staffName; }

    public Integer getPrintCount() { return printCount; }
    public void setPrintCount(Integer printCount) { this.printCount = printCount; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }

    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
