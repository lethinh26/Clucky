package com.clucky.catalogstoreservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "combos", schema = "catalog_service")
public class Combo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "name", nullable = false, length = 180)
    private String name;

    @Column(name = "description", nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "combo_price", nullable = false, precision = 12, scale = 0)
    private BigDecimal comboPrice;

    @Column(name = "image_url", nullable = true, columnDefinition = "text")
    private String imageUrl;

    @Column(name = "image_public_id", nullable = true, length = 255)
    private String imagePublicId;

    @Column(name = "start_at", nullable = true)
    private Instant startAt;

    @Column(name = "end_at", nullable = true)
    private Instant endAt;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getComboPrice() { return comboPrice; }
    public void setComboPrice(BigDecimal comboPrice) { this.comboPrice = comboPrice; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getImagePublicId() { return imagePublicId; }
    public void setImagePublicId(String imagePublicId) { this.imagePublicId = imagePublicId; }

    public Instant getStartAt() { return startAt; }
    public void setStartAt(Instant startAt) { this.startAt = startAt; }

    public Instant getEndAt() { return endAt; }
    public void setEndAt(Instant endAt) { this.endAt = endAt; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}
