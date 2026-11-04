package com.clucky.catalogstoreservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "store_products", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"store_id", "product_id"})
})
public class StoreProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "store_price", precision = 12, scale = 0)
    private BigDecimal storePrice;

    @Column(name = "is_available", nullable = false)
    private Boolean isAvailable = true;

    @Column(name = "is_sold_out", nullable = false)
    private Boolean isSoldOut = false;

    public StoreProduct() {}

    public StoreProduct(Long id, Store store, Product product, BigDecimal storePrice, Boolean isAvailable, Boolean isSoldOut) {
        this.id = id;
        this.store = store;
        this.product = product;
        this.storePrice = storePrice;
        this.isAvailable = isAvailable != null ? isAvailable : true;
        this.isSoldOut = isSoldOut != null ? isSoldOut : false;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Store getStore() { return store; }
    public void setStore(Store store) { this.store = store; }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }

    public BigDecimal getStorePrice() { return storePrice; }
    public void setStorePrice(BigDecimal storePrice) { this.storePrice = storePrice; }

    public Boolean getIsAvailable() { return isAvailable; }
    public void setIsAvailable(Boolean isAvailable) { this.isAvailable = isAvailable; }

    public Boolean getIsSoldOut() { return isSoldOut; }
    public void setIsSoldOut(Boolean isSoldOut) { this.isSoldOut = isSoldOut; }
}
