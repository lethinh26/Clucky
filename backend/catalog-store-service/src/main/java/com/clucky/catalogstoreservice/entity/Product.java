package com.clucky.catalogstoreservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(nullable = false, length = 180)
    private String name;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "base_price", nullable = false, precision = 12, scale = 0)
    private BigDecimal basePrice;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "image_public_id", length = 255)
    private String imagePublicId;

    @Column(name = "kcal")
    private Integer kcal;

    @Column(name = "spicy_level")
    private Integer spicyLevel = 0;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductOption> options = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductTopping> toppings = new ArrayList<>();

    public Product() {}

    public Product(Long id, Category category, String name, String description, BigDecimal basePrice, String imageUrl, String imagePublicId, Integer kcal, Integer spicyLevel, Boolean isActive) {
        this.id = id;
        this.category = category;
        this.name = name;
        this.description = description;
        this.basePrice = basePrice;
        this.imageUrl = imageUrl;
        this.imagePublicId = imagePublicId;
        this.kcal = kcal;
        this.spicyLevel = spicyLevel != null ? spicyLevel : 0;
        this.isActive = isActive != null ? isActive : true;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getBasePrice() { return basePrice; }
    public void setBasePrice(BigDecimal basePrice) { this.basePrice = basePrice; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getImagePublicId() { return imagePublicId; }
    public void setImagePublicId(String imagePublicId) { this.imagePublicId = imagePublicId; }

    public Integer getKcal() { return kcal; }
    public void setKcal(Integer kcal) { this.kcal = kcal; }

    public Integer getSpicyLevel() { return spicyLevel; }
    public void setSpicyLevel(Integer spicyLevel) { this.spicyLevel = spicyLevel; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public List<ProductOption> getOptions() { return options; }
    public void setOptions(List<ProductOption> options) { this.options = options; }

    public List<ProductTopping> getToppings() { return toppings; }
    public void setToppings(List<ProductTopping> toppings) { this.toppings = toppings; }
}
