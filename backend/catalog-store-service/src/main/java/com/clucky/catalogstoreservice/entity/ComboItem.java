package com.clucky.catalogstoreservice.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "combo_items", schema = "catalog_service")
public class ComboItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "combo_id", nullable = false)
    private Long comboId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "quantity", nullable = false)
    private Integer quantity = 1;

    @Column(name = "option_id", nullable = true)
    private Long optionId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getComboId() { return comboId; }
    public void setComboId(Long comboId) { this.comboId = comboId; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public Long getOptionId() { return optionId; }
    public void setOptionId(Long optionId) { this.optionId = optionId; }
}
