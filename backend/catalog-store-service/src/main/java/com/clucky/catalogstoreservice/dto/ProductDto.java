package com.clucky.catalogstoreservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

public class ProductDto {

    public static class OptionChoiceDto {
        private String id;
        private String name;
        private BigDecimal priceAdjustment = BigDecimal.ZERO;

        public OptionChoiceDto() {}

        public OptionChoiceDto(String id, String name, BigDecimal priceAdjustment) {
            this.id = id;
            this.name = name;
            this.priceAdjustment = priceAdjustment != null ? priceAdjustment : BigDecimal.ZERO;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public BigDecimal getPriceAdjustment() { return priceAdjustment; }
        public void setPriceAdjustment(BigDecimal priceAdjustment) { this.priceAdjustment = priceAdjustment; }
    }

    public static class OptionGroupDto {
        private String id;
        private String name;
        private boolean required = true;
        private List<OptionChoiceDto> choices = new ArrayList<>();

        public OptionGroupDto() {}

        public OptionGroupDto(String id, String name, boolean required, List<OptionChoiceDto> choices) {
            this.id = id;
            this.name = name;
            this.required = required;
            this.choices = choices != null ? choices : new ArrayList<>();
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public boolean isRequired() { return required; }
        public void setRequired(boolean required) { this.required = required; }

        public List<OptionChoiceDto> getChoices() { return choices; }
        public void setChoices(List<OptionChoiceDto> choices) { this.choices = choices; }
    }

    public static class ToppingDto {
        private String id;
        private String name;
        private BigDecimal price = BigDecimal.ZERO;

        public ToppingDto() {}

        public ToppingDto(String id, String name, BigDecimal price) {
            this.id = id;
            this.name = name;
            this.price = price != null ? price : BigDecimal.ZERO;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public BigDecimal getPrice() { return price; }
        public void setPrice(BigDecimal price) { this.price = price; }
    }

    public static class Response {
        private Long id;
        private String slug;
        private String name;
        private Long categoryId;
        private String categoryName;
        private String category;
        private String description;
        private BigDecimal basePrice;
        private BigDecimal price;
        private String imageUrl;
        private String image;
        private String imagePublicId;
        private String alt;
        private Integer kcal;
        private Integer spicyLevel;
        private Boolean isActive;
        private Boolean isAvailable = true;
        private Boolean isSoldOut = false;
        private Boolean isBestSeller = false;
        private Double rating = 4.8;
        private Integer reviewCount = 120;
        private List<OptionGroupDto> options = new ArrayList<>();
        private List<ToppingDto> toppings = new ArrayList<>();

        public Response() {}

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getSlug() { return slug; }
        public void setSlug(String slug) { this.slug = slug; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public Long getCategoryId() { return categoryId; }
        public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

        public String getCategoryName() { return categoryName; }
        public void setCategoryName(String categoryName) {
            this.categoryName = categoryName;
            this.category = categoryName;
        }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public BigDecimal getBasePrice() { return basePrice; }
        public void setBasePrice(BigDecimal basePrice) {
            this.basePrice = basePrice;
            this.price = basePrice;
        }

        public BigDecimal getPrice() { return price; }
        public void setPrice(BigDecimal price) { this.price = price; }

        public String getImageUrl() { return imageUrl; }
        public void setImageUrl(String imageUrl) {
            this.imageUrl = imageUrl;
            this.image = imageUrl;
        }

        public String getImage() { return image; }
        public void setImage(String image) { this.image = image; }

        public String getImagePublicId() { return imagePublicId; }
        public void setImagePublicId(String imagePublicId) { this.imagePublicId = imagePublicId; }

        public String getAlt() { return alt; }
        public void setAlt(String alt) { this.alt = alt; }

        public Integer getKcal() { return kcal; }
        public void setKcal(Integer kcal) { this.kcal = kcal; }

        public Integer getSpicyLevel() { return spicyLevel; }
        public void setSpicyLevel(Integer spicyLevel) { this.spicyLevel = spicyLevel; }

        public Boolean getIsActive() { return isActive; }
        public void setIsActive(Boolean isActive) { this.isActive = isActive; }

        public Boolean getIsAvailable() { return isAvailable; }
        public void setIsAvailable(Boolean isAvailable) { this.isAvailable = isAvailable; }

        public Boolean getIsSoldOut() { return isSoldOut; }
        public void setIsSoldOut(Boolean isSoldOut) { this.isSoldOut = isSoldOut; }

        public Boolean getIsBestSeller() { return isBestSeller; }
        public void setIsBestSeller(Boolean isBestSeller) { this.isBestSeller = isBestSeller; }

        public Double getRating() { return rating; }
        public void setRating(Double rating) { this.rating = rating; }

        public Integer getReviewCount() { return reviewCount; }
        public void setReviewCount(Integer reviewCount) { this.reviewCount = reviewCount; }

        public List<OptionGroupDto> getOptions() { return options; }
        public void setOptions(List<OptionGroupDto> options) { this.options = options; }

        public List<ToppingDto> getToppings() { return toppings; }
        public void setToppings(List<ToppingDto> toppings) { this.toppings = toppings; }
    }

    public static class Request {
        @NotBlank(message = "Tên món không được để trống")
        private String name;

        @NotNull(message = "Danh mục không được để trống")
        private Long categoryId;

        @NotBlank(message = "Mô tả không được để trống")
        private String description;

        @NotNull(message = "Giá gốc không được để trống")
        private BigDecimal basePrice;

        private String imageUrl;
        private String imagePublicId;
        private Integer kcal = 500;
        private Integer spicyLevel = 0;
        private Boolean isActive = true;

        private List<OptionGroupDto> options = new ArrayList<>();
        private List<ToppingDto> toppings = new ArrayList<>();

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public Long getCategoryId() { return categoryId; }
        public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

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

        public List<OptionGroupDto> getOptions() { return options; }
        public void setOptions(List<OptionGroupDto> options) { this.options = options; }

        public List<ToppingDto> getToppings() { return toppings; }
        public void setToppings(List<ToppingDto> toppings) { this.toppings = toppings; }
    }

    private static final Pattern NONLATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s]");

    public static String toSlug(String input) {
        if (input == null) return "";
        String nowhitespace = WHITESPACE.matcher(input).replaceAll("-");
        String normalized = Normalizer.normalize(nowhitespace, Normalizer.Form.NFD);
        String slug = NONLATIN.matcher(normalized).replaceAll("");
        return slug.toLowerCase(Locale.ENGLISH).replaceAll("-+", "-").replaceAll("^-|-$", "");
    }
}
