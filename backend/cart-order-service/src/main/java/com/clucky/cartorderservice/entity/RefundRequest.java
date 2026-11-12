package com.clucky.cartorderservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "refund_requests", schema = "order_service")
public class RefundRequest {
    @Column(name = "payment_operation", length = 16)
    private String paymentOperation;
    @Column(name = "payment_error", length = 64)
    private String paymentError;
    @Column(name = "payment_retry_at")
    private Instant paymentRetryAt;
    @Column(name = "review_role", length = 30)
    private String reviewRole;

    public String getPaymentOperation() { return paymentOperation; }
    public void setPaymentOperation(String value) { paymentOperation = value; }
    public String getPaymentError() { return paymentError; }
    public void setPaymentError(String value) { paymentError = value; }
    public Instant getPaymentRetryAt() { return paymentRetryAt; }
    public void setPaymentRetryAt(Instant value) { paymentRetryAt = value; }
    public String getReviewRole() { return reviewRole; }
    public void setReviewRole(String value) { reviewRole = value; }
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "customer_id", nullable = true)
    private Long customerId;

    @Column(name = "amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal amount;

    @Column(name = "reason", nullable = false, columnDefinition = "text")
    private String reason;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "PENDING";

    @Column(name = "reviewed_by", nullable = true)
    private Long reviewedBy;

    @Column(name = "reviewed_at", nullable = true)
    private Instant reviewedAt;

    @Column(name = "review_note", columnDefinition = "text")
    private String reviewNote;

    @Column(name = "cancellation_reason_snapshot", columnDefinition = "text")
    private String cancellationReasonSnapshot;

    @Column(name = "cancellation_status_snapshot", length = 30)
    private String cancellationStatusSnapshot;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "bank_bin", length = 6)
    private String bankBin;

    @Column(name = "bank_account_no", length = 80)
    private String bankAccountNo;

    @Column(name = "bank_account_name", length = 160)
    private String bankAccountName;

    @Column(name = "bank_details_version", nullable = false)
    private Integer bankDetailsVersion = 1;

    @Column(name = "attempt_count", nullable = false)
    private Integer attemptCount = 0;

    @Column(name = "current_attempt_id", length = 64)
    private String currentAttemptId;

    @Column(name = "current_attempt_bank_snapshot", columnDefinition = "text")
    private String currentAttemptBankSnapshot;

    @Column(name = "evidence_public_id", length = 255)
    private String evidencePublicId;

    @Column(name = "evidence_url", columnDefinition = "text")
    private String evidenceUrl;

    @Column(name = "evidence_registered_at")
    private Instant evidenceRegisteredAt;

    @Column(name = "evidence_registered_by")
    private Long evidenceRegisteredBy;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "confirmed_by")
    private Long confirmedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(Long reviewedBy) { this.reviewedBy = reviewedBy; }

    public Instant getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(Instant reviewedAt) { this.reviewedAt = reviewedAt; }

    public String getReviewNote() { return reviewNote; }
    public void setReviewNote(String reviewNote) { this.reviewNote = reviewNote; }

    public String getCancellationReasonSnapshot() { return cancellationReasonSnapshot; }
    public void setCancellationReasonSnapshot(String cancellationReasonSnapshot) { this.cancellationReasonSnapshot = cancellationReasonSnapshot; }

    public String getCancellationStatusSnapshot() { return cancellationStatusSnapshot; }
    public void setCancellationStatusSnapshot(String cancellationStatusSnapshot) { this.cancellationStatusSnapshot = cancellationStatusSnapshot; }

    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }

    public String getBankBin() { return bankBin; }
    public void setBankBin(String bankBin) { this.bankBin = bankBin; }

    public String getBankAccountNo() { return bankAccountNo; }
    public void setBankAccountNo(String bankAccountNo) { this.bankAccountNo = bankAccountNo; }

    public String getBankAccountName() { return bankAccountName; }
    public void setBankAccountName(String bankAccountName) { this.bankAccountName = bankAccountName; }

    public Integer getBankDetailsVersion() { return bankDetailsVersion; }
    public void setBankDetailsVersion(Integer bankDetailsVersion) { this.bankDetailsVersion = bankDetailsVersion; }

    public Integer getAttemptCount() { return attemptCount; }
    public void setAttemptCount(Integer attemptCount) { this.attemptCount = attemptCount; }

    public String getCurrentAttemptId() { return currentAttemptId; }
    public void setCurrentAttemptId(String currentAttemptId) { this.currentAttemptId = currentAttemptId; }

    public String getCurrentAttemptBankSnapshot() { return currentAttemptBankSnapshot; }
    public void setCurrentAttemptBankSnapshot(String currentAttemptBankSnapshot) { this.currentAttemptBankSnapshot = currentAttemptBankSnapshot; }

    public String getEvidencePublicId() { return evidencePublicId; }
    public void setEvidencePublicId(String evidencePublicId) { this.evidencePublicId = evidencePublicId; }

    public String getEvidenceUrl() { return evidenceUrl; }
    public void setEvidenceUrl(String evidenceUrl) { this.evidenceUrl = evidenceUrl; }

    public Instant getEvidenceRegisteredAt() { return evidenceRegisteredAt; }
    public void setEvidenceRegisteredAt(Instant evidenceRegisteredAt) { this.evidenceRegisteredAt = evidenceRegisteredAt; }

    public Long getEvidenceRegisteredBy() { return evidenceRegisteredBy; }
    public void setEvidenceRegisteredBy(Long evidenceRegisteredBy) { this.evidenceRegisteredBy = evidenceRegisteredBy; }

    public Instant getConfirmedAt() { return confirmedAt; }
    public void setConfirmedAt(Instant confirmedAt) { this.confirmedAt = confirmedAt; }

    public Long getConfirmedBy() { return confirmedBy; }
    public void setConfirmedBy(Long confirmedBy) { this.confirmedBy = confirmedBy; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    @jakarta.persistence.Column(name = "confirmation_requested_at")
    private Instant confirmationRequestedAt;
    @jakarta.persistence.Column(name = "confirmation_requested_by")
    private Long confirmationRequestedBy;
    @jakarta.persistence.Column(name = "confirmation_requested_role")
    private String confirmationRequestedRole;

    public Instant getConfirmationRequestedAt() { return confirmationRequestedAt; }
    public void setConfirmationRequestedAt(Instant value) { confirmationRequestedAt = value; }
    public Long getConfirmationRequestedBy() { return confirmationRequestedBy; }
    public void setConfirmationRequestedBy(Long value) { confirmationRequestedBy = value; }
    public String getConfirmationRequestedRole() { return confirmationRequestedRole; }
    public void setConfirmationRequestedRole(String value) { confirmationRequestedRole = value; }

    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
