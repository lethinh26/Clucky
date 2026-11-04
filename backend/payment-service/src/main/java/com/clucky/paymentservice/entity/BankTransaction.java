package com.clucky.paymentservice.entity;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "bank_transactions", schema = "payment_service")
public class BankTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "bank_tx_id", nullable = false, length = 160, unique = true)
    private String bankTxId;

    @Column(name = "bank_account", nullable = true, length = 80)
    private String bankAccount;

    @Column(name = "amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal amount;

    @Column(name = "content", nullable = true, columnDefinition = "text")
    private String content;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;

    @Column(name = "matched_order_code", nullable = true, length = 40)
    private String matchedOrderCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_payload", nullable = true, columnDefinition = "jsonb")
    private JsonNode rawPayload;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBankTxId() { return bankTxId; }
    public void setBankTxId(String bankTxId) { this.bankTxId = bankTxId; }

    public String getBankAccount() { return bankAccount; }
    public void setBankAccount(String bankAccount) { this.bankAccount = bankAccount; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Instant getReceivedAt() { return receivedAt; }
    public void setReceivedAt(Instant receivedAt) { this.receivedAt = receivedAt; }

    public String getMatchedOrderCode() { return matchedOrderCode; }
    public void setMatchedOrderCode(String matchedOrderCode) { this.matchedOrderCode = matchedOrderCode; }

    public JsonNode getRawPayload() { return rawPayload; }
    public void setRawPayload(JsonNode rawPayload) { this.rawPayload = rawPayload; }
}
