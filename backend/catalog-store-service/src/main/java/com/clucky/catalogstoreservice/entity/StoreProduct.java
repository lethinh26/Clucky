package com.clucky.catalogstoreservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "store_products", schema = "catalog_service", uniqueConstraints = {@UniqueConstraint(columnNames = {"store_id", "product_id"})})
public class StoreProduct {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "store_price", nullable = true, precision = 12, scale = 0)
    private BigDecimal storePrice;

    @Column(name = "is_available", nullable = false)
    private Boolean isAvailable = true;

    @Column(name = "is_sold_out", nullable = false)
    private Boolean isSoldOut = false;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getStoreId() { return storeId; }
    public void setStoreId(Long storeId) { this.storeId = storeId; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public BigDecimal getStorePrice() { return storePrice; }
    public void setStorePrice(BigDecimal storePrice) { this.storePrice = storePrice; }

    public Boolean getIsAvailable() { return isAvailable; }
    public void setIsAvailable(Boolean isAvailable) { this.isAvailable = isAvailable; }

    public Boolean getIsSoldOut() { return isSoldOut; }
    public void setIsSoldOut(Boolean isSoldOut) { this.isSoldOut = isSoldOut; }
}
