package com.clucky.catalogstoreservice.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "combo_items")
public class ComboItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "combo_id", nullable = false)
    private Combo combo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private Integer quantity = 1;

    @Column(name = "option_id")
    private Long optionId;

    public ComboItem() {}

    public ComboItem(Long id, Combo combo, Product product, Integer quantity, Long optionId) {
        this.id = id;
        this.combo = combo;
        this.product = product;
        this.quantity = quantity != null ? quantity : 1;
        this.optionId = optionId;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Combo getCombo() { return combo; }
    public void setCombo(Combo combo) { this.combo = combo; }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public Long getOptionId() { return optionId; }
    public void setOptionId(Long optionId) { this.optionId = optionId; }
}
