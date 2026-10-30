package com.clucky.catalogstoreservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "product_options")
public class ProductOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "group_name", nullable = false, length = 80)
    private String groupName;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "extra_price", nullable = false, precision = 12, scale = 0)
    private BigDecimal extraPrice = BigDecimal.ZERO;

    public ProductOption() {}

    public ProductOption(Long id, Product product, String groupName, String name, BigDecimal extraPrice) {
        this.id = id;
        this.product = product;
        this.groupName = groupName;
        this.name = name;
        this.extraPrice = extraPrice != null ? extraPrice : BigDecimal.ZERO;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }

    public String getGroupName() { return groupName; }
    public void setGroupName(String groupName) { this.groupName = groupName; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BigDecimal getExtraPrice() { return extraPrice; }
    public void setExtraPrice(BigDecimal extraPrice) { this.extraPrice = extraPrice; }
}
