package com.clucky.catalogstoreservice.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "low_stock_episodes", schema = "catalog_service")
public class LowStockEpisode {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "episode_id", nullable = false, length = 64, unique = true)
    private String episodeId;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "OPEN"; // 'OPEN', 'CLOSED'

    @Column(name = "trigger_quantity", nullable = false)
    private Integer triggerQuantity;

    @Column(name = "threshold", nullable = false)
    private Integer threshold;

    @Column(name = "opened_at", nullable = false)
    private Instant openedAt = Instant.now();

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "closed_by_quantity")
    private Integer closedByQuantity;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEpisodeId() { return episodeId; }
    public void setEpisodeId(String episodeId) { this.episodeId = episodeId; }

    public Long getStoreId() { return storeId; }
    public void setStoreId(Long storeId) { this.storeId = storeId; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getTriggerQuantity() { return triggerQuantity; }
    public void setTriggerQuantity(Integer triggerQuantity) { this.triggerQuantity = triggerQuantity; }

    public Integer getThreshold() { return threshold; }
    public void setThreshold(Integer threshold) { this.threshold = threshold; }

    public Instant getOpenedAt() { return openedAt; }
    public void setOpenedAt(Instant openedAt) { this.openedAt = openedAt; }

    public Instant getClosedAt() { return closedAt; }
    public void setClosedAt(Instant closedAt) { this.closedAt = closedAt; }

    public Integer getClosedByQuantity() { return closedByQuantity; }
    public void setClosedByQuantity(Integer closedByQuantity) { this.closedByQuantity = closedByQuantity; }
}

