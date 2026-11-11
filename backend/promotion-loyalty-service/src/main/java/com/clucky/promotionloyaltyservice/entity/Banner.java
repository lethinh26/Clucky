package com.clucky.promotionloyaltyservice.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "banners", schema = "promotion_service")
public class Banner {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "title", nullable = false, length = 180)
    private String title;

    @Column(name = "image_url", nullable = false, columnDefinition = "text")
    private String imageUrl;

    @Column(name = "image_public_id", nullable = true, length = 255)
    private String imagePublicId;

    @Column(name = "link_url", nullable = true, columnDefinition = "text")
    private String linkUrl;

    @Column(name = "position", nullable = true, length = 50)
    private String position = "HERO_HOME";

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    @Column(name = "start_at", nullable = true)
    private Instant startAt;

    @Column(name = "end_at", nullable = true)
    private Instant endAt;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (isActive == null) isActive = true;
        if (displayOrder == null) displayOrder = 0;
        if (position == null || position.isBlank()) position = "HERO_HOME";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getImagePublicId() { return imagePublicId; }
    public void setImagePublicId(String imagePublicId) { this.imagePublicId = imagePublicId; }

    public String getLinkUrl() { return linkUrl; }
    public void setLinkUrl(String linkUrl) { this.linkUrl = linkUrl; }

    public String getPosition() { return position; }
    public void setPosition(String position) { this.position = position; }

    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }

    public Instant getStartAt() { return startAt; }
    public void setStartAt(Instant startAt) { this.startAt = startAt; }

    public Instant getEndAt() { return endAt; }
    public void setEndAt(Instant endAt) { this.endAt = endAt; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public long getVersion() { return version; }
    public void setVersion(long version) { this.version = version; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
