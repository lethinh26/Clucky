package com.clucky.promotionloyaltyservice.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "member_points", schema = "promotion_service")
public class MemberPoints {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "customer_id", nullable = false, unique = true)
    private Long customerId;

    @Column(name = "total_points", nullable = false)
    private Integer totalPoints = 0;

    @Column(name = "tier", nullable = false, length = 20)
    private String tier = "MEMBER";

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public Integer getTotalPoints() { return totalPoints; }
    public void setTotalPoints(Integer totalPoints) { this.totalPoints = totalPoints; }

    public String getTier() { return tier; }
    public void setTier(String tier) { this.tier = tier; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    @PreUpdate
    protected void touch() { updatedAt = Instant.now(); }
}
