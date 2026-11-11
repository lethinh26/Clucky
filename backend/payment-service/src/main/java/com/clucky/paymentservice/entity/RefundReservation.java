package com.clucky.paymentservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "refund_reservations", schema = "payment_service")
public class RefundReservation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "refund_request_id", nullable = false, unique = true)
    private Long refundRequestId;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "order_code", nullable = false, length = 40)
    private String orderCode;

    @Column(name = "amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal amount;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "HELD"; // 'HELD', 'CONFIRMED', 'RELEASED'

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "confirmed_at", nullable = true)
    private Instant confirmedAt;

    @Column(name = "released_at", nullable = true)
    private Instant releasedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getRefundRequestId() { return refundRequestId; }
    public void setRefundRequestId(Long refundRequestId) { this.refundRequestId = refundRequestId; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public String getOrderCode() { return orderCode; }
    public void setOrderCode(String orderCode) { this.orderCode = orderCode; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getConfirmedAt() { return confirmedAt; }
    public void setConfirmedAt(Instant confirmedAt) { this.confirmedAt = confirmedAt; }

    public Instant getReleasedAt() { return releasedAt; }
    public void setReleasedAt(Instant releasedAt) { this.releasedAt = releasedAt; }
}

