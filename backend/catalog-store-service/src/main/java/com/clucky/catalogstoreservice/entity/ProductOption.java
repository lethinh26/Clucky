package com.clucky.catalogstoreservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "product_options", schema = "catalog_service")
public class ProductOption {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "group_name", nullable = false, length = 80)
    private String groupName;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "extra_price", nullable = false, precision = 12, scale = 0)
    private BigDecimal extraPrice = new BigDecimal("0");

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getGroupName() { return groupName; }
    public void setGroupName(String groupName) { this.groupName = groupName; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BigDecimal getExtraPrice() { return extraPrice; }
    public void setExtraPrice(BigDecimal extraPrice) { this.extraPrice = extraPrice; }
}
